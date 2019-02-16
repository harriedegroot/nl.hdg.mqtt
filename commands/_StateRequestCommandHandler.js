"use strict";

const Log = require('../Log');
const Topic = require('../mqtt/Topic');
const Message = require('../mqtt/Message');
const CommandHandler = require('./CommandHandler');

const COMMAND = 'request';

/**
 * @deprecated [DEPRECATED]
 * */
class StateRequestCommandHandler extends CommandHandler {

    constructor({ api, mqttClient }) {
        super(mqttClient, COMMAND);

        this.api = api;
        this.mqttClient = mqttClient;
    }

    async execute({ topic, message, deviceId }) {

        Log.debug('StateRequestCommandHandler.process');

        const capabilityId = this.getCapabilityIdFromMessage(message) || this.getCapabilityIdFromTopic(topic);
        if (!capabilityId) {
            Log.error("capability not found for topic: " + topic);
            Log.debug(message);
            return;
        }

        await this._sendDeviceCapabilityValue(deviceId, capabilityId);
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

    async _sendDeviceCapabilityValue(deviceId, capabilityId) {
        const device = await this.api.devices.getDevice({ id: deviceId });
        if (!device) {
            Log.error('Device not found: ' + deviceId);
            return;
        }

        if (!device.state || !device.state.hasOwnProperty(capabilityId)) {
            Log.info("No state value found for capability: " + capabilityId);
            return;
        }

        const value = device.state[capabilityId];
        const topic = new Topic(device, capabilityId, 'state');
        const msg = new Message(topic, value);
        await this.mqttClient.publish(msg);

        Log.debug('Request - ' + topic + ': ' + value);
    }
}

module.exports = StateRequestCommandHandler;
