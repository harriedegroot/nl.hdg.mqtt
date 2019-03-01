"use strict";

const Log = require('./Log');
const Topic = require('./mqtt/Topic');

/**
 * @deprecated [DEPRECATED] Left for future reference
 * */
class MessageHandler {

    constructor({ api, mqttClient, deviceManager }) {
        this.api = api;
        this.mqttClient = mqttClient;
        this.deviceManager = deviceManager;
        this._commandHandlers = new Map();

        this.mqttClient.subscribe('command');
        this.mqttClient.onMessage.subscribe(this._onMessage.bind(this));
    }

    addMessageHandler(messageHandler) {
        if (!messageHandler || typeof messageHandler.process !== 'function') {
            throw new Error('Invalid CommandHandler');
        }

        const command = messageHandler.command;
        if (command) {
            let commandHandlers = this._commandHandlers.get(command) || [];
            commandHandlers.push(messageHandler);
            this._commandHandlers.set(command, commandHandlers);
        }

        // TODO: general message handlers?
    }

    /**
     * [private] onMessage - Handling of received messages.
     * This gets called as soon as the client receives a message published
     * on a subscribed topic
     *
     * @param  {type} topic   topic where message was published on
     * @param  {type} message payload of the received message
     */
    async _onMessage(topic, message) {
        try {
            Log.debug('MessageHandler.onMessage: ' + topic);

            if (!this.mqttClient.isRegistered()) {
                Log.debug('[Skip] not registered');
            }
            if (!topic) {
                Log.debug('[Skip] no topic provided');
            }

            topic = new Topic().parse(topic);

            //Log.debug(topic);
            //Log.debug(message);

            const command = this.getCommand(topic, message);
            if (command) {
                Log.debug('Command: ' + command);
                await this._processCommandHandlers(command, topic, message);
            }
        } catch (e) {
            Log.info('Error handling message');
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

    getCommand(topic, message) {
        const command = typeof message === 'object' ? message.command : undefined;
        //Log.debug("Message command: " + command);
        return command || topic.getCommand();
    }

    async _processCommandHandlers(command, topic, message) {
        const handlers = this._commandHandlers.get(command);
        if (handlers) {
            Log.info('process: ' + (command || '<unknown>'));

            const deviceId = this.getDeviceId(topic, message);
            Log.debug("device: " + deviceId);

            for (let handler of handlers) {
                if (typeof handler === 'object' && typeof handler.process === 'function') {
                    try {
                        await handler.process({ command, topic, message, deviceId });
                    } catch (e) {
                        Log.info('Error processing command: ' + command);
                        Log.error(e);
                    }
                }
            }
        }
    }

    destroy() {
        // TODO: implement
    }
}

module.exports = MessageHandler;
