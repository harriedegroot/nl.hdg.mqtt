"use strict";

const Log = require('../Log.js');
const Topic = require('../mqtt/Topic.js');
const Message = require('../mqtt/Message.js');

const DEVICE = 'system';
const TRIGGER = 'general';
const COMMAND = 'state';
const DELAY = 30000;

class SystemStateDispatcher {

    constructor({ api, mqttClient }) {
        this.api = api;
        this.mqttClient = mqttClient;

        this._init();
    }

    _init() {
        this.mqttClient.onRegistered.subscribe(this.register.bind(this));
        this.mqttClient.onUnRegistered.subscribe(this.unregister.bind(this));
        if (this.mqttClient.isRegistered())
            this.register();
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
//                storage: await this.api.system.getStorageStats(),
//                memory: await this.api.system.getMemoryStats(),
                timestamp: new Date().getTime()
            };

            const topic = new Topic(DEVICE, TRIGGER, COMMAND);
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
