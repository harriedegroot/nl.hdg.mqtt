"use strict";

const Log = require('./log.js');
const Topic = require('./topic.js');
const Message = require('./message.js');

class DeviceStateDispatcher {

    constructor(api, mqttClient, deviceManager) {
        this.api = api;
        this.mqttClient = mqttClient;
        this.deviceManager = deviceManager;
    }

    // Get all devices and add them
    async register() {

        this.registered = true;
        this.registerDevices();

        Log.debug('Devices registered');
    }

    async unregister() {
        this.registered = false;
    }

    registerDevices() {
        this.deviceManager.addAddedListener(this.addStateChangeListeners.bind(this));
        //this.deviceManager.addRemovedListener(...);
        //this.deviceManager.addUpdateListener(...);
    }

    async addStateChangeListeners(device) {
        if (!device) return;

        device.on('$state', (state, capability) => {
            if (!this.registered) return;
            for (let trigger in state) {
                if (state.hasOwnProperty(trigger)) {
                    this.onStateChange(device, trigger, capability, state[trigger]);
                }
            }
        });
        //device.on('$update', (device) => { console.log("Device updated: " + device.id) });
    }

    // this function gets called when a device with an attached eventlistener fires an event.
    onStateChange(device, trigger, capability, value) {
        const state = {
            type: 'state_change',
            device: {
                id: device.id,
                class: device.class,
                zone: device.zone,
                name: device.name,
                state: device.state
            },
            trigger,
            capability,
            value,
            timestamp: new Date().getTime()
        };
        this.publish(state);
    }

    /**
     * Dispatch MQTT message for device trigger with state as payload
     * @param {any} state Message payload (Device state)
     * @see https://github.com/scanno/nl.scanno.mqtt/blob/f887f507be94191fb86b85f1856e0714736039fe/broker.js
     */
    publish(state) {

        if (!state) return;

        const topic = new Topic(state.device, state.trigger, state.type);
        const msg = new Message(topic, state);

        //Log.debug(JSON.stringify(msg, null, 2));

        try {
            this.mqttClient.publish(msg);
        } catch (error) {
            Log.info('Error publishing message');
            Log.debug(JSON.stringify(msg || '', null, 2));
            Log.error(error, false); // prevent notification spamming
        }
    }
}

module.exports = DeviceStateDispatcher;
