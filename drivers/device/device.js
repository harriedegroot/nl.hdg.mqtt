'use strict';

const Homey = require('homey');
const delay = require('../../delay');
const MQTTClient = require('../../mqtt/MQTTClient');
const MessageQueue = require('../../mqtt/MessageQueue');
const TopicsRegistry = require('../../mqtt/TopicsRegistry');
const { formatValue, parseValue, formatOnOff } = require('../../ValueParser');

const HomeyLib = require('homey-lib');
const CAPABILITIES = HomeyLib.getCapabilities();
//const DEVICE_CLASSES = HomeyLib.getDeviceClasses();

const STATIC = {
    mqttClient: null,
    messageQueue: null
};

class MQTTDevice extends Homey.Device {

	async onInit() {
        this.log('Initializing MQTT Device...');

        this.onSettings(null, super.getSettings(), []);

        this.thisDeviceChanged = new Homey.FlowCardTriggerDevice('change');
        this.thisDeviceChanged.register();

        this.someDeviceChanged = new Homey.FlowCardTrigger('device_changed');
        this.someDeviceChanged.register();

        await this.initMQTT();
        await this.subscribeToTopics();

        this.registerDeviceChanges();
       
        this.log('MQTTDevice is initialized');
    }

    onSettings(oldSettingsObj, newSettingsObj, changedKeysArr) {
        const settings = newSettingsObj || {};

        this.log("Read settings:");
        this.log(JSON.stringify(settings, null, 2));

        // Modified topics?
        if (changedKeysArr && changedKeysArr.includes('topics') && settings.topics) {
            try {
                const capabilities = JSON.parse(settings.topics);
                if (capabilities && typeof capabilities === 'object') {
                    settings.capabilities = capabilities;
                } else { // reset...
                    this.restoreSettingsTopics(settings);
                }
            } catch(e) {
                // probably invalid JSON
                this.restoreSettingsTopics(settings);
            }
        }

        this._topics = new Map();
        this._capabilities = settings.capabilities;
        this.percentageScale = settings.percentageScale || 'int';
        this.onOffValues = settings.onOffValues || 'bool';

        // Link state topics to capabilities
        for (let capabilityId in this._capabilities) {
            const stateTopic = this._capabilities[capabilityId].stateTopic;
            if (stateTopic) {
                this._topics.set(stateTopic, capabilityId);
            }
        }
    }

    restoreSettingsTopics(settings) {
        settings.topics = settings.capabilities
            ? JSON.stringify(settings.capabilities, null, 2)
            : '';

        // Fire & forget (wait 31 sec. to pass the settings timeout)
        // NOTE: This doesn't seem work...
        //setTimeout(() => {
        //    this.setSettings(settings).catch(error => this.log(error));
        //}, 31000);
    }

    async initMQTT() {
        this.log("Init MQTT");

        if (!STATIC.mqttClient) {
            STATIC.mqttClient = new MQTTClient();
        }
        if (!STATIC.messageQueue) {
            STATIC.messageQueue = new MessageQueue(STATIC.mqttClient);
        }

        this.mqttClient = STATIC.mqttClient;
        this._messageHandler = this.onMessage.bind(this);
        this.mqttClient.onMessage.subscribe(this._messageHandler);

        this.messageQueue = STATIC.messageQueue;
        this.topicsRegistry = new TopicsRegistry(this.messageQueue);

        this.log("Connect MQTT Client");
        if (!this.mqttClient.isRegistered()) {
            await this.mqttClient.connect();
        }

        // TODO: Handle (un)install of client (subscribe topics)
    }
    
    async subscribeToTopics() {
        for (let topic of this._topics.keys()) {
            this.log('Subscribe to MQTT Device topic: ' + topic);
            await this.mqttClient.subscribe(topic);
        }
    }

    async onMessage(topic, message) {
        if (this._deleted) return;

        try {
            const capabilityId = this._topics.get(topic);
            if (!capabilityId) return;

            this.log('MQTTDevice.onMessage');
            this.log(topic + ': ' + (typeof message === 'object' ? JSON.stringify(message, null, 2) : message));

            // TODO: Value templates?
            const capability = CAPABILITIES[capabilityId];
            if (!capability) {
                this.log('capability not found for topic');
                return;
            }

            const value = parseValue(message, capability, this.percentageScale);
            await this.setCapabilityValue(capabilityId, value);

        } catch (e) {
            this.log('Error handeling MQTT device message');
            this.log(e);
        }
    }

    registerDeviceChanges() {
        this.registerMultipleCapabilityListener(this.getCapabilities(), async (capabilities, options) => {
            this.log(this.getName() + ' -> Capability changed: ' + JSON.stringify(capabilities, null, 2));

            for (var capabilityId in capabilities) {

                const config = this._capabilities[capabilityId];
                if (!config) {
                    this.log('Capability config not found: ' + capabilityId);
                    continue;
                }

                const value = capabilities[capabilityId];
                const topic = config.setTopic;
                const payload = capabilityId === 'onoff'
                    ? formatOnOff(value, this.onOffValues)
                    : formatValue(value, CAPABILITIES[capabilityId], this.percentageScale);

                const retain = true;
                const qos = 0;

                this.log('capability: ' + capabilityId);
                this.log('topic: ' + topic);
                this.log('value: ' + payload);

                this.messageQueue.add(topic, payload, { qos, retain: retain !== false });

                process.nextTick(async () => {
                    await delay(100);
                    this.thisDeviceChanged.trigger(this, {}, capabilities) // Fire and forget
                        .catch(this.error);
                });

                let tokens = {
                    'device': this.getName(),
                    'variable': capabilityId,
                    'value': '' + value
                };
                this.someDeviceChanged.trigger(tokens) // Fire and forget
                    .catch(this.error);
            }

            return Promise.resolve();
        }, 500);
    }

    onDeleted() {
        this._deleted = true;

        if (this._messageHandler) {
            // TODO: Unregister topics
            this.mqttClient.onMessage.unsubscribe(this.messageHandler);
            delete this._messageHandler;
        }
    }
}

module.exports = MQTTDevice;