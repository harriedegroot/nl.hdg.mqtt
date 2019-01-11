'use strict';

const TOPIC = 'homey/#';

const Homey = require('homey');
const { HomeyAPI } = require('athom-api');
const Log = require("./log.js");
const MQTTClient = require('./mqttclient.js');
const DeviceManager = require("./devicemanager.js");
const MessageHandler = require("./messagehandler.js");
const DeviceStateDispatcher = require("./device_state_dispatcher.js");
const SystemInfoDispatcher = require("./system_info_dispatcher.js");

class MQTTDispatcher extends Homey.App {

	async onInit() {
        Log.info('MQTT Dispatcher is running...');

        this.mqttClient = new MQTTClient(TOPIC);
        this.api = await HomeyAPI.forCurrentHomey();
        this.deviceManager = new DeviceManager(this.api);
        this.messageHandler = new MessageHandler(this.api, this.deviceManager);
        this.deviceStateDispatcher = new DeviceStateDispatcher(this.api, this.mqttClient, this.deviceManager);
        this.systemInfoDispatcher = new SystemInfoDispatcher(this.api, this.mqttClient);

        this.initMQTTClient();
    }

    async initMQTTClient() {
        this.mqttClient.addRegisterdListener(this.register.bind(this));
        this.mqttClient.addUnRegisterdListener(this.unregister.bind(this));
        this.mqttClient.addMessageListener(this.onMessage.bind(this));

        if (this.mqttClient.isRegistered()) {
            await this.register();
        }
    }
 
    async register() {
        Log.debug("app.register");
        //await this.deviceStateDispatcher.register();
        await this.deviceManager.register();
        await this.messageHandler.register();
        await this.systemInfoDispatcher.register();
    }

    async unregister() {
        Log.debug("app.unregister");
        await this.messageHandler.unregister();
        await this.deviceManager.unregister();
        await this.deviceStateDispatcher.unregister();
        await this.systemInfoDispatcher.unregister();
    }

    async onMessage(topic, message) {
        //Log.debug("app.onMessage");
        try {
            await this.messageHandler.onMessage(topic, message);
        } catch (e) {
            Log.info('Error handling message');
            Log.debug(topic);
            Log.debug(JSON.stringify(message || '', null, 2));
            Log.error(e, false); // prevent notification spamming
        }
    }
}

module.exports = MQTTDispatcher;