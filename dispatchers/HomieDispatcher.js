"use strict";

const _ = require('lodash');
const Log = require('../Log.js');
const Topic = require('../mqtt/Topic.js');
const HomieDevice = require('../homie/homieDevice');
const HomieMQTTClient = require('../homie/HomieMQTTClient');
const Color = require('../Color.js');

const normalize = Topic.normalize;

const DEFAULT_TOPIC_ROOT = 'homie';
const DEFAULT_DEVICE_NAME = 'Homey';
const DEFAULT_DEVICE_ID = 'homey';
const DEFAULT_ZONE = "home";
const DEFAULT_CLASS = "other";
const DEFAULT_PROPERTY_SCALING = "default";
const DEFAULT_COLOR_FORMAT = "hasv";

/**
 * Homey Convention 3.0.1
 * Based on modified version of: https://github.com/marcus-garvey/homie-device
 * @see ~/homie/README
 * */
class HomieDispatcher {

    constructor({ api, mqttClient, deviceManager, system, settings }) {
        this.api = api;
        this.mqttClient = new HomieMQTTClient(mqttClient);
        this.deviceManager = deviceManager;
        this.system = system;
        this.updateSettings(settings);
        
        this._nodes = new Map();
        this._capabilityInstances = new Map();

        this._initHomieDevice();
        this._launch();
    }
    
    _initHomieDevice() {
        if (this.homieDevice) {
            this._destroyHomieDevice();
        }

        Log.info("Create HomieDevice");
        this.homieDevice = new HomieDevice(this.deviceConfig);
        this.homieDevice.setFirmware("Homey", this.system.version);

        this._messageCallback = function (topic, value) {
            Log.info('message: ' + topic + ' with value: ' + value);
        };
        this._broadcastCallback = function (topic, value) {
            Log.info('broadcast: ' + topic + ' with value: ' + value);
        };
        this.homieDevice.on('message', this._messageCallback);
        this.homieDevice.on('broadcast', this._broadcastCallback);

        this.registerDevices();
        this.homieDevice.setup(true);
    }

    _destroyHomieDevice() {
        this.unregisterDevices();
        if (this.homieDevice) {
            Log.info("Destroy HomieDevice");
            this.homieDevice.removeListener('message', this._messageCallback);
            this.homieDevice.removeListener('broadcast', this._broadcastCallback);
            this.homieDevice.onDisconnect();
            this.homieDevice.end();
            delete this.homieDevice;
        }
    }

    _launch() {
        this.mqttClient.client.on('register', () => this.dispatchState());
        if (this.mqttClient.isRegistered()) {
            this.dispatchState();
        }
    }

    get deviceConfig() {
        return {
            name: this.system.name || DEFAULT_DEVICE_NAME,
            device_id: this.settings.deviceId || DEFAULT_DEVICE_ID,
            mqtt: {
                host: "localhost",
                port: 1883,
                base_topic: this.settings.topicRoot ? this.settings.topicRoot + '/' : '',
                auth: false,
                username: null,
                password: null
            },
            mqttClient: this.mqttClient,
            settings: {
            },
            ip: null,
            mac: null
        };
    }

    updateSettings(settings, deviceChanges) {
        settings = settings || {};
        const current = this.settings ? JSON.stringify(this.settings) : null;
        this.settings = this.settings || {};

        this.settings.topicRoot = settings.topicRoot === undefined ? DEFAULT_TOPIC_ROOT : settings.topicRoot;
        this.settings.deviceId = normalize(settings.deviceId || this.system.name || DEFAULT_DEVICE_ID);
        this.settings.topicIncludeClass = settings.topicIncludeClass === true;
        this.settings.topicIncludeZone = settings.topicIncludeZone === true;
        this.settings.propertyScaling = settings.propertyScaling || DEFAULT_PROPERTY_SCALING;
        this.settings.colorFormat = settings.colorFormat || DEFAULT_COLOR_FORMAT;

        // Breaking changes? => Start a new HomieDevice (& destroy current)
        if (current && current !== JSON.stringify(this.settings)) {
            Log.info("Recreate HomieDevice with new settings");
            this._initHomieDevice(); // reboot HomieDevice with new settings
        } else if (deviceChanges) { // update changed devices only
            Log.info("Update settings for changed devices only");
            for (let deviceId of deviceChanges.enabled) {
                if (typeof deviceId === 'string') {
                    this.enableDevice(deviceId);
                }
            }
            for (let deviceId of deviceChanges.disabled) {
                if (typeof deviceId === 'string') {
                    this.disableDevice(deviceId);
                }
            }
        }
    }

