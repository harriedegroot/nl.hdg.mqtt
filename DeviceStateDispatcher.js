"use strict";

const Log = require('./Log.js');
const DeviceState = require('./DeviceState.js');

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

    _addStateChangeListeners(device) {
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
                const deviceState = new DeviceState(device, trigger, capability, value);
                const msg = deviceState.toMessage();

                try {
                    this.mqttClient.publish(msg);
                } catch (error) {
                    Log.info('Error publishing message');
                    Log.debug(msg);
                    Log.error(error, false); // prevent notification spamming
                }
            }
        }
    }

    getCapabilityIdFromMessage(message) {
        if (!message || !message.capability)
            return undefined;

        return typeof message.capability === 'object' ? message.capability.id : message.capability;
    }

    getCapabilityIdFromTopic(topic) {
        // TODO: Return registered capability id from device manager?
        return topic.trigger;
    }

    parseValue(message, capabilityId) {
        if (message === undefined || message === null) return undefined;
        let value = typeof message === 'object' ? message.value : message.toString();

        // TODO: parse value to correct type
        if (capabilityId) {

            let numeric = Number(value);
            value = isNaN(numeric) ? value : numeric;

            //switch (capability.???) {
            //    case 'number':
            //        return Number(value);
            // if(invalid): throw 'Invalid value FOO for capability Bar'
            //}
        }
        return value;
    }

    async setCapability(topic, message, deviceId) {
        Log.debug('set capability: ');
        //Log.debug(topic);

        const capabilityId = this.getCapabilityIdFromMessage(message) || this.getCapabilityIdFromTopic(topic);
        if (!capabilityId) {
            Log.error("capability not found for topic: " + topic.toString());
            Log.debug(message);
            return;
        }

        // TODO: Check if capability exists
        //let capability = this.deviceManager.getCapability(device, capabilityId);
        //if (!capability) {
        //    Log.error("capability '" + capabilityId + "' not found for device: " + device.name);
        //    return;
        //}

        try {
            const value = this.parseValue(message, capabilityId);
            const state = {
                id: deviceId,
                capability: capabilityId,
                value: value
            };
            Log.debug("state: " + JSON.stringify(state));
            await this.api.devices.setDeviceCapabilityState(state);
        } catch (e) {
            Log.info("Failed to update capability value");
            Log.error(e);
        }
    }
}

module.exports = DeviceStateDispatcher;
