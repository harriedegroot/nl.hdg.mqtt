"use strict";

const Topic = require('./topic.js');
const Log = require('./log.js');

class DeviceManager {

    async emit(listeners, value) {
        for (var i = 0; i < listeners.length; i++) {
            const callback = listeners[i];
            if (typeof callback === 'function') {
                try {
                    await callback(value);
                } catch (e) {
                    Log.error(e);
                }
            }
        }
    }

    constructor(api) {
        this.api = api;

        this.addListeners = [];
        this.removeListeners = [];
        this.updateListeners = [];
    }

    addAddedListener(callback) {
        this.addListeners.push(callback);
    }
    addRemovedListener(callback) {
        this.removeListeners.push(callback);
    }
    addUpdateListener(callback) {
        this.updateListeners.push(callback);
    }

    getDeviceId(device) {

        if (!device) return undefined;
        if (device) {
            if (typeof device === 'string') {
                if (this.deviceIds && this.deviceIds.has(device))
                    return device;
                if (this.deviceNames && this.deviceNames.has(device))
                    return this.deviceNames.get(device);
                if (this.deviceTopics && this.deviceTopics.has(device))
                    return this.deviceTopics.get(device);
            } else if (typeof device === 'object') {
                if (device.id)
                    return device.id;
                if (device.name) {
                    if (this.deviceNames && this.deviceNames.has(device.name))
                        return this.deviceNames.get(device.name);
                    if (this.deviceTopics && this.deviceTopics.has(device.name))
                        return this.deviceTopics.get(device.name);
                }
            }
        }

        Log.error("Device id not found: " + JSON.stringify(device || '', null, 2));

        return undefined;
    }

    getDeviceName(device) {
        // from device info
        if (typeof device === 'object' && device.name) {
            return Topic.normalize(device.name);
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
        this.api.devices.on('device.create', async id => await this.addDevice(id));
        this.api.devices.on('device.delete', async id => await this.removeDevice(id));
        this.api.devices.on('device.update', async id => await this.updateDevice(id));

        const devices = await this.api.devices.getDevices();
        if (devices) {
            for (let key in devices) {
                if (Array.isArray(devices) || devices.hasOwnProperty(key)) {
                    await this.registerDevice(devices[key]);
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

            const deviceTopic = Topic.normalize(deviceName);
            Log.info(deviceName + ': ' + deviceTopic);

            this.deviceIds.set(device.id, deviceName);
            this.deviceNames.set(deviceName, device.id);

            if (deviceTopic) {
                this.deviceTopicIds.set(deviceTopic, device.id);
                this.deviceTopics.set(device.id, deviceTopic);
            }

            await this.emit(this.addListeners, device);
        }
    }

    async addDevice(id) {
        Log.info('New device found!');
        
        const device = await this.getDeviceById(id);
        if (device) {
            await this.registerDevice(device);
        } else {
            Log.warning('Device not found: ' + id);
        }
    }

    async removeDevice(id) {

        const deviceName = this.getDeviceName(id);
        const deviceTopic = this.getDeviceTopic(id);

        if (this.deviceIds) this.deviceIds.delete(id);
        if (this.deviceTopicIds) this.deviceIds.delete(id);
        if (deviceName && this.deviceNames) this.deviceNames.delete(deviceName);
        if (deviceTopic && this.deviceTopics) this.deviceTopics.delete(deviceTopic);

        await this.emit(this.removeListeners, id);
    }

    async updateDevice(id) {
        await this.emit(this.updateListeners, id);
    }

    async getCapabillities(device) {
        device = await this.getDevice(device);
        return device ? device.capabilitiesObj || device.capabilities : undefined; // 1.5.13 vs 2.0
    }

    async getCapability(device, capabilityId) {
        const capabillities = this.getCapabillities(device);
        return capabillities ? capabillities[capabilityId] : undefined;
    }
}

module.exports = DeviceManager;
