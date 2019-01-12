"use strict";

const Log = require('./Log.js');
const Topic = require('./Topic.js');

const SKIP_COMMANDS = ['state'];

class MessageHandler {

    constructor(api, deviceManager) {
        this.api = api;
        this.deviceManager = deviceManager;
        this._commandHandlers = new Map();
    }

    async register() {
        this.registered = true;
    }
    async unregister() {
        this.registered = false;
    }

    addCommandHandler(commandHandler) {
        if (!commandHandler || !Array.isArray(commandHandler.commands) || typeof commandHandler.process !== 'function') {
            throw new Error('Invalid CommandHandler');
        }

        for (let command of commandHandler.commands) {
            let commandHandlers = this._commandHandlers.get(command) || [];
            commandHandlers.push(commandHandler);
            this._commandHandlers.set(command, commandHandlers);
        }
    }

    /**
     * onMessage - Handling of received messages.
     * This gets called as soon as the client receives a message published
     * on a subscribed topic
     *
     * @param  {type} topic   topic where message was published on
     * @param  {type} message payload of the received message
     * @returns {type} message handeled?
     */
    async onMessage(topic, message) {

        Log.debug('MessageHandler.onMessage: ' + topic);

        if (!this.registered) {
            Log.debug('[Skip] MessageHandler not registered');
        }
        if (!topic) {
            Log.debug('[Skip] no topic provided');
        }

        topic = new Topic().parse(topic);
        if (SKIP_COMMANDS.indexOf(topic.command) !== -1) {
            //Log.debug('skip state_change message: ' + topic.toString());
            return;
        }

        //Log.debug(topic);
        //Log.debug(message);

        const deviceId = this.getDeviceId(topic, message);
        Log.debug("device: " + deviceId);

        const command = this.getCommand(topic, message);
        await this._process(command, topic, message, deviceId);
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
        return command || topic.getCommand();
    }

    // TODO: Register command handlers
    async _process(command, topic, message, deviceId) {

        Log.info('process: ' + (command || '<unknown>'));
        if (!command) {
            Log.debug(message);
        }

        const handlers = this._commandHandlers.get(command);
        if (handlers) {
            for (let handler of handlers) {
                if (typeof handler === 'object' && typeof handler.process === 'function') {
                    try {
                        await handler.process({ command, topic, message, deviceId });
                    } catch (e) {
                        Log.info('Error processing command: ' + command);
                        Log.error(e, false); // note prevent notification spamming
                    }
                }
            }
        }
    }

}

module.exports = MessageHandler;
