"use strict";

const Log = require('./log.js');
const Topic = require('./topic.js');

const SKIP_COMMANDS = ['state_change', 'state'];

class MessageHandler {

    constructor(api, deviceManager) {
        this.api = api;
        this.deviceManager = deviceManager;
    }

    async register() {
        this.registered = true;
    }
    async unregister() {
        this.registered = false;
    }

    /**
     * onMessage - Handling of received messages.
     * This gets called as soon as the client receives a message published
     * on a subscribed topic
     *
     * @param  {type} topic   topic where message was published on
     * @param  {type} message payload of the received message
     */
    async onMessage(topic, message) {
        
        //Log.debug(topic + ": " + JSON.stringify(message, null, 2));

        if (!this.registered || !topic) return;

        topic = new Topic().parse(topic);
        if (SKIP_COMMANDS.indexOf(topic.command) !== -1) {
            //Log.debug('skip state_change message: ' + topic.toString());
            return;
        }

        Log.debug(topic);
        Log.debug(message);

        let deviceId = this.getDeviceId(topic, message);
        Log.debug(message);

        return this.handleByCommand(topic, message, deviceId)
            || await this.handleByMessageType(topic, message, deviceId);
    }

    getDeviceId(topic, message) {
        let deviceId;
        if (typeof message === 'object' && message.device) {
            deviceId = this.deviceManager.getDeviceId(message.device);
        }
        return deviceId || this.deviceManager.getDeviceId(topic.getDeviceTopicName());
    }

    handleByCommand(topic, message, deviceId) {

        switch (topic.getCommand()) {
            case 'update':

                return true;
            default:
                break;
        }
        // TODO: allow publishing to topic like homey/{device}/{capability}/update with message:{ value: 5 }
        // TODO: request state

        return false;
    }
    async handleByMessageType(topic, message, deviceId) {
        if (typeof message === 'object') {
            switch (message.type) {
                case 'set_capability':
                    await this.setCapability(topic, message, deviceId);
                    return true;
                case 'state_change': // NOTE: fall through
                default:
                    // nothing
                    break;
            }
        }
        return false;
    }

    getCapabilityIdFromMessage(message) {
        if (!message || !message.capability)
            return undefined;

        return typeof message.capability === 'object' ? message.capability.id : message.capability;
    }

    getCapabilityIdFromTopic(topic) {
        // TODO: Return registered capability id from device manager?
        return topic.trigger;
    }

    parseValue(message, capabilityId) {
        if (message === undefined || message === null) return undefined;
        let value = typeof message === 'object' ? message.value : message.toString();

        // TODO: parse value to correct type
        if (capabilityId) {

            let numeric = Number(value);
            value = isNaN(numeric) ? value : numeric;

            //switch (capability.???) {
            //    case 'number':
            //        return Number(value);
            // if(invalid): throw 'Invalid value FOO for capability Bar'
            //}
        }
        return value;
    }

    async setCapability(topic, message, deviceId) {
        Log.debug('set capability: ' + topic);

        const capabilityId = this.getCapabilityIdFromMessage(message) || this.getCapabilityIdFromTopic(topic);
        if (!capabilityId) {
            Log.error("capability not found for topic: " + topic.toString());
            return;
        }

        // TODO: Check if capability exists
        //let capability = this.deviceManager.getCapability(device, capabilityId);
        //if (!capability) {
        //    Log.error("capability '" + capabilityId + "' not found for device: " + device.name);
        //    return;
        //}

        try {
            const value = this.parseValue(message, capabilityId);
            const state = {
                id: deviceId,
                capability: capabilityId,
                value: value
            };
            Log.debug("state: " + JSON.stringify(state));
            await this.api.devices.setDeviceCapabilityState(state);
        } catch (e) {
            Log.info("Failed to update capability value");
            Log.error(e);
        }
    }
}

module.exports = MessageHandler;
