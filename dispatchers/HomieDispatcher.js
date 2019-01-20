"use strict";

const _ = require('lodash');
const Log = require('../Log.js');
const Topic = require('../mqtt/Topic.js');
const HomieDevice = require('../homie/homieDevice');
const HomieMQTTClient = require('../homie/HomieMQTTClient');
const Color = require('../Color.js');

const COLOR_FORMAT = 'hsv';

const normalize = function (name) {
    return _.replace(Topic.normalize(name), '_', '-');
};

/**
 * Homey Convention 3.0.1
 * Based on modified version of: https://github.com/marcus-garvey/homie-device
 * @see ~/homie/README
 * */
class HomieDispatcher {

    constructor({ api, mqttClient, deviceManager, system }) {
        this.api = api;
        this.mqttClient = new HomieMQTTClient(mqttClient);
        this.deviceManager = deviceManager;
        this.system = system;

        this.homieDevice = new HomieDevice(this.config);
        this.homieDevice.setFirmware("Homey", system.version);
        this.homieDevice.on('message', function (topic, value) {
            Log.debug('Homie: A message arrived on topic: ' + topic + ' with value: ' + value);
        });
        this.homieDevice.on('broadcast', function (topic, value) {
            Log.debug('Homie: A broadcast message arrived on topic: ' + topic + ' with value: ' + value);
        });

        this._registerDevices();
        this.homieDevice.setup(true);

        // launch
        if (mqttClient.isRegistered()) {
            this.homieDevice.onConnect();
        }
    }

