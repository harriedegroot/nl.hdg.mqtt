"use strict";

const _ = require('lodash');
const Log = require('../Log.js');
const Topic = require('../mqtt/Topic.js');
const Message = require('../mqtt/Message.js');
const HomieDevice = require('../homie/homieDevice');
const HomieMQTTClient = require('../homie/HomieMQTTClient');

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

                    const value = device.state ? device.state[id] : undefined;
                    const capabilityTitle = typeof capability.title === 'object' ? capability.title['en'] : capability.title;
                    const capabilityName = capabilityTitle || capability.name || id;
                    const name = _.replace([device.name, capabilityName].filter(x => x).join(' - '), "_", " ");
                    const dataType = this._convertType(capability.type);

                    const property = node.advertise(normalize(id))
                        .setName(name + ` (#${id})`)
                        .setUnit(this._convertUnit(capability.units)) 
                        .setDatatype(dataType) 
                        .setRetained(true) // for now
                        .send(this._formatValue(value)); 

                    //node.advertiseRange('my-property-2', 0, 10);

                    //// range
                    //node.advertise('my-property-2').settable(function (range, value) {
                    //    let index = range.index;
                    //    node.setProperty('my-property-2').setRange(index).send(this._formatValue(value));
                    //});

                    const format = this._format(capability);
                    if (format) {
                        // TODO: set format
                    }

                    if (capability.setable) {
                        property.settable(async (range, value) => {
                            await this.setValue(device.id, id, value, dataType);
                            await this._handleStateChange(node, device.id, id, value);
                        });
                    }
                }
            }
        }

        device.on('$state', (state, capability) => this._handleStateChange(node, device.id, capability, state[capability]));
    }

    _convertClass(deviceClass) {
        // TODO: Convert Homey device class to Homie convention based types
        return deviceClass;
    }

    _convertUnit(units) {

        let unit = typeof units === 'object' ? units['en'] : units;

        // TODO: Convert Homey units to Homie convention based units

        /* Recommended units:
        ======================
        °C Degree Celsius
        °F Degree Fahrenheit
        ° Degree
        L Liter
        gal Galon
        V Volts
        W Watt
        A Ampere
        % Percent
        m Meter
        ft Feet
        Pa Pascal
        psi PSI
        # Count or Amount
        */

        return unit;
    }

    _convertType(type) {
        // TODO: convert Homey types to Homie convention based types

        // accepted: integer, float, boolean, string, enum, color

        switch (type) {
            case 'number':
                return 'float';
            default:
                return type || 'integer';
        }
    }

    _format(capability) {
        /*
        - from: to Describes a range of values e.g. 10: 15. Valid for datatypes integer, float
        - value, value, value for enumerating all valid values.Escape, by using,,.e.g.A, B, C or ON, OFF, PAUSE. Valid for datatypes enum
        - rgb to provide colors in RGB format e.g. 255, 255, 0 for yellow.hsv to provide colors in HSV format e.g. 60, 100, 100 for yellow. Valid for datatype color
        */

        return null;
    }

    async _handleStateChange(node, deviceId, capabilityId, value) {
        Log.debug("Homie set value: " + value);
        if (value === undefined) {
            Log.debug("Homie: No value provided");
            return;
        }

        try {
            node.setProperty(normalize(capabilityId)).setRetained().send(this._formatValue(value));
        } catch (e) {
            Log.error(e);
        }
    }

    async setValue(deviceId, capabilityId, value, dataType) {

        Log.debug('HomieDispatcher.setValue');

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
            case 'enum':    // TODO: parse colors
            case 'color':   // TODO: parse colors
            default:
                let numeric = Number(value);
                return isNaN(numeric) ? value : numeric;
        }
    }
}

module.exports = HomieDispatcher;
