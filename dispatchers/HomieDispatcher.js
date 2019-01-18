"use strict";

const Log = require('../Log.js');
const Topic = require('../mqtt/Topic.js');
const Message = require('../mqtt/Message.js');
const HomieDevice = require('../homie/homieDevice');
const HomieMQTTClient = require('../homie/HomieMQTTClient');

/**
 * Homey Convention 3.0.1
 * Based on modified version of: https://github.com/marcus-garvey/homie-device
 * @see ~/homie/README
 * */
class HomieDispatcher {

    constructor({ api, mqttClient, deviceManager, systemName }) {
        this.api = api;
        this.mqttClient = new HomieMQTTClient(mqttClient);
        this.deviceManager = deviceManager;
        this.systemName = systemName;

        this.homieDevice = new HomieDevice(this.config);
        this.homieDevice.on('message', function (topic, value) {
            Log.debug('A message arrived on topic: ' + topic + ' with value: ' + value);
        });
        this.homieDevice.on('broadcast', function (topic, value) {
            Log.debug('A broadcast message arrived on topic: ' + topic + ' with value: ' + value);
        });

        this._registerDevices();
        this.homieDevice.setup();
    }

    get config() {
        if (!this._config) {
            //const topic = Topic.normalize(this.systemName) || 'homie';
            this._config = {
                name: this.systemName || "Homey",
                device_id: Topic.normalize(this.systemName) || 'unknown',
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
        
        // homieDevice.node(name, friendlyName, type, startRange, endRange)
        let node = this.homieDevice.node(Topic.normalize(device.name), device.name, this._convertType(device.class));

        const capabilities = device.capabilitiesObj || device.capabilities;
        if (capabilities) {
            for (let key in capabilities) {
                const capability = capabilities[key];
                const id = capability.id;
                if (capabilities.hasOwnProperty(id)) {
                    if (!device.state || !device.state.hasOwnProperty(id)) {
                        Log.debug("No state value found for trigger: " + id);
                        continue;
                    }
                    const value = device.state ? device.state[id] : undefined;
                    node.advertise(Topic.normalize(id))
                        .setName(capability.title || capability.name || id)
                        .setUnit(this._convertUnit(capability.units)) 
                        .setDatatype(this._convertType(capability.type)) 
                        .send(value); 

                    // TODO: Handle device stuff/ ranges/ updates/ set/ get etc.

                    //node.advertiseRange('my-property-2', 0, 10);

                    //// settable
                    //node.advertise('my-property-1').setName('Friendly Prop Name').setUnit('W').setDatatype('string').settable(function (range, value) {
                    //    node.setProperty('my-property-1').setRetained().send(value);
                    //});

                    //// range
                    //node.advertise('my-property-2').settable(function (range, value) {
                    //    let index = range.index;
                    //    node.setProperty('my-property-2').setRange(index).send(value);
                    //});

                    //this.homieDevice.on('message:my/topic', function (value) {
                    //    Log.debug('A message arrived on the my/topic topic with value: ' + value);
                    //});
                }
            }
        }

        //device.on('$state', (state, capability) => this._handleStateChange(device, state, capability));
    }

    _convertType(deviceClass) {
        // TODO: Convert Homey device class to Homie convention based types
        return deviceClass;
    }

    _convertUnit(units) {
        // TODO: Convert Homey units to Homie convention based units
        return units;
    }

    _convertType(type) {
        // TODO: convert Homey types to Homie convention based types
        return type || 'integer';
    }
}

module.exports = HomieDispatcher;