    // Get all devices and add them
    registerDevices() {
        Log.info("register devices");
        const devices = this.deviceManager.devices;
        if (devices) {
            for (let key in devices) {
                if (devices.hasOwnProperty(key)) {
                    this._registerDevice(devices[key]);
                }
            }
        }
    }
    // Remove all device registrations
    unregisterDevices() {
        Log.info("HomieDispatcher.unregisterDevices");
        for (var [id, node] of this._nodes.entries()) {
            try {
                this.disableDevice(id);
            } catch (e) {
                Log.error(e);
            }
        }
        this._nodes.clear();
    }

    getNodeName(device) {
        let path = [normalize(device.name)];
        if (this.settings.topicIncludeZone) {
            path.unshift(device.zone && device.zone.name ? normalize(device.zone.name) : DEFAULT_ZONE);
        }
        if (this.settings.topicIncludeClass) {
            path.unshift(normalize(device.class) || DEFAULT_CLASS);
        }
        return path.join('/');
    }
    
    _registerDevice(device) {
        if (!device || !(device || {}).id) {
            Log.info("invalid device");
            return;
        } 

        if (!this.deviceManager.isDeviceEnabled(device.id)) {
            //Log.info('[SKIP] Device disabled');
            this.disableDevice(device.id);
            return;
        }

        if (this._nodes.has(device.id)) {
            Log.info('[SKIP] Device already registered');
            return;
        }

        Log.info("register device: " + device.name);

        const name = this.getNodeName(device);
        let node = this.homieDevice.node(name, device.name, this._convertClass(device.class));
        this._nodes.set(device.id, node); // register

        const capabilities = device.capabilitiesObj;
        if (capabilities) {
            for (let key in capabilities) {
                if (capabilities.hasOwnProperty(key)) {
                    const capability = capabilities[key];
                    const id = capability.id;
                    const color = (this.settings.colorFormat !== 'values' && id === 'light_hue') ? 'color' : null;
                    const value = capability.value;
                    const capabilityTitle = color ? 'Color' : (capability.title && typeof capability.title === 'object') ? capability.title['en'] : capability.title;
                    const capabilityName = capabilityTitle || capability.desc || id;
                    const name = _.replace([device.name, capabilityName].filter(x => x).join(' - '), "_", " ");
                    const dataType = this._convertDataType(capability);

                    if (dataType) { // NOTE: undefined for filtered color formats
                        const property = node.advertise(color || normalize(id))
                            .setName(name)
                            .setUnit(this._convertUnit(capability))
                            .setDatatype(dataType)
                            .setRetained(true);

                        if (this.broadcast) {
                            property.send(color ? this._formatColor(capabilities) : this._formatValue(value)); 
                        }

                        const format = this._format(capability);
                        if (format) {
                            property.setFormat(format);
                        }

                        if (capability.setable) {
                            property.settable(async (format, value) => {
                                if (!this.deviceManager.isDeviceEnabled(device.id)) {
                                    //Log.info('[SKIP] Device disabled');
                                    return;
                                }
                                await this.setValue(device.id, id, value, dataType);
                            });
                        }

                        // NOTE: Ranges not implemented
                    }

                    // Listen to state changes
                    try {
                        const deviceCapabilityId = device.id + capability.id;
                        this._destroyCapabilityInstance(deviceCapabilityId);
                        const capabilityInstance = device.makeCapabilityInstance(key, value =>
                            this._handleStateChange(node, device.id, key, value)
                        );
                        Log.debug("Register CapabilityInstance: " + device.name + " - " + capability.title);
                        this._capabilityInstances.set(deviceCapabilityId, capabilityInstance);
                    } catch (e) {
                        Log.info("Error capability: " + key);
                        Log.debug(e);
                    }
                }
            }
        }
        return node;
    }

