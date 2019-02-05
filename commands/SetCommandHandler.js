"use strict";

const Log = require('../Log.js');
const CommandHandler = require('./CommandHandler.js');

const COMMAND = 'set';

function getRootTopic(settings) {
    return typeof settings === 'object'
        ? [settings.rootTopic, settings.deviceId].filter(x => x).join('/')
        : undefined;
}

class SetCommandHandler extends CommandHandler {

    constructor({ api, mqttClient, settings }) {
        super(mqttClient, COMMAND, getRootTopic(settings));

        this.api = api;
    }

    async execute({ topic, message, deviceId }) {

        Log.debug('SetCommandHandler.process');

        const capabilityId = this.getCapabilityIdFromMessage(message);
        if (!capabilityId) {
            Log.error("capability not found");
            Log.debug(message);
            return;
        }

        try {
            const state = {
                deviceId: deviceId,
                capabilityId: capabilityId,
                value: this.parseValue(message, capabilityId)
            };

            Log.debug("state: " + JSON.stringify(state, null, 2));
            await this.api.devices.setCapabilityValue(state);
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

    // TODO: Format by capability datatype
    parseValue(message, capabilityId) {
        if (message === undefined || message === null) return undefined;
        let value = typeof message === 'object' ? message.value : message.toString();

        // TODO: parse value to correct type
        if (capabilityId) {

            if (value === 'true') return true;
            if (value === 'false') return false;

            let numeric = Number(value);
            value = isNaN(numeric) ? value : numeric;

        }
        return value;
    }
}

module.exports = SetCommandHandler;
