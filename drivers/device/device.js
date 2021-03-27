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

        this.onSettings({oldSettings:null, newSettings:super.getSettings(), changedKeys:[]});

        this.thisDeviceChanged = this.homey.flow.getDeviceTriggerCard('change');
        this.someDeviceChanged = this.homey.flow.getTriggerCard('device_changed');

        await this.initMQTT();
        await this.subscribeToTopics();

        this.registerDeviceChanges();
       
        this.log('MQTTDevice is initialized');
    }

    async onSettings({oldSettings, newSettings, changedKeys}) {
        const settings = newSettings || {};

        this.log("Read settings:");
        this.log(JSON.stringify(settings, null, 2));

        this.percentageScale = settings.percentageScale || 'int';
        this.onOffValues = settings.onOffValues || 'bool';

        const capabilities = settings.topics ? JSON.parse(settings.topics) : null;
        this._capabilities = capabilities;

        // Modified topics?
        if (changedKeys && changedKeys.includes('topics') && settings.topics) {
            try {
                await this.unsubscribeFromTopics();
                await this._updateCapabilities(capabilities);
                this.initTopics();
                await this.subscribeToTopics();
                await this.broadcast();
            } catch(e) {
                // probably invalid JSON
                this.log("failed to update MQTT Device topics", e);
                this.restoreSettingsTopics(settings);
                this.initTopics();
            }
        } else {
            this.initTopics();
        }
    }

    initTopics() {
        // Link state topics to capabilities
        this._topics = new Map();
        if(this._capabilities && typeof capabilities === 'object') {
            for (let capabilityId in this._capabilities) {
                const stateTopic = this._capabilities[capabilityId].stateTopic;
                if (stateTopic) {
                    this._topics.set(stateTopic, capabilityId);
                }
            }
        }
    }

    async _updateCapabilities(capabilities) {
        const oldIds = new Set(this.getCapabilities());
        const newIds = new Set(Object.keys(capabilities));

        for(let oldId of oldIds) {
            if(!newIds.has(oldId)) {
                await this.removeCapability(oldId);
            }
        }

        for (let newId of newIds) {
            if(!oldIds.has(newId)) {
                await this.addCapability(newId);
            } 
            await this.setCapabilityOptions(newId, capabilities[newId]);
        }
    }

    async broadcast() {
        const capabilities = this.getCapabilities();
        for(let capabilityId of capabilities){
            const value = await this.getCapabilityValue(capabilityId);
            await this._publishMessage(capabilityId, value);
        }
    }

    removeIds(capabilities) {
        if (!capabilities) return;
        for (let id in capabilities) {
            delete capabilities[id].capability;
        }
    }

    restoreSettingsTopics(settings) {
        settings.topics = settings.capabilities
            ? JSON.stringify(this.removeIds({ ...settings.capabilities }), null, 2)
            : '';

        try {
            const capabilities = settings.topics ? JSON.parse(settings.topics) : null;
            this._capabilities = capabilities;
        } catch(e) {
            this.log("Failed to restore settings topics");
        }
        
        // Fire & forget (wait 31 sec. to pass the settings timeout)
        // NOTE: This doesn't seem work...
        //setTimeout(() => {
        //    this.setSettings(settings).catch(error => this.log(error));
        //}, 31000);
    }

    async initMQTT() {
        this.log("Init MQTT");

        if (!STATIC.mqttClient) {
            STATIC.mqttClient = new MQTTClient(this.homey);
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

    async unsubscribeFromTopics() {
        if(this._topics) {
            for (let topic of this._topics.keys()) {
                this.log('Unsubscribe from MQTT Device topic: ' + topic);
                await this.mqttClient.unsubscribe(topic);
            }
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
            const currentValue = await this.getCapabilityValue(capabilityId);
            if(value !== currentValue) {
                await this.setCapabilityValue(capabilityId, value);
                await this._publishMessage(capabilityId, value);
            }
        } catch (e) {
            this.log('Error handeling MQTT device message');
            this.log(e);
        }
    }

    registerDeviceChanges() {
        this.registerMultipleCapabilityListener(this.getCapabilities(), async (capabilities, options) => {
            this.log(this.getName() + ' -> Capability changed: ' + JSON.stringify(capabilities, null, 2));

            for (var capabilityId in capabilities) {
                await this._publishMessage(capabilityId, capabilities[capabilityId], capabilities);
            }

            return Promise.resolve();
        }, 500);
    }

    async _publishMessage(capabilityId, value, capabilities){
        if(!this._capabilities) {
            this.log('No MQTT Device capabilities configured');
            return;
        }
        const config = this._capabilities[capabilityId];
        if (!config) {
            this.log('Capability config not found: ' + capabilityId);
            return;
        }

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
            capabilities = capabilities || this.getCapabilities();
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