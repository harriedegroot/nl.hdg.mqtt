"use strict";

class MessageHandler {

    constructor(app) {
        this.app = app;
        this.log = app.logModule;
        this.api = app.api;
    }

    async register() {
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
        //this.log.debug(topic + ": " + JSON.stringify(message, null, 2));

        if (!topic) return;

        // ==== TEST ====
        // TODO: implement
        // TODO: allow publishing to topic like homey/{device}/{capabillity}/update with message:{ value: 5 }

        if (message) {
            //switch(this.getAction(topic))
            switch (message.type)
            {
                case 'set_capabillity': 
                    await this.setCapabillity(topic, message);
                    break;
                case 'state_change': // NOTE: fall through
                default:
                    // nothing
                    break;
            }
        }
    }

    getAction(topic) {
        let path = (topic || '').split('/');
        return path[path.length - 1].replace(/\W/g, '');
    }

    async setCapabillity(topic, message) {
        this.log.debug('set capabillity: ' + topic);

        if (message) {
            let deviceId = message && message.device ? message.device.id : null;
            this.log.debug('deviceId: ' + deviceId);
            this.log.debug('capabillity: ' + message.capabillity);
            this.log.debug('value: ' + message.value);
            if (deviceId && message.value !== undefined && message.capabillity) {
                const device = await this.getDevice(deviceId);
                if (device) {
                    // Homey 1.5.13
                    if (device.setCapabilityValue) {
                        this.log.info('set '+ device.name + ' capabillity' + message.capabillity + ' to ' + message.value);
                        await device.setCapabilityValue(message.capabillity, message.value);
                    }
                }
            }
        }
    }

    async getDevice(id) {
        return await this.api.devices.getDevice({ id: id });
    }
}

module.exports = MessageHandler;
