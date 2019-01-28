'use strict';

const Log = require("../Log.js");
const Message = require("../mqtt/Message.js");

const CLIENT_OPTIONS = {
    injectRoot: false
}

class HomieMQTTClient  {

    isRegistered() {
        return !this._destroyed && this.mqttClient.isRegistered();
    }

    constructor(mqttClient) {
        this.mqttClient = mqttClient;
    }

    publish(topic, msg, opt) {
        if (this._destroyed) return;

        if (msg) {
            opt = opt || {};
            const message = new Message(topic, msg, opt.qos, opt.retain);
            this.mqttClient.publish(message, CLIENT_OPTIONS);
        }
    }

    subscribe(topic) {
        if (this._destroyed) return;

        this.topics = this.topics || [];
        this.topics.push(topic);
        this.mqttClient.subscribe(topic, CLIENT_OPTIONS);
    }

    on(event, callback) {
        switch (event) {
            case 'connect':
                if (this._connectCallback) {
                    this.mqttClient.onRegistered.remove(this._connectCallback);
                }
                this._connectCallback = callback;
                this.mqttClient.onRegistered.subscribe(callback);
                break;
            case 'close':
                if (this._closeCallback) {
                    this.mqttClient.onUnRegistered.remove(this._closeCallback);
                }
                this._closeCallback = callback;
                this.mqttClient.onUnRegistered.subscribe(callback);
                break;
            case 'message':
                if (this._messageCallback) {
                    this.mqttClient.onMessage.remove(this._messageCallback);
                }
                this._messageCallback = callback;
                this.mqttClient.onMessage.subscribe(callback);
                break;
        }
    }

    end() {
        if (this._connectCallback) {
            this.mqttClient.onRegistered.remove(this._connectCallback);
            delete this._connectCallback;
        }
        if (this._closeCallback) {
            this.mqttClient.onUnRegistered.remove(this._closeCallback);
            delete this._closeCallback;
        }
        if (this._messageCallback) {
            this.mqttClient.onMessage.remove(this._messageCallback);
            delete this._messageCallback;
        }

        if (this.topics) {
            this.topics.forEach(t => this.mqttClient.unsubscribe(t, CLIENT_OPTIONS));
        }
        this._destroyed = true;
    }
}

module.exports = HomieMQTTClient;