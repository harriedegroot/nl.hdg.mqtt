"use strict";

const Log = require('../Log.js');
const Topic = require('../mqtt/Topic.js');
const Message = require('../mqtt/Message.js');

class DeviceStateChangeDispatcher {

    constructor(api, mqttClient, deviceManager) {
        this.api = api;
        this.mqttClient = mqttClient;
        this.deviceManager = deviceManager;
    }

    // Get all devices and add them
    async register() {
        this.registered = true;

        // listeners
        this.deviceManager.onAdd.subscribe(this.registerDevice.bind(this));

        //this.deviceManager.onRemove.subscribe(id => Log.debug('device remove: ' + id));
        //this.deviceManager.onUpdate.subscribe(id => Log.debug('device update: ' + id));

        // register
        this.registerDevices();

        Log.debug('Devices registered');
    }

    async unregister() {
        this.registered = false;
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
          let listener = async (value) => {
            this._handleStateChange(device, value, device.capabilities[i])
          };
          device.makeCapabilityInstance(device.capabilities[i], listener);
        }
    }

    _handleStateChange(device, state, capability) {
        if (!this.registered) return;
        Log.debug("_handleStateChange called");
        if (!state) {
            Log.debug(state);
            Log.debug(capability);
        }

       const value = state;
       const topic = new Topic(device, capability, 'state');
       const msg = new Message(topic, value);
       this.mqttClient.publish(msg);
       Log.debug(topic + ': ' + value);
    }
}

module.exports = DeviceStateChangeDispatcher;
