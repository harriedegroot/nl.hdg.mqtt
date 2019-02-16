"use strict";

const Log = require('../Log');

const TOPIC_ROOT = '+/+/+/+/'; // [homey]/+/+/+/+/<command>

/**
 * @deprecated [DEPRECATED] CommandHandler base class
 * */
class CommandHandler {

    constructor(mqttClient, command, topicRoot) {
        const topic = (topicRoot || TOPIC_ROOT || '').split('/');
        topic.push(command);
        this.topic = topic.filter(x => x).join('/');
        this.command = command;

        mqttClient.subscribe(this.topic);
    }

    get command() {
        if (!this._command) {
            throw new Error('No command registered');
        }
        return this._command;
    }
    set command(value) {
        this._command = value;
    }

    /**
     * Process command message
     * NOTE: This method is executed by the message handler
     */
    async process({ command, topic, message, deviceId }) {

        if (command === this.command) {
            Log.info('execute: ' + command);
            await this.execute({ command, topic, message, deviceId });
        }
    }

    /**
     * Abstract method for command processing
     * Implement your command handling by overriding this method
     */
    async execute({ command, topic, message, deviceId }) { }
}
module.exports = CommandHandler;
