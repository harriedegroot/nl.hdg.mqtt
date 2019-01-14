"use strict";

const Log = require('../Log.js');
const CommandHandler = require('./CommandHandler.js');

const COMMAND = 'update';

class UpdateCommandHandler extends CommandHandler {

    constructor({ api, mqttClient }) {
        super(mqttClient, COMMAND);

        this.api = api;
    }

    async execute({ topic, message, deviceId }) {

        Log.debug('UpdateCommandHandler.process');

        const capabilityId = this.getCapabilityIdFromMessage(message) || this.getCapabilityIdFromTopic(topic);
        if (!capabilityId) {
            Log.error("capability not found for topic: " + topic);
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
}

module.exports = UpdateCommandHandler;
