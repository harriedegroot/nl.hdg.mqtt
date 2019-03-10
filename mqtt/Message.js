"use strict";

class Message {
    constructor(topic, message, qos, retain) {
        this.qos = qos || 0;
        this.retain = retain ? '1' : '0';
        this.mqttTopic = typeof topic === 'string' ? topic : (topic || '').toString();
        this.mqttMessage = message;
    }
}

module.exports = Message;
