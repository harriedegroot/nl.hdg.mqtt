'use strict';

const TOPIC = 'homey/#';

const Homey = require('homey');
const { HomeyAPI } = require('athom-api');
const Log = require("./Log.js");
const MQTTClient = require('./MQTTClient.js');
const DeviceManager = require("./DeviceManager.js");
const MessageHandler = require("./MessageHandler.js");
const DeviceStateDispatcher = require("./DeviceStateDispatcher.js");
const SystemInfoDispatcher = require("./SystemInfoDispatcher.js");
const DeviceStateCommandHandler = require("./DeviceStateCommandHandler.js");

class MQTTDispatcher extends Homey.App {

	async onInit() {
        Log.info('MQTT Dispatcher is running...');

        this.mqttClient = new MQTTClient();
        this.api = await HomeyAPI.forCurrentHomey();
        this.deviceManager = new DeviceManager(this.api);
        this.messageHandler = new MessageHandler(this.api, this.deviceManager);
        this.deviceStateDispatcher = new DeviceStateDispatcher(this.api, this.mqttClient, this.deviceManager);
        this.systemInfoDispatcher = new SystemInfoDispatcher(this.api, this.mqttClient);

        this.messageHandler.addCommandHandler(new DeviceStateCommandHandler(this.api, this.mqttClient));

        this._initMQTTClient();
    }

    async _initMQTTClient() {
        this.mqttClient.onRegistered.subscribe(this._register.bind(this));
        this.mqttClient.onUnRegistered.subscribe(this._unregister.bind(this));
        this.mqttClient.onMessage.subscribe(this._onMessage.bind(this));

        if (this.mqttClient.isRegistered) {
            await this._register();
        }
    }
 
    async _register() {
        Log.debug("app.register");

        this.mqttClient.subscribe(TOPIC);

        await this.deviceStateDispatcher.register();
        await this.deviceManager.register();
        await this.messageHandler.register();
        await this.systemInfoDispatcher.register();
    }

    async _unregister() {
        Log.debug("app.unregister");
        await this.messageHandler.unregister();
        await this.deviceManager.unregister();
        await this.deviceStateDispatcher.unregister();
        await this.systemInfoDispatcher.unregister();
    }

    async _onMessage(topic, message) {
        //Log.debug("app.onMessage: " + topic);
        //Log.debug(message);

        try {
            await this.messageHandler.onMessage(topic, message);
        } catch (e) {
            Log.info('Error handling message');
            Log.debug(topic);
            Log.debug(message);
            Log.error(e, false); // prevent notification spamming
        }
    }
}

module.exports = MQTTDispatcher;