    get config() {
        if (!this._config) {
            this._config = {
                name: this.system.name || "Homey",
                device_id: normalize(this.system.name) || 'unknown',
                mqtt: {
                    host: "localhost",
                    port: 1883,
                    base_topic: "homie/",
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
        return this._config;
    }

    // Get all devices and add them
    _registerDevices() {
        const devices = this.deviceManager.devices;
        if (devices) {
            for (let key in devices) {
                if (devices.hasOwnProperty(key)) {
                    this._registerDevice(devices[key]);
                }
            }
        }
    }

    _registerDevice(device) {
        if (!device) return;

        // homieDevice.node(name, friendlyName, type, startRange, endRange)
        let node = this.homieDevice.node(normalize(device.name), device.name, this._convertClass(device.class));

        const capabilities = device.capabilitiesObj || device.capabilities;
        if (capabilities) {
            for (let key in capabilities) {
                const capability = capabilities[key];
                const id = capability.id;
                if (capabilities.hasOwnProperty(id)) {
                    if (!device.state || !device.state.hasOwnProperty(id)) {
                        Log.debug("Homie: No state value found for trigger: " + id);
                        continue;
                    }

                    const color = (id === 'light_hue') ? 'color' : null;
                    const value = device.state ? device.state[id] : undefined;
                    const capabilityTitle = color ? 'Color' : typeof capability.title === 'object' ? capability.title['en'] : capability.title;
                    const capabilityName = capabilityTitle || capability.name || id;
                    const name = _.replace([device.name, capabilityName].filter(x => x).join(' - '), "_", " ");
                    const dataType = this._convertDataType(capability);

                    if (dataType) {
                        const property = node.advertise(color || normalize(id))
                            .setName(name)
                            .setUnit(this._convertUnit(capability))
                            .setDatatype(dataType)
                            .setRetained(true)
                            .send(color ? this._formatColor(device.state) : this._formatValue(value)); 

                        const format = this._format(capability);
                        if (format) {
                            property.setFormat(format);
                        }

                        if (capability.setable) {
                            property.settable(async (format, value) => await this.setValue(device.id, id, value, dataType));
                        }

                        // NOTE: Ranges not implemented
                    }
                }
            }
        }

        // Listen to state changes
        device.on('$state', (state, capability) => this._handleStateChange(node, device.id, capability, state));
    }

    _convertClass(deviceClass) {
        return deviceClass || 'other';
    }

    _convertUnit(capability) {

        if (capability.id === 'light_hue' || capability.id === 'light_saturation' || capability.id === 'light_temperature') {
            return COLOR_FORMAT;
        }

        const units = capability.units;
        return typeof units === 'object' ? units['en'] : units;
    }

    _convertDataType(capability) {

        // Catch 'color' type
        if (capability.id === 'light_hue') {
            return 'color';
        }
        if (capability.id === 'light_saturation' || capability.id === 'light_temperature') {
            return undefined; // NOTE: Skip additional color value. The color dataType is already created from 'light_hue'
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
        if (capability.id === 'light_hue' || capability.id === 'light_saturation' || capability.id === 'light_temperature') {
            return COLOR_FORMAT;
        }

        if (capability.min !== undefined && capability.max !== undefined) {
            return `${capability.min}:${capability.max}`;
        }

        if (capability.type === 'enum') {
            return _.map(capability.values, value => value.id).join(',');
        }

        return null;
    }

    async _handleStateChange(node, deviceId, capabilityId, state) {
        let value = state[capabilityId];
        Log.debug("Homie set value: " + value);

        if (value === undefined) {
            Log.debug("Homie: No value provided");
            return;
        }

        // Catch colors
        if (capabilityId === 'light_hue') {
            Log.debug(state);
            capabilityId = 'color';
            value = this._formatColor(state);
            Log.debug("Homie set color: " + value);
        }
        if (capabilityId === 'light_saturation' || capabilityId === 'light_temperature') {
            return; // NOTE: Skip additional color value. The color dataType is already handled by 'light_hue'
        }

        try {
            node.setProperty(normalize(capabilityId)).setRetained(true).send(this._formatValue(value));
        } catch (e) {
            Log.error(e);
        }
    }

    async setValue(deviceId, capabilityId, value, dataType) {

        Log.debug('HomieDispatcher.setValue');

        // handle colors
        if (dataType === 'color') {
            await this._setColor(deviceId, value);
        } else { // all other datatypes
            try {
                const state = {
                    id: deviceId,
                    capability: capabilityId,
                    value: this._parseValue(value, dataType)
                };
                Log.debug("state: " + JSON.stringify(state));
                await this.api.devices.setDeviceCapabilityState(state);
            } catch (e) {
                Log.info("Homie: Failed to update capability value");
                Log.error(e);
            }
        }
    }

    async _setColor(deviceId, value) {
        let split = (value || '').toString().split(',').map(v => parseFloat(v.trim()));
        if (split.length === 3) {
            try {
                let color = COLOR_FORMAT === 'rgb' ? Color.RGBtoHSV(...split) : { h: split[0], s: split[1], v: split[2] };

                // Note: Homey values are rang 0...1
                color.h /= 360;
                color.s /= 100;
                color.v /= 100;

                Log.debug("color: " + JSON.stringify(color));
                await this.api.devices.setDeviceCapabilityState({ id: deviceId, capability: 'light_hue', value: color.h });
                await this.api.devices.setDeviceCapabilityState({ id: deviceId, capability: 'light_saturation', value: color.s });
                await this.api.devices.setDeviceCapabilityState({ id: deviceId, capability: 'light_temperature', value: color.v });
            } catch (e) {
                Log.info("Homie: Failed to update color value");
                Log.error(e);
            }
        } else {
            Log.debug('Invalid color value');
        }
    }

    _formatColor(state) {
        // Note: Homey values are rang 0...1
        switch (COLOR_FORMAT) {
            case 'hsv':
                return [
                    state['light_hue'] * 360,
                    state['light_saturation'] * 100,
                    state['light_temperature'] * 100
                ].join(',');
            case 'rgb':
                const rgb = Color.HSVtoRGB(state['light_hue'] * 360, state['light_saturation'] * 100, state['light_temperature'] * 100);
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
            case 'enum':    // TODO: parse enum
            case 'color':   // TODO: parse colors
            default:
                let numeric = Number(value);
                return isNaN(numeric) ? value : numeric;
        }
    }
}

module.exports = HomieDispatcher;
