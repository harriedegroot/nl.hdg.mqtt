'use strict';

const Homey = require('homey');
const Log = require("../Log.js");
const EventHandler = require('../EventHandler.js');

class MQTTClient  {

    isRegistered() { return this.registered; }

    constructor() {
        this.clientApp = new Homey.ApiApp('nl.scanno.mqtt');

        this.onRegistered = new EventHandler('MQTTClient.registered');
        this.onUnRegistered = new EventHandler('MQTTClient.unregistered');
        this.onMessage = new EventHandler('MQTTClient.message');

        this._init();
    }

    _init() {
        // Register to app events
        this.clientApp
            .register()
            .on('install', this._onClientAppInstalled.bind(this))
            .on('uninstall', this._onClientAppUninstalled.bind(this))
            .on('realtime', this._handleMessage.bind(this));

        // Fetch installed app
        this.clientApp.getInstalled()
            .then(this._onClientAppInstalled.bind(this))
            .catch(error => Log.error(error));
    }

    subscribe(topic) {
        if (topic) {
            Log.info('subscribing to topic: ' + topic);
            this.clientApp.post('subscribe', { topic: topic }, error => {
                if (error) {
                    Log.error(error);
                } else {
                    Log.info('sucessfully subscribed to topic: ' + topic);
                }
            });
        } else {
            Log.info("skipped topic subscription: No topic provided");
        }
    }

    /**
     * Publish MQTT Message
     * @param {any} msg Message model
     */
    publish(msg) {
        //Log.debug(msg);

        try {
            if (this.registered) {
                this.clientApp.post('send', msg);
            }
        } catch (error) {
            Log.info('Error publishing message');
            Log.debug(msg);
            Log.error(error);
        }
    }

    async _onClientAppInstalled(installed) {
        Log.debug('mqttClient.onClientAppInstalled');
        this.registered = true;
        await this.onRegistered.emit();
    }

    async _onClientAppUninstalled() {
        Log.debug('mqttClient.onClientAppInstalled');
        this.registered = false;
        await this.onUnRegistered.emit();
    }

    async _handleMessage(topic, message) {
        if (!this.registered) return;

        await this.onMessage.emit(topic, message);
    }
}

module.exports = MQTTClient;