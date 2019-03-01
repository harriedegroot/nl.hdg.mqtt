"use strict";

const Log = require('../Log');
const Topic = require('../mqtt/Topic');
const Message = require('../mqtt/Message');

const COMMAND = 'state';

/**
 * @deprecated [DEPRECATED]
 * */
class DeviceStateChangeDispatcher {

    constructor({ api, mqttClient, deviceManager }) {
        this.api = api;
        this.mqttClient = mqttClient;
        this.deviceManager = deviceManager;

        this._init();
    }

    // Get all devices and add them
    async _init() {

        // listeners
        this.deviceManager.onAdd.subscribe(this.registerDevice.bind(this));
        //this.deviceManager.onRemove.subscribe(id => Log.debug('device remove: ' + id));
        //this.deviceManager.onUpdate.subscribe(id => Log.debug('device update: ' + id));

        // register
        this.registerDevices();

        Log.debug('Devices registered');
    }

    registerDevices() {
        const devices = this.deviceManager.devices;
        if (devices) {
            for (let key in devices) {
                if (devices.hasOwnProperty(key)) {
                    this.registerDevice(devices[key]);
                }
            }
        }
    }

    registerDevice(device) {
        if (!device) return;

        for (let i in device.capabilities) {
            device.makeCapabilityInstance(device.capabilities[i], value =>
                this._handleStateChange(device, value, device.capabilities[i])
            );
        }
    }

    _handleStateChange(device, value, capability) {
        if (!this.mqttClient.isRegistered()) return;
        var msg = null;
        const topic = new Topic(device, capability, COMMAND);

        if (typeof value === 'boolean') {
          var onoff = value ? 'true' : 'false';
          msg = new Message(topic, onoff);
        } else {
          msg = new Message(topic, value);
        }

        this.mqttClient.publish(msg);
        Log.debug(topic + ': ' + value);
    }

    destroy() {
        // TODO: implement
    }
}

module.exports = DeviceStateChangeDispatcher;
