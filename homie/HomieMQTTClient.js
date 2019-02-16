'use strict';

class HomieMQTTClient  {

    isRegistered() {
        return this.mqttClient.isRegistered();
    }

    constructor(mqttClient, messageQueue) {
        this.mqttClient = mqttClient;
        this.messageQueue = messageQueue;
    }

    publish(topic, msg, opt) {
        this.messageQueue.add(topic, msg, opt);
    }

    subscribe(topic) {
        this.mqttClient.subscribe(topic)
            .then("HomieMQTTClient: Succesfully subscribed to topic: " + topic)
            .catch(e => {
                Log.error('HomieMQTTClient: Failed to subscribe to topic: ' + topic);
                Log.debug(e);
            });
    }

    on(event, callback) {
        switch (event) {
            case 'connect':
                if (this._connectCallback) {
                    this.mqttClient.onRegistered.remove(this._connectCallback);
                }
                this._connectCallback = callback;
                this.mqttClient.onRegistered.subscribe(callback);
                if (this.isRegistered()) {
                    callback();
                }

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
            this.topics.forEach(t => this.mqttClient.unsubscribe(t));
        }
    }
}

module.exports = HomieMQTTClient;