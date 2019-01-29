'use strict';

const Homey = require('homey');
const Log = require("../Log.js");
const EventHandler = require('../EventHandler.js');
const Topic = require('./Topic.js');

class MQTTClient  {

    isRegistered() { return this.registered; }

    constructor(topic, autoConnect) {
        this.topicRoot = Topic.normalize(topic) || 'homey';
        this.clientApp = new Homey.ApiApp('nl.scanno.mqtt');

        this.onRegistered = new EventHandler('MQTTClient.registered');
        this.onUnRegistered = new EventHandler('MQTTClient.unregistered');
        this.onMessage = new EventHandler('MQTTClient.message');

        if (autoConnect) {
            this.connect();
        }
    }

    connect() {
        if (this._connected) return;
        this._connected = true;

        // Register to app events
        this._installedCallback = this._onClientAppInstalled.bind(this);
        this._uninstalledCallback = this._onClientAppUninstalled.bind(this);
        this._handleMessageCallback = this._handleMessage.bind(this);

        this.clientApp
            .register()
            .on('install', this._installedCallback)
            .on('uninstall', this._uninstalledCallback)
            .on('realtime', this._handleMessageCallback);

        // Fetch installed app
        this.clientApp.getInstalled()
            .then(this._onClientAppInstalled.bind(this))
            .catch(error => Log.error(error));
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
            Log.error(e);
        }
    }

    _injectRoot(topic) {
        if (this.topicRoot) {
            if ((topic || '').substr(0, this.topicRoot.length) !== this.topicRoot) {
                topic = topic ? this.topicRoot + '/' + topic : this.topicRoot;
            }
        }
        return topic;
    }

    _removeRoot(topic) {
        if (topic && this.topicRoot && topic.substr(0, this.topicRoot.length) === this.topicRoot) {
            topic = topic.substr(this.topicRoot.length + 1);
        }
        return topic;
    }

    subscribe(topic, opt) {
        opt = opt || {};
        if (topic) {
            topic = opt.injectRoot === false ? topic : this._injectRoot(topic);

            this.topics = this.topics || new Set();
            if (this.topics.has(topic)) {
                Log.debug('[SKIP] Already subscribed to topic: ' + topic);
            }
            this.topics.add(topic);

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

    unsubscribe(topic, opt) {
        // TODO: implement topic unsubscription
    }

    /**
     * Publish MQTT Message
     * @param {any} msg Message model
     * @param {opt} opt options
     */
    publish(msg, opt) {
        //Log.debug(msg);
        opt = opt || {};
        try {
            if (this.registered) {
                msg.mqttTopic = opt.injectRoot === false ? msg.mqttTopic : this._injectRoot(msg.mqttTopic);
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

        topic = this._removeRoot(topic);
        await this.onMessage.emit(topic, message);
    }
}

module.exports = MQTTClient;