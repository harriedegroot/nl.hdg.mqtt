"use strict";

const Log = require('./log.js');
const Topic = require('./topic.js');
const Message = require('./message.js');

const DELAY = 30000;

class SystemInfoDispatcher {

    constructor(api, mqttClient) {
        this.api = api;
        this.mqttClient = mqttClient;
    }

    // Get all devices and add them
    async register() {

        this.registered = true;

        await this.update();

        Log.debug('System info dispatcher registered');
    }

    async unregister() {
        this.registered = false;

        if (this.timeout) {
            this.clearTimeout(this.timeout);
            this.timeout = undefined;
        }
    }

    async update() {
        if (!this.registered) return;

        try {
            const info = {
                system: await this.api.system.getInfo(),
                storage: await this.api.system.getStorageStats(),
                memory: await this.api.system.getMemoryStats(),
                timestamp: new Date().getTime()
            };
            this.publish(info);
        } catch (e) {
            Log.info(e);
            Log.error("Failed to fetch system info");
        }

        // loop
        this.timeout = setTimeout(this.update.bind(this), DELAY);
    }

    /**
     * Dispatch MQTT message for device trigger with state as payload
     * @param {any} state Message payload (Device state)
     * @see https://github.com/scanno/nl.scanno.mqtt/blob/f887f507be94191fb86b85f1856e0714736039fe/broker.js
     */
    publish(info) {

        if (!info) return;

        const topic = new Topic('system', 'info');
        const msg = new Message(topic, info);

        Log.debug(JSON.stringify(msg, null, 2));

        try {
            this.mqttClient.publish(msg);
        } catch (error) {
            Log.info('Error publishing message');
            Log.debug(JSON.stringify(msg || '', null, 2));
            Log.error(error, false); // prevent notification spamming
        }
    }
}

module.exports = SystemInfoDispatcher;
