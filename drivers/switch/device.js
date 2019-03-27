'use strict';

const Homey = require('homey');
const delay = require('../../delay');
const { HomeyAPI } = require('athom-api');
const MQTTClient = require('../../mqtt/MQTTClient');
const MessageQueue = require('../../mqtt/MessageQueue');
const TopicsRegistry = require('../../mqtt/TopicsRegistry');

class MQTTSwitchDevice extends Homey.Device {

	async onInit() {
        this.log('Initializing MQTTSwitchDevice...');

        this.log("Fetch Athom api");
        this.api = await HomeyAPI.forCurrentHomey();

        this.log("Init MQTT");
        this.mqttClient = new MQTTClient();
        this.messageQueue = new MessageQueue(this.mqttClient);
        this.topicsRegistry = new TopicsRegistry(this.messageQueue);

        if (!this.mqttClient.isRegistered()) {
            this.log("Connect MQTT Client");
            await this.mqttClient.connect();
        }
        
        this.registerMultipleCapabilityListener(this.getCapabilities(), async (capabilities, options) => {
            this.log(this.getName() + ' -> Capability changed: ' + JSON.stringify(capabilities, null, 2));

            const settings = await this.getSettings();

            for (var capability in capabilities) {

                const value = capabilities[capability];
                const topic = settings.setTopic;
                const payload = this.formatValue(value);
                const retained = true;
                const qos = 0;

                this.log('capability: ' + capability);
                this.log('topic: ' + topic);
                this.log('value: ' + payload);

                if (this.mqttClient.isRegistered()) {
                    this.messageQueue.add(topic, payload, { qos, retained: retained !== false });
                } else {
                    this.log('[SKIP] MQTT Client not registered');
                }

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

        this.log('MQTTSwitchDevice is initialized');
        
	}

    async onSettings(oldSettingsObj, newSettingsObj, changedKeysArr) {
        this._settings = newSettingsObj;
    }
    async getSettings() {
        return this._settings || await super.getSettings();
    }

    formatValue(value, capability) {
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }

        if (capability.units === '%') {
            switch (this.getSettings().percentageScale) {
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
}

module.exports = MQTTSwitchDevice;