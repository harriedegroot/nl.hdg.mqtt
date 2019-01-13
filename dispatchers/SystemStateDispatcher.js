"use strict";

const Log = require('../Log.js');
const Topic = require('../mqtt/Topic.js');
const Message = require('../mqtt/Message.js');

const DELAY = 30000;

class SystemStateDispatcher {

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

        this._resetTimeout();
    }

    _resetTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
    }

    async update() {
        this._resetTimeout();
        if (!this.registered) return;

        try {
            // TODO: Create state value messages for each value of interest
            const info = {
                system: await this.api.system.getInfo(),
                storage: await this.api.system.getStorageStats(),
                memory: await this.api.system.getMemoryStats(),
                timestamp: new Date().getTime()
            };

            const topic = new Topic('system', 'general', 'state');
            const msg = new Message(topic, info);
            this.mqttClient.publish(msg);

        } catch (e) {
            Log.info(e);
            Log.error("Failed to fetch system info");
        }

        // loop
        this.timeout = setTimeout(this.update.bind(this), DELAY);
    }
}

module.exports = SystemStateDispatcher;
