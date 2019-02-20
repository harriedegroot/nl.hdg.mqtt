"use strict";

const _ = require('lodash');
const normalize = require('../normalize');
const Log = require('../Log');
const HomieDevice = require('../homie/homieDevice');
const HomieMQTTClient = require('../homie/HomieMQTTClient');
const Color = require('../Color');

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

    get _topicRoot() {
        return this.settings && this.settings.topicRoot ? this.settings.topicRoot : '';
    }
    get _deviceId() {
        return this.settings && this.settings.deviceId ? this.settings.deviceId : DEFAULT_DEVICE_ID;
    }

    constructor({ api, mqttClient, deviceManager, system, settings, messageQueue }) {
        this.api = api;
        this._mqttClient = mqttClient;
        this.homieMQTTClient = new HomieMQTTClient(mqttClient, messageQueue);
        this.deviceManager = deviceManager;
        this.system = system;
        this.messageQueue = messageQueue;

        this.updateSettings(settings);
        
        this._nodes = new Map();
        this._capabilityInstances = new Map();
        this._deviceTopics = new Map();
    }

    register() {
        if (this._registered) return;
        this._registered = true;

        // Wait for the client to be connected, otherwise messages wont be send
        if (this._mqttClient.isRegistered()) {
            this._initHomieDevice();
        } else {
            this._mqttClient.onRegistered.subscribe(() => this._initHomieDevice(), true);
        }
    }
    
    _initHomieDevice() {
        if (this.homieDevice) {
            this._destroyHomieDevice();
        }

        Log.info("Create HomieDevice");
        this.homieDevice = new HomieDevice(this.deviceConfig);
        this.homieDevice.setFirmware(this.system.homeyModelName || 'Homey', this.system.homeyVersion || '2+');

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

        // NOTE: If the client is already connected, the 'connect' event won't be fired. 
        // Therefore we mannually dispatch the state if already connected/registered.
        if (this._mqttClient.isRegistered()) {
            this.dispatchState();
        }
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

    get deviceConfig() {
        return {
            name: this.system.name || DEFAULT_DEVICE_NAME,
            device_id: this._deviceId,
            mqtt: {
                host: "localhost",
                port: 1883,
                base_topic: this._topicRoot + '/',
                auth: false,
                username: null,
                password: null
            },
            mqttClient: this.homieMQTTClient,
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

        this.broadcast = settings.broadcastDevices !== false;

        this.settings.topicRoot = settings.topicRoot === undefined ? DEFAULT_TOPIC_ROOT : settings.topicRoot;
        this.settings.deviceId = normalize(settings.deviceId || this.system.name || DEFAULT_DEVICE_ID);
        this.settings.topicIncludeClass = settings.topicIncludeClass === true;
        this.settings.topicIncludeZone = settings.topicIncludeZone === true;
        this.settings.percentageScale = settings.percentageScale || DEFAULT_PROPERTY_SCALING;
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
                Log.error('HomieDispatcher: Failed to unregister devices');
                Log.error(e);
            }
        }
        this._nodes.clear();
    }

    getTopic(device, capability) {
        return [
            this._topicRoot,
            this._deviceId,
            ...this.getNodeName(device).split('/'),
            capability ? normalize(typeof capability === 'string' ? capability : capability.id) : undefined
        ].filter(x => x).join('/');
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

    _send(deviceId, propertyOrTopic, value, retained) {

        let topic = typeof propertyOrTopic === 'string' ? propertyOrTopic : propertyOrTopic.mqttTopicProperty;
        // TODO: Homie property ranges
        //if (t.homieNode.isRange && t.rangeIndex !== null) {
        //    topic = t.homieNode.mqttTopic + '_' + t.rangeIndex + '/' + t.name;
        //}

        this._registerDeviceTopic(deviceId, topic);
        this.messageQueue.add(topic, value, { retain: retained !== false });
    }

    _sendColor(device, property, { hsv, rgb }, retained) {

        // Send color for property
        switch (this.settings.colorFormat) {
            case 'hsv':
                this._send(device.id, property, `${hsv.h},${hsv.s},${hsv.v}`, retained);
                break;
            case 'rgb':
                this._send(device.id, property, `${rgb.r},${rgb.g},${rgb.b}`, retained);
                break;
        }

        // TODO: Seperate settings switches for color formatting
        const topic = property.mqttTopicProperty;

        // send color objects
        this._send(device.id, `${topic}/rgb`, rgb, retained);
        this._send(device.id, `${topic}/hsv`, hsv, retained);

        // Send seperate color channels
        let channels = { ...rgb, ...hsv };
        for (let c in channels) {
            this._send(device.id, `${topic}/${c}`, channels[c], retained);
        }
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

        Log.info("Register device: " + device.name);

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

                        const format = this._format(capability);
                        if (format) {
                            property.setFormat(format);
                        }

                        if (capability.setable) {
                            property.settable((format, value) => {
                                if (!this.deviceManager.isDeviceEnabled(device.id)) {
                                    //Log.info('[SKIP] Device disabled');
                                    return;
                                }
                                
                                this.setValue(device.id, capability, value, dataType)
                                    .then()
                                    .catch(e => {
                                        Log.error("Failed to set capability value: " + name);
                                        Log.error(e);
                                    });
                            });
                        }

                        // NOTE: Ranges not implemented

                        if (this.broadcast) {
                            if (color) {
                                this._sendColor(device, property, this._formatColor(capabilities));
                            } else {
                                this._send(device.id, property, this._formatValue(value, capability));
                            }
                        }
                    }

                    // Listen to state changes
                    try {
                        const deviceCapabilityId = device.id + capability.id;
                        this._destroyCapabilityInstance(deviceCapabilityId);
                        device.setMaxListeners(100);
                        const capabilityInstance = device.makeCapabilityInstance(key, value =>
                            this._handleStateChange(node, device.id, capability, value)
                                .then()
                                .catch(error => {
                                    Log.error("Failed to handle device state change");
                                    Log.error(error);
                                })
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

        this.removeDeviceMessages(deviceId);

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

    _registerDeviceTopic(deviceId, topic) {
        let topics = this._deviceTopics.get(deviceId);
        if (!topics) {
            topics = new Set();
            this._deviceTopics.set(deviceId, topics);
        }
        topics.add(topic);
    }

    removeDeviceMessages(deviceId) {
        const topics = this._deviceTopics.get(deviceId);
        if (topics) {
            this._deviceTopics.delete(deviceId);
            for (let topic of topics) {
                this.messageQueue.remove(topic);
            }
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

        // percentage
        if (capability.units === '%') {
            switch (this.settings.percentageScale) {
                case 'int':
                    if (capability.min === 0 && capability.max === 1)
                        return 'int';
                    break;
                case 'float':
                    if (capability.min === 0 && capability.max === 100)
                        return 'float';
                    break;
                case 'default':
                default:
                    // nothing
                    break;
            }
        }

        // color
        if (this.settings.colorFormat !== 'values') {
            switch (capability.id) {
                case 'light_hue':
                    return 'color';         // Catch 'color' type
                case 'light_saturation':
                case 'light_temperature':
                    return undefined;       // NOTE: Skip additional color value. The color dataType is already created from 'light_hue'
            }
        }

        // default
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

            // catch percentage
            if (capability.units === '%') {
                switch (this.settings.percentageScale) {
                    case 'int':
                        if (capability.min === 0 && capability.max === 1)
                            return '0:100';
                        break;
                    case 'float':
                        if (capability.min === 0 && capability.max === 100)
                            return '0:1';
                        break;
                    case 'default':
                    default:
                        // nothing
                        break;
                }
            }

            return `${capability.min}:${capability.max}`;
        }

        if (capability.type === 'enum') {
            return _.map(capability.values, value => value.id).join(',');
        }

        return null;
    }

    async _handleStateChange(node, deviceId, capability, value) {

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
        
        Log.info("Homie set value [" + node.name + "." + capability.id + "]: " + value);

        if (value === undefined) {
            Log.info("Homie: No value provided");
            return;
        }

        // Catch colors
        //if (this.settings.colorFormat !== 'values') {
            if (capability.id === 'light_hue') {
                capability.id = 'color';
                let device = await this.api.devices.getDevice({ id: deviceId });
                if (device) {
                    if (this.broadcast) {
                        this._sendColor(device, property, this._formatColor(device.capabilitiesObj));
                    }
                }
                return;
            }
            if (capability.id === 'light_saturation' || capability.id === 'light_temperature') {
                return; // NOTE: Skip additional color value. The color dataType is already handled by 'light_hue'
            }
        //}

        try {
            const property = node.setProperty(normalize(capability.id));
            if (property) {
                if (this.broadcast) {
                    this._send(deviceId, property, this._formatValue(value, capability));
                }
            } else {
                Log.info("No property found for capability: " + capability.id);
            }
        } catch (e) {
            Log.error('HomieDispatcher: Failed to publish capability value');
            Log.error(e);
        }
    }

    async setValue(deviceId, capability, value, dataType) {

        Log.info('HomieDispatcher.setValue');

        // handle colors
        if (dataType === 'color') {
            try {
                await this._setColor(deviceId, value, capability);
            } catch (e) {
                Log.error("Failed to set color value");
            }
        } else { // all other datatypes
            try {
                const state = {
                    deviceId: deviceId,
                    capabilityId: capability.id,
                    value: this._parseValue(value, dataType, capability)
                };
                Log.debug("state: " + JSON.stringify(state));
                await this.api.devices.setCapabilityValue(state);
            } catch (e) {
                Log.info("Failed to update capability value");
                Log.error(e);
            }
        }
    }

    async _setColor(deviceId, value, capability) {
        let split = typeof value === 'number'
            ? [value]
            : (value || '').toString().split(',').map(v => parseFloat(v.trim()));

        if (split.length === 3) {
            try {
                let color = this.settings.colorFormat === 'rgb' ? Color.RGBtoHSV(...split) : { h: split[0], s: split[1], v: split[2] };
                Log.debug("color: " + JSON.stringify(color));

                // Note: Homey values are rang 0...1
                color.h /= 360;
                color.s /= 100;
                color.v /= 100;

                await this.api.devices.setCapabilityValue({ deviceId: deviceId, capabilityId: 'light_saturation', value: color.s });
                await this.api.devices.setCapabilityValue({ deviceId: deviceId, capabilityId: 'light_temperature', value: color.v });
                await this.api.devices.setCapabilityValue({ deviceId: deviceId, capabilityId: 'light_hue', value: color.h }); // NOTE: Executed last because 'hue' triggers the update
            } catch (e) {
                Log.info("Homie: Failed to update color value");
                Log.error(e);
            }
        }
        else if (split.length === 2) { // HASS: assume HS format
            try {
                let color = { h: split[0], s: split[1] };
                Log.debug("color: " + JSON.stringify(color));

                // Note: Homey values are rang 0...1
                color.h /= 360;
                color.s /= 100;
                
                await this.api.devices.setCapabilityValue({ deviceId: deviceId, capabilityId: 'light_saturation', value: color.s });
                await this.api.devices.setCapabilityValue({ deviceId: deviceId, capabilityId: 'light_hue', value: color.h }); // NOTE: Executed last because 'hue' triggers the update
            } catch (e) {
                Log.info("Homie: Failed to update color value");
                Log.error(e);
            }
        }
        else if (split.length === 1) { // HASS: temperature
            try {
                // Note: Homey values are rang 0...1 (percentage)
                // HASS: The color temperature command slider has a range of 153 to 500 mireds (micro reciprocal degrees).
                let temperature = (split[0] - 153) / (500 - 153);
                Log.debug("light_temperature: " + temperature);

                await this.api.devices.setCapabilityValue({ deviceId: deviceId, capabilityId: 'light_temperature', value: temperature });
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

        const hue = (capabilities['light_hue'] || {}).value || 0;
        const saturation = (capabilities['light_saturation'] || {}).value || 0;
        const temp = (capabilities['light_temperature'] || {}).value || 0;

        const hsv = {
            h: hue * 360,
            s: saturation * 100,
            v: temp * 100
        }
        const rgb = Color.HSVtoRGB(hsv);
        return { hsv, rgb };
    }

    _formatValue(value, capability) {
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }

        if (capability.units === '%') {
            switch (this.settings.percentageScale) {
                case 'int':
                    if (capability.min === 0 && capability.max === 1)
                        return value * 100;
                    break;
                case 'float':
                    if (capability.min === 0 && capability.max === 100)
                        return value / 100;
                    break;
                case 'default':
                default:
                    // nothing
                    break;
            }
        }

        return value;
    }

    _parseValue(value, dataType, capability) {

        // Handle percentage scaling
        if (capability && capability.units === '%') {
            switch (this.settings.percentageScale) {
                case 'int':
                    if (capability.min === 0 && capability.max === 1)
                        return this._parseValue(value, 'int') / 100.0;
                    break;
                case 'float':
                    if (capability.min === 0 && capability.max === 100)
                        return this._parseValue(value, 'float') * 100;
                    break;
                case 'default':
                default:
                    // nothing
                    break;
            }
        }

        // by data type
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
            Log.info("MQTT Client registered: " + this._mqttClient.isRegistered());
        }
    }

    destroy() {
        Log.info('Destroy HomieDispatcher');
        this._destroyHomieDevice();
    }
}

module.exports = HomieDispatcher;
