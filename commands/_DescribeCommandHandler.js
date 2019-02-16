"use strict";

const Log = require('../Log');
const Topic = require('../mqtt/Topic');
const Message = require('../mqtt/Message');
const DeviceInfo = require('../models/DeviceInfo');
const CommandHandler = require('./CommandHandler');

const COMMAND = 'describe';

/**
 * @deprecated [DEPRECATED]
 * */
class DescribeCommandHandler extends CommandHandler {

    constructor({ api, mqttClient }) {
        super(mqttClient, COMMAND);

        this.api = api;
        this.mqttClient = mqttClient;
    }

    async execute({ topic, message, command, deviceId }) {

        Log.debug('DescribeCommandHandler.process');

        // TODO: check which info is requested :)

        await this._sendDeviceInfo(deviceId);
    }

    async _sendDeviceInfo(id) {
        const device = await this.api.devices.getDevice({ id });
        if (!device) {
            Log.error('Device not found: ' + id);
            return;
        }

        const topic = new Topic(device, '+', 'info');
        const info = new DeviceInfo(device);
        const msg = new Message(topic, JSON.stringify(info));
        await this.mqttClient.publish(msg);

        Log.debug(topic.toString());
        Log.debug(info);
    }

    //async _sendCapabilityInfo(device, capability)
    //    const capabilities = device.capabilitiesObj || device.capabilities;
    //    if (capabilities) {

    //        // TODO: filter by trigger/capability

    //        for (let trigger in capabilities) {
    //            if (capabilities.hasOwnProperty(trigger)) {
    //                if (!device.state || !device.state.hasOwnProperty(trigger)) {
    //                    Log.debug("No state value found for trigger: " + trigger);
    //                    continue;
    //                }
    //                const value = device.state ? device.state[trigger] : undefined;
    //                const state = new DeviceState(device, trigger, capabilities[trigger], value);
    //                const msg = state.toMessage();
    //                this.mqttClient.publish(msg);
    //            }
    //        }
    //    }
    //}
}

module.exports = DescribeCommandHandler;
