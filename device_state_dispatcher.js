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
        this.deviceManager.onAdd.subscribe(this._addStateChangeListeners.bind(this));
        //this.deviceManager.onRemove.subscribe(id => Log.debug('device remove: ' + id));
        //this.deviceManager.onUpdate.subscribe(id => Log.debug('device update: ' + id));
    }

    async _addStateChangeListeners(device) {
        if (!device) return;

        device.on('$state', (state, capability) => {
            if (!this.registered) return;

            for (let trigger in state) {
                if (state.hasOwnProperty(trigger)) {
                    this._onStateChange(device, trigger, capability, state[trigger]);
                }
            }
        });
        //device.on('$update', (device) => { console.log("Device updated: " + device.id) });
    }

    // this function gets called when a device with an attached eventlistener fires an event.
    _onStateChange(device, trigger, capability, value) {
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

        //Log.debug(msg);

        try {
            this.mqttClient.publish(msg);
        } catch (error) {
            Log.info('Error publishing message');
            Log.debug(msg);
            Log.error(error, false); // prevent notification spamming
        }
    }
}

module.exports = DeviceStateDispatcher;
