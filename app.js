'use strict';

const TOPIC = 'homey/#';

const Homey = require('homey');
const { HomeyAPI } = require('athom-api');

const LogModule = require("./logmodule.js");
const Dispatcher = require("./dispatcher.js");
const MessageHandler = require("./messagehandler.js");
const MQTTClient = new Homey.ApiApp('nl.scanno.mqtt');

class MQTTDispatcher extends Homey.App {

    // NOTE: must be executed within app scope...
    initMQTTClient() {

        // Register to app events
        MQTTClient
            .register()
            .on('install', async () => await this.register())
            .on('uninstall', () => this.unregister())
            .on('realtime', (topic, message) => this.onMessage(topic, message));

        // Fetch installed app
        MQTTClient.getInstalled()
            .then(async installed => { if (installed) await this.register(); })
            .catch(error => this.logModule.error(error));

        // Receive all messages from the homey topic
        MQTTClient.post('subscribe', { topic: TOPIC }, error => {
            if (error) {
                this.log.error(error);
            } else {
                this.logModule.info('subscribed to topic: ' + TOPIC);
            }
        });
    }

	async onInit() {
        this.log('MQTT Dispatcher is running...');

        this.logModule = LogModule;
        this.api = await HomeyAPI.forCurrentHomey();
        this.messageHandler = new MessageHandler(this);
        this.dispatcher = new Dispatcher(this);

        this.initMQTTClient();
    }
 
    async register() {
        this.registered = true;

        await this.messageHandler.register();
        await this.dispatcher.register();
    }

    unregister() {
        this.registered = false;

        //await this.messageHandler.unregister();
        //await this.dispatcher.unregister();
    }

    onMessage(topic, message) {
        if (this.registered && this.messageHandler) {
            this.messageHandler.onMessage(topic, message);
        }
    }

    publishMessage(msg) {
        //this.logModule.debug(JSON.stringify(msg, null, 2));

        try {
            if (this.registered) {
                MQTTClient.post('send', msg);
            }
        } catch (error) {
            this.logModule.error(error);
        }
    }
}

module.exports = MQTTDispatcher;