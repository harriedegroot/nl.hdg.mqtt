'use strict';

const TOPIC = 'homey/#';

const Homey = require('homey');
const { HomeyAPI } = require('athom-api');
const MQTTClient = require('./mqtt/MQTTClient.js');

// Services
const Log = require("./Log.js");
const DeviceManager = require("./DeviceManager.js");
const MessageHandler = require("./MessageHandler.js");

// Dispatchers
const DeviceStateChangeDispatcher = require("./dispatchers/DeviceStateChangeDispatcher.js");
const SystemStateDispatcher = require("./dispatchers/SystemStateDispatcher.js");
const FlowTriggerDispatcher = require("./dispatchers/FlowTriggerDispatcher.js");

// Commands
const DescribeCommandHandler = require("./commands/DescribeCommandHandler.js");
const StateRequestCommandHandler = require("./commands/StateRequestCommandHandler.js");
const UpdateCommandHandler = require("./commands/UpdateCommandHandler.js");

class MQTTGateway extends Homey.App {

	async onInit() {
        Log.info('MQTT Gateway is running...');

        this.mqttClient = new MQTTClient();
        this.api = await HomeyAPI.forCurrentHomey();
        this.deviceManager = new DeviceManager(this.api);
        this.messageHandler = new MessageHandler(this.api, this.deviceManager);

        this._initDispatchers();
        this._initCommands();
        this._initMQTTClient();
    }

    _initDispatchers() {
        this.deviceStateChangeDispatcher = new DeviceStateChangeDispatcher(this.api, this.mqttClient, this.deviceManager);
        this.systemStateDispatcher = new SystemStateDispatcher(this.api, this.mqttClient);
        this.flowTriggerDispatcher = new FlowTriggerDispatcher(this.api, this.mqttClient);
    }

    _initCommands() {
        this.messageHandler.addCommandHandler(new DescribeCommandHandler(this.api, this.mqttClient));
        this.messageHandler.addCommandHandler(new StateRequestCommandHandler(this.api, this.mqttClient));
        this.messageHandler.addCommandHandler(new UpdateCommandHandler(this.api, this.mqttClient));
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

        this.mqttClient.subscribe(TOPIC); // TOOD: Remove root wildcard subscription!

        await this.deviceManager.register();
        await this.messageHandler.register();
        await this.deviceStateChangeDispatcher.register();
        await this.systemStateDispatcher.register();
    }

    async _unregister() {
        Log.debug("app.unregister");
        await this.messageHandler.unregister();
        await this.deviceManager.unregister();
        await this.deviceStateChangeDispatcher.unregister();
        await this.systemStateDispatcher.unregister();
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

module.exports = MQTTGateway;