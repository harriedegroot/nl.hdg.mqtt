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

        device.on('$state', (state, capability) => this._handleStateChange(device, state, capability));
        //device.on('$update', (device) => { console.log("Device updated: " + device.id) });
    }

    _handleStateChange(device, state, capability) {
        if (!this.registered) return;

        if (!state) {
            Log.debug(state);
            Log.debug(capability);
        }

        for (let trigger in state) {
            if (state.hasOwnProperty(trigger)) {
                const value = state[trigger];
                const topic = new Topic(device, trigger, 'state');
                const msg = new Message(topic, value);
                this.mqttClient.publish(msg);

                Log.debug(topic + ': ' + value);
            }
        }
    }
}

module.exports = DeviceStateChangeDispatcher;
