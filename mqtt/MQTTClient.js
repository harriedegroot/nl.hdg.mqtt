'use strict';

const Homey = require('homey');
const Log = require("../Log.js");
const EventHandler = require('../EventHandler');
const Message = require('./Message');

class MQTTClient  {

    isRegistered() { return this.registered; }

    constructor(autoConnect) {
        this.clientApp = new Homey.ApiApp('nl.scanno.mqtt');

        this.onRegistered = new EventHandler('MQTTClient.registered');
        this.onUnRegistered = new EventHandler('MQTTClient.unregistered');
        this.onMessage = new EventHandler('MQTTClient.message');

        if (autoConnect) {
            this.connect()
                .then(() => Log.info("MQTTClient connected"))
                .catch(error => Log.error(error));
        }
    }

    async connect() {
        try {
            if (this._connected) return;
            this._connected = true;

            // Register to app events
            this._installedCallback = this._onClientAppInstalled.bind(this);
            this._uninstalledCallback = this._onClientAppUninstalled.bind(this);
            this._handleMessageCallback = this._handleMessage.bind(this);

            // Fetch installed app
            await this.clientApp.getInstalled();

            // Register future events
            this.clientApp
                .register()
                .on('install', this._installedCallback)
                .on('uninstall', this._uninstalledCallback)
                .on('realtime', this._handleMessageCallback);

            // call installed handlers
            this._onClientAppInstalled();

        } catch (e) {
            Log.error('Failed to connect MQTTClient');
            Log.error(e);
        }
    }

    disconnect() {
        if (!this._connected) return;
        this._connected = false;

        try {
            this.clientApp.unregister();
            this.clientApp.removeListener('install', this._installedCallback);
            this.clientApp.removeListener('uninstall', this._uninstalledCallback);
            this.clientApp.removeListener('realtime', this._handleMessageCallback);
            this._onClientAppUninstalled();
        } catch (e) {
            Log.error('Failed to disconnect MQTTClient');
            Log.error(e);
        }
    }

    async subscribe(topic) {
        if (topic) {
            this.topics = this.topics || new Set();
            if (this.topics.has(topic)) {
                Log.debug('[SKIP] Already subscribed to topic: ' + topic);
            }
            this.topics.add(topic);

            Log.info('subscribing to topic: ' + topic);
            return await this.clientApp.post('subscribe', { topic: topic }, error => {
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

    unsubscribe(topic) {
        // TODO: implement topic unsubscription
    }

    /**
    * Publish MQTT Message
    * @param {any} msg Message model
    * @returns {Promise} Promise
    */
    async publish(msg) {
        //Log.debug(msg);
        try {
            if (this.registered) {
                if (msg.mqttMessage === undefined) {
                    msg.mqttMessage = null;
                }
                return await this.clientApp.post('send', msg);
            }
        } catch (error) {
            Log.info('Error publishing message');
            Log.debug(msg);
            Log.error(error);
        }
    }

    /**
     * Just a Publish, but with seperate arguments
     * @param {string} topic topic
     * @param {any} payload message payload
     * @param {number} qos qos
     * @param {boolean} retain retain
     * @returns {Promise} Promise
     */
    async send(topic, payload, qos, retain) {
        return await this.publish(new Message(topic, payload, qos, retain));
    }

    /**
     * Clear a (retained) topic
     * @param {string} topic topic
     * @param {number} qos qos
     * @returns {Promise} Promise
     */
    async clear(topic, qos) {
        return await this.publish(new Message(topic, null, qos || 0, true));
    }

    _onClientAppInstalled(installed) {
        Log.debug('mqttClient.onClientAppInstalled');
        this.registered = true;
        this.onRegistered.emit()
            .then()
            .catch(error => Log.error(error));
    }

    _onClientAppUninstalled() {
        Log.debug('mqttClient.onClientAppUnInstalled');
        this.registered = false;
        this.onUnRegistered.emit()
            .then()
            .catch(error => Log.error(error));
    }

    _handleMessage(topic, message) {
        if (!this.registered) return;

        this.onMessage.emit(topic, message)
            .then()
            .catch(error => Log.error(error));
    }
}

module.exports = MQTTClient;