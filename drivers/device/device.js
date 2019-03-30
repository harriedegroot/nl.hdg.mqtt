'use strict';

const Homey = require('homey');
const delay = require('../../delay');
const MQTTClient = require('../../mqtt/MQTTClient');
const MessageQueue = require('../../mqtt/MessageQueue');
const TopicsRegistry = require('../../mqtt/TopicsRegistry');

const HomeyLib = require('homey-lib');
const CAPABILITIES = HomeyLib.getCapabilities();
const DEVICE_CLASSES = HomeyLib.getDeviceClasses();

class MQTTDevice extends Homey.Device {

	async onInit() {
        this.log('Initializing MQTT Device...');

        this.onSettings(null, super.getSettings(), []);

        await this.initMQTT();
        await this.subscribeToTopics();

        this.registerDeviceChanges();
       
        this.log('MQTTDevice is initialized');
    }

    onSettings(oldSettingsObj, newSettingsObj, changedKeysArr) {
        const settings = newSettingsObj || {};

        this.log("Read settings:");
        this.log(JSON.stringify(settings, null, 2));

        this._topics = new Map();

        // TODO: Multiple capabilities
        this._capabilities = settings.capabilities;
        this.percentageScale = settings.percentageScale !== false;

        for (let capabilityId in this._capabilities) {
            const stateTopic = this._capabilities[capabilityId].stateTopic;
            if (stateTopic) {
                this._topics.set(stateTopic, capabilityId);
            }
        }
    }

    async initMQTT() {
        this.log("Init MQTT");
        this.mqttClient = new MQTTClient();
        this._messageHandler = this.onMessage.bind(this);
        this.mqttClient.onMessage.subscribe(this._messageHandler);

        this.messageQueue = new MessageQueue(this.mqttClient);
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
            // TODO: Multiple capabilities
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

            const value = this.parseValue(message, capability);
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
                const payload = this.formatValue(value, CAPABILITIES[capabilityId]);
                const retain = true;
                const qos = 0;

                this.log('capability: ' + capabilityId);
                this.log('topic: ' + topic);
                this.log('value: ' + payload);

                this.messageQueue.add(topic, payload, { qos, retain: retain !== false });

                // TODO: Flow cards
                //process.nextTick(async () => {
                //    await delay(100);
                //    this.DeviceChanged.trigger(this, {}, capabilities)
                //        .catch(this.error);
                //});

                //let tokens = {
                //    'device': this.getName(),
                //    'variable': capability,
                //    'value': '' + value
                //}
                //aVirtualDeviceChanged.trigger(tokens) // Fire and forget
                //    .catch(this.error)
            }

            return Promise.resolve();
        }, 500);
    }

   
    formatValue(value, capability) {
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }

        if (capability.units === '%') {
            switch (this.percentageScale) {
                case 'int':
                    if (capability.min === 0 && capability.max === 1)
                        return value * 100;
                    break;
                case 'float':
                    if (capability.min === 0 && capability.max === 100)
                        return value / 100;
                    break;
                case 'default':
                default:
                    // nothing
                    break;
            }
        }

        return value;
    }

    parseValue(value, capability) {

        // Handle percentage scaling
        if (capability && capability.units === '%') {
            switch (this.percentageScale) {
                case 'int':
                    if (capability.min === 0 && capability.max === 1)
                        return this.parseValue(value, 'integer') / 100.0;
                    break;
                case 'float':
                    if (capability.min === 0 && capability.max === 100)
                        return round(this.parseValue(value, 'float') * 100, 0, 100);
                    break;
                case 'default':
                default:
                    // nothing
                    break;
            }
        }

        // by data type
        switch (capability.dataType) {
            case 'boolean':
                if (typeof value === 'string') {
                    value = value.toLowerCase();
                }
                return value === true || value === 'true' || value === 1 || value === '1' || value === 'on' || value === 'yes';
            case 'number':
            case 'float':
                value = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) || 0 : 0;
                return capability.decimals >= 0 ? decimals(value, capability.decimals) : value;
            case 'integer':
                return typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value) || 0 : 0;
            case 'string':
                return value ? value.toString() : undefined;
            case 'enum':
            case 'color':
            default:
                switch (typeof value) {
                    case 'boolean':
                    case 'number':
                        return value;
                    default:
                        let numeric = Number(value);
                        return isNaN(numeric) ? value : numeric;
                }
        }
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