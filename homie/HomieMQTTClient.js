'use strict';

const Log = require("../Log.js");
const Message = require("../mqtt/Message.js");

const CLIENT_OPTIONS = {
    injectRoot: false
}

class HomieMQTTClient  {

    constructor(mqttClient) {
        this.mqttClient = mqttClient;
    }

    publish(topic, msg, opt) {
        if (msg) {
            opt = opt || {};
            const message = new Message(topic, msg, opt.qos, opt.retain);
            this.mqttClient.publish(message, CLIENT_OPTIONS);
        }
    }

    subscribe(topic) {
        this.mqttClient.subscribe(topic, CLIENT_OPTIONS);
    }

    on(event, callback) {
        switch (event) {
            case 'connect':
                this.mqttClient.onRegistered.subscribe(callback);
                break;
            case 'close':
                this.mqttClient.onUnRegistered.subscribe(callback);
                break;
            case 'message':
                this.mqttClient.onMessage.subscribe(callback);
                break;
        }
    }

    end() {
        // ?? nothing for now....
    }
}

module.exports = HomieMQTTClient;