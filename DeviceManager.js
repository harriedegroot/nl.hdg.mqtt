"use strict";

const normalize = require('./normalize');
const Log = require('./Log');
const EventHandler = require('./EventHandler');

class DeviceManager {

    constructor({ api, settings }) {
        this.api = api;

        this.onAdd = new EventHandler('Device.add');
        this.onRemove = new EventHandler('Device.remove');
        this.onUpdate = new EventHandler('Device.update');

        this.setEnabledDevices((settings || {}).devices);
    }

    getDeviceId(device) {

        if (!device) return undefined;
        if (device) {
            if (typeof device === 'string') {
                if (this.deviceIds && this.deviceIds.has(device))
                    return device;
                if (this.deviceNames && this.deviceNames.has(device))
                    return this.deviceNames.get(device);
                if (this.deviceTopics && this.deviceTopics.has(normalize(device)))
                    return this.deviceTopics.get(normalize(device));
            } else if (typeof device === 'object') {
                if (device.id)
                    return device.id;
                if (device.name) {
                    if (this.deviceNames && this.deviceNames.has(device.name))
                        return this.deviceNames.get(device.name);
                    if (this.deviceTopics && this.deviceTopics.has(normalize(device.name)))
                        return this.deviceTopics.get(normalize(device.name));
                }
            }
        }

        Log.error("Device id not found");
        Log.debug(device);

        return undefined;
    }

    getDeviceName(device) {
        // from device info
        if (typeof device === 'object' && device.name) {
            return normalize(device.name);
        }

        // from mapping
        if (!this.deviceIds) return undefined;
        const id = this.getDeviceId(device);
        return this.deviceIds.get(id);
    }

    getDeviceTopic(device) {
        if (!this.deviceTopicIds) return undefined;
        const id = this.getDeviceId(device);
        return this.deviceTopicIds.get(id);
    }

    async getDeviceById(deviceId) {
        if (deviceId) {
            const device = await this.api.devices.getDevice({ id: deviceId });
            if (!device) {
                Log.error("Device not found: " + deviceId);
            }
            return device;
        }
        Log.error("No device id provided");
        return undefined;
    }

    // TODO: optimize
    async getDeviceByName(device) {
        const id = this.getDeviceId(device);
        return await this.getDeviceById(id);
    }

    // TODO: optimize
    async getDeviceByTopic(device) {
        const id = this.getDeviceId(device);
        return await this.getDeviceById(id);
    }

    async getDevice(device) {
        const id = this.getDeviceId(device);
        return await this.getDeviceById(id);
    }

    isRegistered(device) {
        if (!this.deviceIds) return false;
        const id = this.getDeviceId(device);
        return id && this.deviceIds.has(id);
    }

    async register() {

        // Subscribe to realtime events and set all devices global
        this.api.devices.on('device.create', this._addDevice.bind(this));
        this.api.devices.on('device.delete', this._removeDevice.bind(this));
        this.api.devices.on('device.update', this._updateDevice.bind(this));

        this.api.zones.on('zones.create', this._addZone.bind(this));
        this.api.zones.on('zones.delete', this._removeZone.bind(this));
        this.api.zones.on('zones.update', this._updateZone.bind(this));

        this.devices = await this.api.devices.getDevices();
        this.zones = await this.api.zones.getZones();

        if (this.devices) {
            for (let key in this.devices) {
                if (Array.isArray(this.devices) || this.devices.hasOwnProperty(key)) {

                    const device = this.devices[key];

                    // inject zone
                    if (this.zones && device.zone) {
                        device.zone = this.zones[device.zone];
                    }

                    // register
                    await this.registerDevice(device);
                }
            }
        }
    }

    async unregister() { }

    async registerDevice(device) {
        if (typeof device === 'object') {

            if (!device.id) {
                Log.error("[SKIP] No device id provided");
                return;
            }

            const deviceName = (device.name || '').trim();
            if (!deviceName) {
                Log.error("[SKIP] No device name provided");
                return;
            }

            if (this.isRegistered(device)) {
                Log.debug('device already registered');
                return;
            }

            this.deviceIds = this.deviceIds || new Map();           // id => name
            this.deviceNames = this.deviceNames || new Map();       // name => id
            this.deviceTopicIds = this.deviceTopicIds || new Map(); // id => topic
            this.deviceTopics = this.deviceTopics || new Map();     // topic => id

            const deviceTopic = normalize(deviceName);
            Log.info(deviceName + ': ' + deviceTopic);

            this.deviceIds.set(device.id, deviceName);
            this.deviceNames.set(deviceName, device.id);

            if (deviceTopic) {
                this.deviceTopicIds.set(device.id, deviceTopic);
                this.deviceTopics.set(deviceTopic, device.id);
            }
        }
    }

    async _addDevice(device) {
        Log.info('New device found!');
        
        if (device && device.id) {
            this.devices = this.devices || {};
            this.devices[device.id] = device;
            
            await this.registerDevice(device);
            await this.onAdd.emit(device);
        }
    }

    async _removeDevice(id) {

        const deviceName = this.getDeviceName(id);
        const deviceTopic = this.getDeviceTopic(id);

        if (this.deviceIds) this.deviceIds.delete(id);
        if (this.deviceTopicIds) this.deviceIds.delete(id);
        if (deviceName && this.deviceNames) this.deviceNames.delete(deviceName);
        if (deviceTopic && this.deviceTopics) this.deviceTopics.delete(deviceTopic);
        if (this.devices) delete this.devices[id];
        
        await this.onRemove.emit(id);
    }

    async _updateDevice(id) {
        await this.onUpdate.emit(id);
    }

    async _addZone(id) {
        Log.info('New zone found!');
        if (id) {
            this.zones = this.zones || {};
            const zone = await this.api.zones.getZone({ id });
            if (zone) {
                this.zones[id] = zone;
            }
        }
    }

    async _removeZone(id) {
        if (id && this.zones && this.zones.hasOwnProperty(id)) {
            delete this.zones[id];
        }
    }

    async _updateZone(id) {
        await this._addZone(id);
    }

    async getCapabilities(device) {
        device = await this.getDevice(device);
        return device ? device.capabilitiesObj || device.capabilities : undefined; // 1.5.13 vs 2.0
    }

    async getCapability(device, capabilityId) {
        const capabilities = this.getCapabilities(device);
        return capabilities ? capabilities[capabilityId] : undefined;
    }

    computeChanges(devices) {
        let changes = {
            enabled: [],
            disabled: [],
            untouched: []
        };
        if (devices) {
            for (let id in devices) {
                if (devices.hasOwnProperty(id)) {
                    const enabled = devices[id] !== false;
                    if (enabled !== this.isDeviceEnabled(id)) {
                        if (enabled) {
                            if (this.devices) {
                                Log.debug("Enabled device: " + (this.devices[id] || {}).name);
                            }
                            changes.enabled.push(id);
                        } else {
                            if (this.devices) {
                                Log.debug("Disabled device: " + (this.devices[id] || {}).name);
                            }
                            changes.disabled.push(id);
                        }
                    } else {
                        changes.untouched.push(id);
                    }
                }
            }
        }
        return changes;
    }

    setEnabledDevices(devices) {
        this._enabledDevices = devices;
    }

    isDeviceEnabled(device) {
        const enabledDevices = this._enabledDevices;
        if (!enabledDevices) return true;
        const deviceId = typeof device === 'object' ? device.id : device;
        if (!deviceId) return false;
        return enabledDevices.hasOwnProperty(deviceId) ? enabledDevices[deviceId] : true;
    }
}

module.exports = DeviceManager;
