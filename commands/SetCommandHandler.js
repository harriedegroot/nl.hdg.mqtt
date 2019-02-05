"use strict";

const Log = require('../Log.js');

const COMMAND = 'set';

function getTopic(settings) {
    const topic = typeof settings === 'object'
        ? [settings.topicRoot, settings.deviceId]
        : [];
    topic.push(COMMAND);
    return topic.filter(x => x).join('/');
}

class SetCommandHandler {

    constructor({ api, mqttClient, deviceManager, settings }) {

        this.api = api;
        this.mqttClient = mqttClient;
        this.deviceManager = deviceManager;
        this.topic = getTopic(settings);

        if (mqttClient) {
            Log.info("Starting set command handler");
            if (this.topic) {
                mqttClient.subscribe(this.topic);
                this._clientCallback = this._onMessage.bind(this);
                mqttClient.onMessage.subscribe(this._clientCallback);
            } else {
                Log.error('invalid command topic');
            }
        }
    }

    async _onMessage(topic, message) {

        if (topic !== this.topic) return;

        try {
            Log.debug('SetCommendHandler.onMessage:');
            Log.debug(message);

            if (!this.mqttClient.isRegistered()) {
                Log.debug('[Skip] not registered');
            }

            const command = this.getCommand(message);
            if (!command) {
                Log.info("No command provided");
                return;
            }

            const deviceId = this.getDeviceId(topic, message);
            if (!deviceId) {
                Log.info("Device not found");
                return;
            }

            // TODO: Refactor to seperate command handlers (see MessageHandler)
            // NOTE: Stripped original functionality for quick & dirty solution...
            if (command === COMMAND) {
                await this.execute({ command, topic, message, deviceId });
            }

        } catch (e) {
            Log.info('Error handling set command message');
            Log.debug(topic);
            Log.debug(message);
            Log.error(e);
        }
    }

    getDeviceId(topic, message) {
        let deviceId;
        if (typeof message === 'object' && message.device) {
            deviceId = this.deviceManager.getDeviceId(message.device);
        }
        return deviceId || this.deviceManager.getDeviceId(topic.getDeviceTopicName());
    }

    getCommand(message) {
        return typeof message === 'object' ? message.command : undefined;
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

    destroy() {
        Log.info("Destroy SetCommandHandler");
        if (this.mqttClient && this._clientCallback) {
            this.mqttClient.onMessage.unsubscribe(this._clientCallback);
            delete this._clientCallback;
        }
    }
}

module.exports = SetCommandHandler;