    _destroyCapabilityInstance(deviceCapabilityId) {
        const capabilityInstance = this._capabilityInstances.get(deviceCapabilityId);
        if (capabilityInstance) {
            Log.debug("Destroy CapabilityInstance: " + deviceCapabilityId);
            capabilityInstance.destroy();
            this._capabilityInstances.delete(deviceCapabilityId);
        } else {
            //Log.debug("[SKIP] No existing CapabilityInstance found to destroy");
        }
    }

    _unregisterDevice(device) {

        // stop listening for state changes
        if (device && device.capabilities) {
            for (let capabilityId of device.capabilities) {
                this._destroyCapabilityInstance(device.id + capabilityId);
            }
        }

        const node = this._nodes.get((device || {}).id);
        if (!node) {
            Log.info("[Skip] Device Node not found");
            return;
        }
        
        if (this.homieDevice) {
            this.homieDevice.remove(node);
        }
        this._nodes.delete(device.id);
    }

    enableDevice(deviceId) {
        if (this._nodes.has(deviceId))
            return;
        
        const device = this.deviceManager.devices[deviceId];
        if (device) {
            Log.info("Enable device: " + device.name);
            const node = this._registerDevice(device);
            this.homieDevice.onConnectNode(node); // dispatch node changes
        } else {
            Log.error("Failed to register device: Device not found");
        }
    }

    disableDevice(deviceId) {
        if (!this._nodes.has(deviceId))
            return;

        const device = this.deviceManager.devices[deviceId];
        if (device) {
            Log.info("Disable device: " + device.name);
            this._unregisterDevice(device);
        } else {
            Log.error("Failed to unregister device: Device not found");
        }
    }

    _convertClass(deviceClass) {
        return deviceClass || 'other';
    }

    _convertUnit(capability) {

        switch (capability.id) {
            case 'light_hue':
            case 'light_saturation':
            case 'light_temperature':
                return this.settings.colorFormat === 'values' ? capability.id : this.settings.colorFormat;
            default:
                const units = capability.units;
                return units && typeof units === 'object' ? units['en'] : units;
        }
    }

    _convertDataType(capability) {
        if (this.settings.colorFormat !== 'values') {
            switch (capability.id) {
                case 'light_hue':
                    return 'color';         // Catch 'color' type
                case 'light_saturation':
                case 'light_temperature':
                    return undefined;       // NOTE: Skip additional color value. The color dataType is already created from 'light_hue'
            }
        }
        
        let dataType = capability.type;
        switch (dataType) {
            case 'number':
                // TODO: check capability.step?
                return capability.decimals > 0 ? 'float' : 'integer';
            default:
                return dataType || 'integer';
        }
    }

    _format(capability) {
        /*
        - from:to Describes a range of values e.g. 10: 15. Valid for datatypes integer, float
        - value, value, value for enumerating all valid values.Escape, by using,,.e.g.A, B, C or ON, OFF, PAUSE. Valid for datatypes enum
        - rgb to provide colors in RGB format e.g. 255, 255, 0 for yellow. hsv to provide colors in HSV format e.g. 60, 100, 100 for yellow. Valid for datatype color
        */

        // Catch 'color' format
        if (this.settings.colorFormat !== 'values') {
            switch (capability.id) {
                case 'light_hue':
                case 'light_saturation':
                case 'light_temperature':
                    return this.settings.colorFormat;
            }
        }

        if (capability.min !== undefined && capability.max !== undefined) {
            return `${capability.min}:${capability.max}`;
        }

        if (capability.type === 'enum') {
            return _.map(capability.values, value => value.id).join(',');
        }

        return null;
    }

