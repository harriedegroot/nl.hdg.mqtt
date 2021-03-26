'use strict';

const Homey = require('homey');
const MQTTClient = require('../../mqtt/MQTTClient');
const HomeyLib = require('homey-lib');
const CAPABILITIES = HomeyLib.getCapabilities();
const DEVICE_CLASSES = HomeyLib.getDeviceClasses();
const { formatValue, parseValue } = require('../../ValueParser');

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function sortByTitle(a, b, lang) {
    lang = lang || 'en';
    let title1 = a.title[lang].trim().toLowerCase();
    let title2 = b.title[lang].trim().toLowerCase();
    return title1 < title2 ? -1 : title1 > title2 ? 1 : 0;
}

function validate(item, value) {
    if (value === null || typeof value === 'undefined')
        throw new ReferenceError(item + ' is null or undefined');
    return value;
}

class MQTTDriver extends Homey.Driver {

    // TODO: Single MessageQueue for all MQTT devices

	onInit() {
        this.log('MQTT Driver is initialized');
        this.client = new MQTTClient(this.homey);
        this.registerFlowCardAction('set_value');
    }

    // TODO: language
    get language() {
        return 'en';
    }

    async onPair(session) {
        
        let edit = undefined;

        let pairingDevice = {
            name: this.homey.__('pair.default.name.device'),
            class: undefined,
            settings: {
                topics: '', // used for device settings; to be able to change topics afterwards
                capabilities: {}
            },
            data: {
                id: guid(),
                version: 1
            },
            capabilities: []
        };

        session.setHandler('log', async (msg) => {
            this.log(msg);
            return "ok";
        });

        session.setHandler('deviceClasses', async (data) => {
            return DEVICE_CLASSES;
        });
        session.setHandler('capabilities', async (data) => {
            // filter already configured capabilities?
            const capabilities = { ...CAPABILITIES };
            if (data && data.filter === true) {
                for (let configured of pairingDevice.capabilities) {
                    delete capabilities[configured];
                }
            }
            return capabilities;
        });

        session.setHandler('capability', async (data) => {
            return edit;
        });

        session.setHandler('addCapability', async (data) => {
            edit = undefined;
            session.showView('capability');    
            return 'ok';
        });

        session.setHandler('editCapability', async (capabilityId) => {
            edit = capabilityId;
            session.showView('capability');
            return 'ok';
        });
        session.setHandler('removeCapability', async (data) => {
            if (data && data.capabilityId) {
                pairingDevice.capabilities = pairingDevice.capabilities.filter(c => c !== data.capabilityId);
                delete pairingDevice.settings.capabilities[data.capabilityId];
            }
            return pairingDevice;
        });

        session.setHandler('set', async (data) => {
            this.log('set: ' + JSON.stringify(data, null, 2));
            for (let key in data) {
                if (pairingDevice.hasOwnProperty(key)) {
                    pairingDevice[key] = data[key];
                } else {
                    pairingDevice.settings[key] = data[key];
                }
            }
            this.log('pairingDevice: ' + JSON.stringify(pairingDevice));
            return pairingDevice;
        });

        session.setHandler('setCapability', async (data) => {
            this.log('setCapability: ' + JSON.stringify(data, null, 2));
            if (data && data.capability) {
                const id = data.capability;
                if (!pairingDevice.capabilities.includes(data.capability)) {
                    pairingDevice.capabilities.push(data.capability);
                }
                const config = pairingDevice.settings.capabilities[id] || {};
                Object.assign(config, data);
                pairingDevice.settings.capabilities[id] = config;
            }

            pairingDevice.settings.topics = this.getSettingsTopics(pairingDevice);

            this.log('pairingDevice: ' + JSON.stringify(pairingDevice));
            return pairingDevice;
        });

        session.setHandler('getPairingDevice', async (data) => {
            return pairingDevice;
        });

        session.setHandler('install', async (data) => {
            const installed = await client.isInstalled();
            if (!installed) {
                throw new Error("MQTT Client app not installed");
            }

            return await this.homey.addDevice(pairingDevice);
        });

        session.setHandler('disconnect', async () => {
            // TODO: Disconnect MQTT client
            this.log("User aborted or pairing is finished");
        });
    }

    getSettingsTopics(pairingDevice) {
        if (!pairingDevice || !pairingDevice.settings || !pairingDevice.settings.capabilities) return '';

        let topics = { ...pairingDevice.settings.capabilities };
        for (let id in topics) {
            delete topics[id].capability;
        }
        return JSON.stringify(topics, null, 2);
    }

    registerFlowCardAction(card_name) {
        let flowCardAction = this.homey.flow.getActionCard(card_name);
        flowCardAction.ma
        flowCardAction
            .registerRunListener((args, state) => {
                try {
                    if (!args || typeof args !== 'object') return;

                    this.log('args:');
                    this.log(args);

                    const device = validate('device', args.device);
                    const capabilityId = validate('capability', args.capability);
                    const rawValue = validate('value', args.value);

                    this.log(device.getName() + ' -> Capability: ' + capabilityId);

                    // TODO: Read percentage scale from device settings
                    const percentageScale = 'int'; //settings.percentageScale || 'int'
                    const value = parseValue(rawValue, CAPABILITIES[capabilityId], percentageScale);

                    this.log(device.getName() + ' -> Value:  ' + value);
                    device.setCapabilityValue(capabilityId, value) // Fire and forget
                        .catch(this.error);

                    // TODO: Also/OR send MQTT message?

                    return Promise.resolve(true);
                }
                catch (error) {
                    this.log('MQTT Device triggered with missing information: ' + error.message);

                    return Promise.reject(error);
                }
            });
    }
}

module.exports = MQTTDriver;