'use strict';

const Homey = require('homey');
const Log = require("./log.js");

class MQTTClient  {

    isRegistered() {
        return this.registered;
    }

    constructor(topic) {
        this.topic = topic;
        this.clientApp = new Homey.ApiApp('nl.scanno.mqtt');

        this.onRegistered = [];
        this.onUnRegistered = [];
        this.onMessage = [];

        this.init();
    }

    init() {
        // Register to app events
        this.clientApp
            .register()
            .on('install', this.onClientAppInstalled.bind(this))
            .on('uninstall', this.onClientAppUninstalled.bind(this))
            .on('realtime', this.handleMessage.bind(this));

        // Fetch installed app
        this.clientApp.getInstalled()
            .then(this.onClientAppInstalled.bind(this))
            .catch(error => Log.error(error));
    }
    
    addRegisterdListener(callback) {
        this.onRegistered.push(callback);
    }
    addUnRegisterdListener(callback) {
        this.onUnRegistered.push(callback);
    }
    addMessageListener(callback) {
        this.onMessage.push(callback);
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

    async onClientAppInstalled(installed) {
        Log.debug('mqttClient.onClientAppInstalled');
        this.registered = true;
        for (let callback of this.onRegistered) {
            if (typeof callback === 'function') {
                await callback();
            }
        }
    }

    async onClientAppUninstalled() {
        Log.debug('mqttClient.onClientAppInstalled');
        this.registered = false;
        for (let callback of this.onUnRegistered) {
            if (typeof callback === 'function') {
                await callback();
            }
        }
    }

    async handleMessage(topic, message) {
        if (!this.registered) return;
        
        for (let callback of this.onMessage) {
            if (typeof callback === 'function') {
                try {
                    await callback(topic, message);
                } catch (e) {
                    Log.info('Error handling message');
                    Log.debug(topic);
                    Log.debug(JSON.stringify(message || '', null, 2));
                    Log.error(e, false); // note prevent notification spamming
                }
            }
        }
    }

    publish(msg) {
        Log.debug(JSON.stringify(msg, null, 2));

        try {
            if (this.registered) {
                this.clientApp.post('send', msg);
            }
        } catch (error) {
            Log.info('Error publising message');
            Log.debug(JSON.stringify(msg || '', null, 2));
            Log.error(error);
        }
    }
}

module.exports = MQTTClient;