    async _handleStateChange(node, deviceId, capabilityId, value) {

        if (!node) {
            Log.info("[SKIP] No valid node provided");
            return;
        }

        if (!this._nodes.has(deviceId)) {
            Log.info('[SKIP] Device not registered');
            return;
        }

        if (!this.deviceManager.isDeviceEnabled(deviceId)) {
            //Log.info('[SKIP] Device disabled');
            return;
        }
        
        Log.info("Homie set value [" + capabilityId + "]: " + value);

        if (value === undefined) {
            Log.info("Homie: No value provided");
            return;
        }

        // Catch colors
        if (this.settings.colorFormat !== 'values') {
            if (capabilityId === 'light_hue') {
                capabilityId = 'color';
                let device = await this.api.devices.getDevice({ id: deviceId });
                if (device) {
                    value = this._formatColor(device.capabilitiesObj);
                    Log.info("Homie set color: " + value);
                }
            }
            if (capabilityId === 'light_saturation' || capabilityId === 'light_temperature') {
                return; // NOTE: Skip additional color value. The color dataType is already handled by 'light_hue'
            }
        }

        try {
            const property = node.setProperty(normalize(capabilityId));
            if (property) {
                property.setRetained(true);
                if (this.broadcast) {
                    property.send(this._formatValue(value));
                }
            } else {
                Log.info("No property found for capability: " + capabilityId);
            }
        } catch (e) {
            Log.error(e);
        }
    }

    async setValue(deviceId, capabilityId, value, dataType) {

        Log.info('HomieDispatcher.setValue');

        // handle colors
        if (dataType === 'color') {
            await this._setColor(deviceId, value);
        } else { // all other datatypes
            try {
                const state = {
                    deviceId: deviceId,
                    capabilityId: capabilityId,
                    value: this._parseValue(value, dataType)
                };
                Log.debug("state: " + JSON.stringify(state));
                await this.api.devices.setCapabilityValue(state);
            } catch (e) {
                Log.info("Failed to update capability value");
                Log.error(e);
            }
        }
    }

    async _setColor(deviceId, value) {
        let split = (value || '').toString().split(',').map(v => parseFloat(v.trim()));
        if (split.length === 3) {
            try {
                let color = this.settings.colorFormat === 'rgb' ? Color.RGBtoHSV(...split) : { h: split[0], s: split[1], v: split[2] };
                Log.debug("color: " + JSON.stringify(color));

                // Note: Homey values are rang 0...1
                color.h /= 360;
                color.s /= 100;
                color.v /= 100;

                await this.api.devices.setCapabilityValue({ deviceId: deviceId, capabilityId: 'light_hue', value: color.h });
                await this.api.devices.setCapabilityValue({ deviceId: deviceId, capabilityId: 'light_saturation', value: color.s });
                await this.api.devices.setCapabilityValue({ deviceId: deviceId, capabilityId: 'light_temperature', value: color.v });
            } catch (e) {
                Log.info("Homie: Failed to update color value");
                Log.error(e);
            }
        } else {
            Log.info('Invalid color value');
        }
    }

    _formatColor(capabilities) {
        // Note: Homey values are rang 0...1
        switch (this.settings.colorFormat) {
            case 'hsv':
                return [
                    capabilities['light_hue'].value * 360,
                    capabilities['light_saturation'].value * 100,
                    capabilities['light_temperature'].value * 100
                ].join(',');
            case 'rgb':
                const rgb = Color.HSVtoRGB(capabilities['light_hue'].value * 360, capabilities['light_saturation'].value * 100, capabilities['light_temperature'].value * 100);
                return [rgb.r, rgb.g, rgb.b].join(',');
        }
    }

    _formatValue(value) {
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }
        return value;
    }

    _parseValue(value, dataType) {
        switch (dataType) {
            case 'boolean':
                return value === true || value === 'true' || value === 1 || value === '1';
            case 'number':
            case 'float':
                return typeof value === 'number' ? value : typeof value === 'string' ? Number(value) || 0 : 0;
            case 'integer':
                return typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value) || 0 : 0;
            case 'string':
                return value ? value.toString() : undefined;
            case 'enum':
            case 'color':
            default:
                let numeric = Number(value);
                return isNaN(numeric) ? value : numeric;
        }
    }

    dispatchState() {
        
        if (this.homieDevice) {
            Log.info("Dispatch device state");
            this.homieDevice.onConnect();
        } else {
            Log.info("[Skip] Invalid broadcast");
            Log.info("HomieDevice initialized: " + !!this.homieDevice);
            Log.info("MQTT Client registered: " + this.mqttClient.isRegistered());
        }
    }

    destroy() {
        Log.info('Destroy HomieDispatcher');
        this._destroyHomieDevice();
    }
}

module.exports = HomieDispatcher;
