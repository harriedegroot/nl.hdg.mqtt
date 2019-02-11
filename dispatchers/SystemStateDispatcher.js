"use strict";

const Log = require('../Log.js');
const Message = require('../mqtt/Message.js');

const TOPIC = 'info';
const DELAY = 30000;

class SystemStateDispatcher {

    constructor({ api, mqttClient }) {
        this.api = api;
        this.mqttClient = mqttClient;

        this.topic = TOPIC;

        this._init();
    }

    _init() {
        this._registerCallback = this.register.bind(this);
        this._unregisterCallback = this.unregister.bind(this);
        this.mqttClient.onRegistered.subscribe(this._registerCallback);
        this.mqttClient.onUnRegistered.subscribe(this._unregisterCallback);
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
            
            const msg = new Message(this.topic, info);
            this.mqttClient.publish(msg);

        } catch (e) {
            Log.info(e);
            Log.error("Failed to fetch system info");
        }

        // loop
        this.timeout = setTimeout(this.update.bind(this), DELAY);
    }

    async destroy() {
        await this.unregister();
        if (this.mqttClient) {
            this.mqttClient.onRegistered.remove(this._registerCallback);
            this.mqttClient.onUnRegistered.remove(this._unregisterCallback);
        }
    }
}

module.exports = SystemStateDispatcher;
