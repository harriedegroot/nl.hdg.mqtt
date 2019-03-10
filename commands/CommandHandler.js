"use strict";

const Log = require('../Log');
const normalize = require('../normalize');

const TOPIC = '{deviceId}/$command'; // <root>/<device id>/$command

/**
 * TODO: Create the ability to register seperate commands
 * */
class CommandHandler {

    constructor({ api, mqttClient, deviceManager }) {
        this.api = api;
        this.mqttClient = mqttClient;
        this.deviceManager = deviceManager;

        if (this.mqttClient) {
            this._clientCallback = this._onMessage.bind(this);
            this.mqttClient.onMessage.subscribe(this._clientCallback);
        }
    }

    async init(settings) {
        if (!this.mqttClient) return;
        try {
            Log.info("Initializing set command handler");
            const deviceId = settings.normalize !== false ? normalize(settings.deviceId) : settings.deviceId;
            const topic = (settings.commandTopic || TOPIC).replace('{deviceId}', deviceId);
            if (this.topic !== topic) {
                if (this.topic) {
                    await this.mqttClient.clear(this.topic);
                    await this.mqttClient.unsubscribe(this.topic);
                }
                this.topic = topic;
                if (this.topic) {
                    await this.mqttClient.subscribe(this.topic);
                }
            }
            Log.info("CommandHandler initialized");
        } catch (e) {
            Log.error('Failed to initialize CommandHandler');
            Log.debug(e);
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
                Log.debug("No command provided");
                return;
            }

            const deviceId = this.getDeviceId(topic, message);
            if (!deviceId) {
                Log.debug("Device not found");
                return;
            }

            // TODO: Refactor to seperate command handlers (see MessageHandler)
            // NOTE: Stripped original functionality for quick & dirty solution...
            if (command === 'set') { // just 'set' for now...
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

    // TODO: Move to seperate Command class
    async execute({ topic, message, deviceId }) {

        Log.debug('CommandHandler.process');

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

    parseValue(message, capabilityId) {
        if (message === undefined || message === null) return undefined;
        let value = typeof message === 'object' ? message.value : message.toString();

        if (capabilityId) {

            if (value === 'true') return true;
            if (value === 'false') return false;

            let numeric = Number(value);
            value = isNaN(numeric) ? value : numeric;

        }
        return value;
    }

    destroy() {
        Log.info("Destroy CommandHandler");
        if (this.mqttClient && this._clientCallback) {
            this.mqttClient.onMessage.remove(this._clientCallback);
            delete this._clientCallback;
        }
    }
}

module.exports = CommandHandler;
