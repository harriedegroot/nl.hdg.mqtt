"use strict";

const Topic = require('./Topic.js');
const Message = require('./Message.js');

const _guid = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'i');

class DeviceState {

    constructor(device, trigger, capability, value, command) {
        this.command = command || 'state';
        if (typeof device === 'string') {
            device = _guid.test(device) ? { id: device } : { name: device };
        }

        this.device = {
            id: device.id,
            class: device.class,
            zone: device.zone,
            name: device.name,
            state: device.state
        };

        this.trigger = trigger;
        this.capability = capability;
        this.value = value;

        this.timestamp = new Date().getTime()
    }

    toMessage(command) {
        const topic = new Topic(this.device, this.trigger, command || this.command);
        return new Message(topic, this);
    }
    
}

module.exports = DeviceState;
