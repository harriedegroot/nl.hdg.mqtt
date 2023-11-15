"use strict";

const delay = require('../delay');
const Log = require('../Log');
const Message = require('./Message');

const DELAY = 0; // Wait 10 ms before sending next message to give Homey some breathing time

class MessageQueue {
    constructor(mqttClient, delay = DELAY) {
        this.mqttClient = mqttClient;
        this.queue = [];
        this.messages = new Map();
        this.running = true;

        // Clear message queue when MQTT Client uninstalled
        this.mqttClient.onUnRegistered.subscribe(() => this.clear());
        this.delay = delay;
    }

    add(topic, payload, opt, process) {
        if (this.mqttClient.isRegistered() && topic) {
            opt = opt || {};
            let message = this.messages.get(topic);
            if (!message) {
                message = new Message(topic, payload, opt.qos, opt.retain);
                this.messages.set(topic, message);
                this.queue.push(message);
            } else {
                message.mqttMessage = payload;
                message.qos = opt.qos;
                message.retain = opt.retain;
            }

            if (process !== false) {
                this.process()
                    .catch(e => {
                        Log.error("Failed to process message queue");
                        Log.error(e);
                    });
            }
        }
    }

    get(topic) {
        return this.messages.get(topic);
    }

    remove(topic) {
        this.messages.delete(topic);
    }

    _getNextMessage() {
        var msg = this.queue.shift();
        return !msg || this.messages.has(msg.mqttTopic) ? msg : this._getNextMessage();
    }

    async next() {
        var msg = this._getNextMessage();
        if (msg) {
            this.messages.delete(msg.mqttTopic);
            try {
                await this.send(msg);
            } catch (e) {
                Log.error('MessageQueue: Failed to send next message');
                Log.debug(e);
            }
        }
    }

    async process() {
        if (this._processing) return;
        this._processing = true;
        this.total = this.queue.length;
        try {
            while (this.running && this.mqttClient.isRegistered() && this.queue.length) {
                this.total = Math.max(this.queue.length, this.total);
                try {
                    await this.next();
                } catch (e) {
                    Log.error("MessageQueue: Failed to process next message");
                    Log.error(e);
                }

                if (this.delay) {
                    try {
                        await delay(this.delay); // give Homey some breathing time
                    } catch (e) {
                        Log.error("MessageQueue: delay failure");
                        Log.error(e);
                    }
                }
            }
        } catch (e) {
            Log.error('MessageQueue: Failed to process queue');
            Log.debug(e);
        }
        if (this.total >= 10) {
            Log.info("Done processing messsages: " + this.total);
        }
        this._processing = false;
        this.total = 0;
    }

    async send(message) {
        try {
            return await this.mqttClient.publish(message);
        } catch (e) {
            Log.error("MessageQueue: Failed to send message");
            Log.error(e);
        }
    }

    getState() {
        let total = Math.max(this.queue.length, this.total);
        return {
            processing: this._processing,
            progress: total - Math.max(0, Math.min(total, this.queue.length)),
            total: total
        };
    }
    
    start() {
        this.running = true;
        this.process();
    }
    stop() {
        this.running = false;
    }

    clear() {
        this.queue = [];
        this.messages.clear();
        this.total = 0;
    }

    destroy() {
        this.stop();
        this.clear();
    }
}

module.exports = MessageQueue;
