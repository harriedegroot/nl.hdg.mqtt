'use strict';

const Homey = require('homey');
const delay = require('../../delay');
const MQTTClient = require('../../mqtt/MQTTClient');
const MessageQueue = require('../../mqtt/MessageQueue');
const TopicsRegistry = require('../../mqtt/TopicsRegistry');
const { formatValue, parseValue, formatOnOff } = require('../../ValueParser');
const jsonpath = require('jsonpath');
const jsontString = require('json-templater/string');
const jsontObject = require('json-templater/object');

const HomeyLib = require('homey-lib');
const CAPABILITIES = HomeyLib.getCapabilities();
//const DEVICE_CLASSES = HomeyLib.getDeviceClasses();

const  { create, all } = require('mathjs')
const math = create(all);
math.import({
    equal: (a, b) => a === b
  },
  { override: true }
)

const STATIC = {
    mqttClient: null,
    messageQueue: null
};

class MQTTDevice extends Homey.Device {

	async onInit() {
        this.log('Initializing MQTT Device...');

        this.compiled = new Map();
        this.mqttValues = new Map();
        this.id = this.getData().id;

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

        this._compile(); // compile value templates

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

    /**
     * compile mathjs expressions
     */
    _compile() {
        this.compiled.clear();
        if(this._capabilities && typeof this._capabilities === 'object') {
            for (let capabilityId in this._capabilities) {
                const config = this._capabilities[capabilityId];
                if(config) {
                    if(config.valueTemplate && !config.valueTemplate.startsWith('$') && !this.compiled.has(config.valueTemplate)) {
                        try {
                            let compiled = math.compile(config.valueTemplate);
                            if(compiled) {
                                this.compiled.set(config.valueTemplate, compiled);
                            }
                        } catch(e) {
                            this.log(e);
                        }
                    }
                    if(config.outputTemplate && !config.outputTemplate.includes('{{') && !this.compiled.has(config.outputTemplate)) {
                        try {
                            let compiled = math.compile(config.outputTemplate);
                            if(compiled) {
                                this.compiled.set(config.outputTemplate, compiled);
                            }
                        } catch(e) {
                            this.log(e);
                        }
                    }
                }
            }
        }
    }

    initTopics() {
        // Link state topics to capabilities
        this._topics = new Map();
        if(this._capabilities && typeof this._capabilities === 'object') {
            for (let capabilityId in this._capabilities) {
                const stateTopic = this._capabilities[capabilityId].stateTopic;
                if (stateTopic) {
                    let topics = this._topics.get(stateTopic) || [];
                    if(!topics.includes(capabilityId)){
                        topics.push(capabilityId);
                        this._topics.set(stateTopic, topics);
                    }
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
    }
    
    async subscribeToTopics() {
        for (let topic of this._topics.keys()) {
            this.log('Subscribe to MQTT Device topic: ' + topic);
            await this.mqttClient.subscribe(topic, this.id);
        }
    }

    async unsubscribeFromTopics() {
        if(this._topics) {
            for (let topic of this._topics.keys()) {
                this.log('Unsubscribe from MQTT Device topic: ' + topic);
                try {
                    await this.mqttClient.unsubscribe(topic, this.id);
                } catch(e) {
                    this.log("Failed to unsubscribe from MQTT Device topic", e);
                }
            }
        }
    }

    _parseMessageData(msg) {
        switch(typeof msg)
        {
            case 'object':
                return msg;
            case 'string':
                try {
                    let data = JSON.parse(msg);
                    return typeof data === 'object' ? data : { value: data };
                } catch {
                    return { value: msg }
                }
            default:
                return { value: msg }
        }
    }

    async _updateCapabilityFromMessage(capabilityId, message) {
        try {
            const id = capabilityId.split('.')[0];
            const capability = CAPABILITIES[id];
            if (!capability) {
                this.log('capability not found for topic');
                return;
            }

            // value template?
            if(this._capabilities) {
                const config = this._capabilities[capabilityId];
                if(config) {
                    let template = (config.valueTemplate || config.jsonPath || '').trim();
                    if(template) {
                        try {
                            const data = this._parseMessageData(message);
                            const mathjs = this.compiled.get(template);
                            const result = mathjs
                                ? mathjs.evaluate(data)  // mathJS
                                : jsonpath.query(data, template); // jsonPath
                            message = Array.isArray(result) ? result[0] : result;
                        } catch(e) {
                            this.log("failed to parse & query json message", e);
                        }
                    }
                }
            }
            
            const value = parseValue(message, capability, this.percentageScale);
            const currentValue = await this.getCapabilityValue(capabilityId);
            if(value !== currentValue) {
                // keep track of values changed from an mqtt message on the state topic
                this.mqttValues.set(capabilityId, value);

                // update device
                await this.setCapabilityValue(capabilityId, value);
            }
        } catch (e) {
            this.log('Error handeling MQTT device message');
            this.log(e);
        }
    }

    async onMessage(topic, message) {
        if (this._deleted) return;

        try {
            const capabilityIds = this._topics.get(topic);
            if (!capabilityIds || capabilityIds.length==0) return;

            this.log('MQTTDevice.onMessage');
            this.log(topic + ': ' + (typeof message === 'object' ? JSON.stringify(message, null, 2) : message));

            for(let capabilityId of capabilityIds) {
                await this._updateCapabilityFromMessage(capabilityId, message);
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
                const value = capabilities[capabilityId];

                // Skip if the value was set by an mqtt messate on the state topic
                const fromMqtt = this.mqttValues.has(capabilityId) && this.mqttValues.get(capabilityId) === value;
                this.mqttValues.delete(capabilityId);
                if(fromMqtt) {
                    this.log("[SKIP] Value updated from mqtt (state topic), don't publish state change to set topic");
                    continue;
                } 

                // publish state on the 'set' topic
                await this._publishMessage(capabilityId, value, capabilities);
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
        let payload = capabilityId === 'onoff'
            ? (config.outputTemplate ? value : formatOnOff(value, this.onOffValues))
            : formatValue(value, CAPABILITIES[capabilityId], this.percentageScale);

        // output template?
        if(config.outputTemplate && config.outputTemplate.replace("{{", "").replace("}}", "").trim() !== 'value') {
            const template = config.outputTemplate;
            try {
                let state = this.getState() || {};
                state.value = payload;
                const mathjs = this.compiled.get(template);
                if(mathjs) { // math?
                    payload = mathjs.evaluate(state);
                } else { // json-t
                    if(!template.startsWith('{{') && (template.startsWith('{') || template.startsWith('['))) {
                        payload = jsontObject(template, state);
                    } else {
                        payload = jsontString(template, state);
                    }
                }
                
            } catch(e) {
                this.log("failed to format output message", e);
            }
        }

        const retain = true;
        const qos = 0;

        this.log('capability: ' + capabilityId);
        this.log('topic: ' + topic);
        this.log('value: ' + payload);

        this.messageQueue.add(topic, payload, { qos, retain: retain !== false });

        process.nextTick(async () => {
            await delay(100);
            capabilities = capabilities || this.getCapabilities();
            try {
                await this.thisDeviceChanged.trigger(this, {}, capabilities);
            } catch(e) {
                this.error(e);
            }
        });

        let tokens = {
            'device': this.getName(),
            'variable': capabilityId,
            'value': '' + value
        };
        try {
            await this.someDeviceChanged.trigger(tokens);
        } catch(e) {
            this.error(e);
        }
    }

    async onDeleted() {
        this._deleted = true;

        this.driver.tryRemoveIcon(this.id);

        if (this._messageHandler) {
            this.mqttClient.onMessage.unsubscribe(this.messageHandler);
            delete this._messageHandler;

            try {
                await this.mqttClient.release(this.id);
            } catch(e) {
                this.log("Failed to relase subscribed topics for MQTT Device", e);
            }
        }
    }
}

module.exports = MQTTDevice;