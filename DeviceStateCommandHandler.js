"use strict";

const Log = require('./Log.js');
const DeviceState = require('./DeviceState.js');

class DeviceStateCommandHandler {

    constructor(api, mqttClient, commands) {
        this.api = api;
        this.mqttClient = mqttClient;
        this.commands = commands || ['request', 'update'];
    }

    async process(args) {

        Log.debug('DeviceStateCommandHandler.process');
        Log.debug(args);

        switch (args.command) {
            case 'request':
                return await this._handleRequest(args.deviceId);
            case 'update':
                return await this._handleUpdate(args.topic, args.message, args.deviceId);
        }
        return false;
    }

    async _handleRequest(deviceId) {
        const device = await this.api.devices.getDevice({ id: deviceId });
        if (!device) {
            Log.error('Device not found: ' + deviceId);
            return;
        }

        const capabilities = device.capabilitiesObj || device.capabilities;
        if (capabilities) {

            for (let trigger in capabilities) {
                if (capabilities.hasOwnProperty(trigger)) {
                    if (!device.state || !device.state.hasOwnProperty(trigger)) {
                        Log.debug("No state value found for trigger: " + trigger);
                        continue;
                    }
                    const value = device.state ? device.state[trigger] : undefined;
                    const state = new DeviceState(device, trigger, capabilities[trigger], value);
                    const msg = state.toMessage();

                    try {
                        this.mqttClient.publish(msg);
                    } catch (error) {
                        Log.info('Error publishing message');
                        Log.debug(msg);
                        Log.error(error, false); // prevent notification spamming
                    }
                }
            }
        }
    }

    async _handleUpdate(topic, message, deviceId) {
        Log.debug('set capability: ');
        Log.debug(topic);
        Log.debug(message);

        const capabilityId = this.getCapabilityIdFromMessage(message) || this.getCapabilityIdFromTopic(topic);
        if (!capabilityId) {
            Log.error("capability not found for topic: " + topic.toString());
            Log.debug(message);
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
}

module.exports = DeviceStateCommandHandler;
