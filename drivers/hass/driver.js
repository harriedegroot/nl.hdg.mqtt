'use strict';

const Homey = require('homey');
const MQTTClient = require('../../mqtt/MQTTClient');
const MQTTDevice = require('../device/device');
const HomeyLib = require('homey-lib');
const CAPABILITIES = HomeyLib.getCapabilities();
const CAPABILITY_IDS = Object.keys(CAPABILITIES);
const DEVICE_CLASSES = HomeyLib.getDeviceClasses();
const MQTT_REFERENCE = "nl.hdg.mqtt.hass.discovery";

// DeviceClass => Capabilities
const ALIASSES = {
    motion: ['tamper'],
    door: ['contact'],
    gas: ['co', 'co2'],
    smoke: ['pm25'],
    moisture: ['water'],
    humidity: ['water']
}

const DEFAULT_CAPABILITIES = ['measure_text', 'measure_numeric', 'measure_binary'];

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function trim(s, c) {
    if (c === "]") c = "\\]";
    if (c === "\\") c = "\\\\";
    return s.replace(new RegExp("^[" + c + "]+|[" + c + "]+$", "g"), "");
}

class MQTTHomeAssistantDiscovery extends Homey.Driver {

	onInit() {
        this.log('MQTT Driver is initialized');
        this._map = new Map();

        // Add id property to all device classes & capabilities
        Object.keys(DEVICE_CLASSES).forEach(id => DEVICE_CLASSES[id].id = id);
        Object.keys(CAPABILITIES).forEach(id => CAPABILITIES[id].id = id);

        // init mqtt
        this.mqttClient = new MQTTClient(this.homey, MQTT_REFERENCE);
        this._messageHandler = this.onMessage.bind(this);
        this.mqttClient.onMessage.subscribe(this._messageHandler);
    }

    // TODO: language
    get language() {
        return 'en';
    }

    onMapDeviceClass(device) {
        return MQTTDevice; // NOTE: Always create an MQTT Device
    }

    async onPair(session) {

        session.setHandler('log', async (msg) => {
            this.log(msg);
            return "ok";
        });

        session.setHandler('deviceClasses', async (data) => {
            return { ...DEVICE_CLASSES };
        });

        session.setHandler('capabilities', async (data) => {
            return { ...CAPABILITIES };
        });

        session.setHandler('discover', async ({ topic }) => {
            this._session = session;
            this.log('discover');
            await this.discover(topic);
            session.showView('discover');
            return 'ok';
        });

        session.setHandler('create', (config) => {
            if (config) {
                return this.createDevice(config);
            } else {
                throw new Error('Invalid config');
            }
        });

        session.setHandler('disconnect', async () => {
            this.log("User aborted or pairing is finished");
            await this.stop();
        });
    }

    async discover(topic) {
        this._running = true;
        this._finished = false;
        topic = trim(trim(topic || '', '#'), '/'); // NOTE: remove '/#'
        const rootTopic = `${topic}/`; // NOTE: force tailing /
        
        // release any previous topic subscriptions
        await this.mqttClient.release();

        if (!topic) return;
        
        this._discoveryTopic = topic.endsWith('/config') ? topic : `${topic}/+/+/config`; // listen to all config messages within root topic;
        this._rootTopic = rootTopic;

        try {
            if (!this.mqttClient.isRegistered()) {
                this.log("Connect MQTT Client");
                await this.mqttClient.connect();
            }

            if (this.mqttClient.isRegistered()) {
                this.log('start discovery');
                await this.mqttClient.subscribe(this._discoveryTopic);
            } else {
                this.log("Waiting for MQTT Client...");
                this.mqttClient.onRegistered.subscribe(async () => await this.mqttClient.subscribe(this._discoveryTopic));
            }
        } catch (e) {
            this.log('Failed to start Home Assistant dicovery');
            this.log(e);
        }
    }

    detected(deviceName) {
        if (deviceName && this._session) {
            this._session.emit('detected', deviceName);
        }
    }

    async onMessage(topic, message) {
        if(!this._session) return;
        if (!topic || !this._rootTopic || !this._running) return;
        if (!topic.startsWith(this._rootTopic) || !topic.endsWith('config')) return;

        this.log('on HomeAssistant Discovery Message: ' + topic);
        const type = topic.split('/').slice(-3, -2)[0]; // root/type/device/config
        const config = typeof message === 'string' ? JSON.parse(message) : message;
        const icon = this.getIcon(type);
        config.id = config.id || config.unique_id || config.uniq_id;
        config.properties = this.getProperties(type, config);

        if(type && config) {
            try {
                const deviceClass = this.getDeviceClass(type);
                this._session.emit('device', { type, config, deviceClass, icon });
            } catch (e) {
                this.log(e);
            }
        }
    }

    getDeviceClass(type) {
        switch(type) {
            case 'light':
                return 'light';
            case 'switch':
                return 'socket';
            case 'sensor':
            case 'binary_sensor':
                return 'sensor';
            default:
                return 'other';
        }
    }

    getIcon(type) {
        switch(type) {
            case 'light':
                return '../../../assets/icons/lightbulb.svg';
            case 'switch':
                return '../../../assets/icons/light-switch.svg';
            case 'sensor':
                return '../../../assets/icons/eye.svg';
            case 'binary_sensor':
                return '../../../assets/icons/check-circle-outline.svg';
            default:
                return '../assets/icon.svg';
        }
    }

    getProperties(type, config) {
        switch(type) {
            case 'light':
                return {
                    state : {name: CAPABILITIES['onoff'].title.en, capabilityId: 'onoff' },
                    brightness: { name: 'Brightness', capabilityId: 'dim' }
                };
            case 'switch':
                return {
                    state : {name: CAPABILITIES['onoff'].title.en, capabilityId: 'onoff' }
                };
            case 'sensor':
                return {
                    state : {
                        name: (config.dev_cla || config.device_class || 'sensor').replace('_', ' '),
                        capabilityId: this.detectSensorCapability(config, 'number')
                    }
                };
            case 'binary_sensor':
                return {
                    state : {
                        name: (config.dev_cla || config.device_class || 'binary sensor').replace('_', ' '),
                        capabilityId: this.detectSensorCapability(config, 'boolean')
                    }
                };
            default:
                return {};
        }
    }

    // NOTE: copy from MQTT Device driver.js
    getSettingsTopics(pairingDevice) {
        if (!pairingDevice || !pairingDevice.settings || !pairingDevice.settings.capabilities) return '';

        // clone
        let topics = JSON.parse(JSON.stringify(pairingDevice.settings.capabilities || {})); 
        for (let id in topics) {
            delete topics[id].capabilityId;
        }
        return JSON.stringify(topics, null, 2);
    }

    createDevice(config) {
        try {
            this.log(`add HomeAssistant Device`);
            this.log(config);

            const capabilities = this.createCapabilities(config);
            if(!capabilities) return null;

            return {
                name: config.deviceName || config.name,
                class: config.deviceClass,
                icon: config.icon,
                data: {
                    //id: config.id || guid(),
                    id: guid(),
                    externalId: config.id,
                    version: 1
                },
                settings: { 
                    percentageScale: 'default',
                    capabilities: capabilities,
                    topics: this.getSettingsTopics(capabilities)
                },
                capabilities: Object.keys(capabilities)
            };

        } catch (e) {
            this.log('Error handeling MQTT home assistant discovery message');
            this.log(e);
        }
    }

    createCapabilities(config){
        switch(config.type) {
            case 'light':
                return this.createLight(config);
            case 'switch':
                return this.createSwitch(config);
            case 'sensor':
                return this.createSensor(config);
            case 'binary_sensor':
                return this.createBinarySensor(config);
            default:
                this.log('HA Device type is not yet supported: ' + type);
                return undefined;
                break;
        }
    }

    getSelectedCapabilityId(config, id) {
        if(!config || !config.properties) return undefined;
        return config.properties[id].capabilityId;
    }

    createLight(config) {
        
        const capabilityId = this.getSelectedCapabilityId(config, 'state') || 'onoff';
        const brightnessCapabilityId = this.getSelectedCapabilityId(config, 'brightness') || 'dim';
        
        const on = config.pl_on || config.payload_on || 'on';
        const off = config.pl_off || config.payload_off || 'off';
        
        let device = {};
        device[capabilityId] = {
            capability: capabilityId,
            stateTopic: config.state_topic,
            commandTopic: config.command_topic,
            valueTemplate: `value == '${on}'`,
            outputTemplate: `value ? '${on}' : '${off}'`,
            //displayName: CAPABILITIES[stateCapabilityId]  // TODO: displayname / translate?
        };

        device[brightnessCapabilityId] = {
            capability: brightnessCapabilityId,
            stateTopic: config.bri_stat_t || config.brightness_state_topic,
            commandTopic: config.bri_cmd_t || config.brightness_command_topic,
            valueTemplate: "value / 255",
            outputTemplate: "round(value * 255)",
            //displayName: CAPABILITIES[brightnessCapabilityId]  // TODO: displayname / translate?
            //displayName: "Brightness" // TODO: displayname / translate?
        };

        return device;

        // TODO: DisplayName
        // TODO: icon
        // TODO: value templates (state_value_template, brightness_value_template)
        // TODO: brightness_scale
        // TODO: temperature (color_temp_state_topic, color_temp_command_topic)
        // TODO: color
    }

    createSwitch(config) {

        const capabilityId = this.getSelectedCapabilityId(config, 'state') || 'onoff';

        const on = config.pl_on || config.payload_on || 'on';
        const off = config.pl_off || config.payload_off || 'off';
        
        let device = {};
        device[capabilityId] = {
            capability: capabilityId,
            stateTopic: config.state_topic,
            commandTopic: config.command_topic,
            valueTemplate: `value == '${on}'`,
            outputTemplate: `value ? '${on}' : '${off}'`,
            //displayName: CAPABILITIES[capabilityId]  // TODO: displayname / translate?
        };

        return device;

        // TODO: DisplayName
        // TODO: icon
        // TODO: value templates (state_value_template, brightness_value_template)
    }
    
    createSensor(config) {

        let capabilityId = this.getSelectedCapabilityId(config, 'state') || this.this.detectSensorCapability(config, 'number');
        
        let device = {};
        device[capabilityId] = {
            capability: capabilityId,
            stateTopic: config.state_topic,
            //displayName: CAPABILITIES[capabilityId]  // TODO: displayname / translate?
        };

        if(DEFAULT_CAPABILITIES.includes(capabilityId) && config.name) {
            device[capabilityId].displayName = config.name;
        }

        return device;

        // TODO: DisplayName
        // TODO: value template
    }

    createBinarySensor(config) {
        let capabilityId = this.getSelectedCapabilityId(config, 'state') || this.this.detectSensorCapability(config, 'boolean') || 'onoff';
        
        const on = config.pl_on || config.payload_on || 'on';
        
        let device = {};
        device[capabilityId] = {
            capability: capabilityId,
            stateTopic: config.state_topic,
            valueTemplate: `value == '${on}'`
            //displayName: CAPABILITIES[capabilityId]  // TODO: displayname / translate?
        };

        if(DEFAULT_CAPABILITIES.includes(capabilityId) && config.name) {
            device[capabilityId].displayName = config.name;
        }

        return device;

        // TODO: DisplayName
        // TODO: value template
    }

    detectSensorCapability(config, type) {
        const deviceClass = config.dev_cla || config.device_class;
        const unit = config.unit_of_meas || config.unit_of_measurement;
        return this._matchSensorCapability(deviceClass, type, unit);
    }

    _matchSensorCapability(deviceClass, type, unit) {
        if (!type || !deviceClass) return undefined;

        unit = unit ? unit.toLowerCase() : undefined;

        // match by device class name
        let capabilities = CAPABILITY_IDS.filter(id => id.includes(deviceClass));
        // include aliasses
        if(ALIASSES[deviceClass]) {
            for(let alias in ALIASSES[deviceClass]) {
                for(let capabilityId in CAPABILITY_IDS.filter(id => id.includes(alias))){
                    if(!capabilities.includes(capabilityId)) {
                        capabilities.push(capabilityId);
                    }
                }
            }
        }
        
        let matches = this._filterSensorCapabilities(capabilities, type, unit);
        if(matches.length > 0) return matches[0];

        // match by unit
        if(unit) {
            capabilities = CAPABILITY_IDS.filter(id => CAPABILITIES[id].units && (CAPABILITIES[id].units.en || '').toLowerCase() === unit);
            matches = this._filterSensorCapabilities(capabilities, type);
            if(matches.length > 0) return matches[0];
        }

        // fallback: measure_binary, measure_text, measure_numeric
        switch(type) {
            case 'number': return 'measure_numeric';
            case 'boolean': return 'measure_binary';
            default: return 'measure_text';
        }
    }

    _filterSensorCapabilities(capabilities, type, unit) {
        // filter by type
        var matches = capabilities.filter(id => CAPABILITIES[id].type === type);
        if(matches.length === 1) return matches;
        if(matches.length > 1) capabilities = matches;

        // filter read-only capabilities
        matches = capabilities.filter(id => !CAPABILITIES[id].setable);
        if(matches.length === 1) return matches;
        if(matches.length > 1) capabilities = matches;

        // filter by uiComponent 'sensor'
        matches = capabilities.filter(id => CAPABILITIES[id].uiComponent === 'sensor');
        if(matches.length === 1) return matches;
        if(matches.length > 1) capabilities = matches;

        // filter by unit
        if(unit) {
            matches = capabilities.filter(id => CAPABILITIES[id].units && CAPABILITIES[id].units.en.toLowerCase() === unit);
            if(matches.length === 1) return matches;    
            if(matches.length > 1) capabilities = matches;
        }

        // filter prevered 
        if(capabilities.length > 0) {
            switch(type){
                case 'boolean': // prever 'alarm_' types for boolean
                    capabilities = capabilities.filter(id => id.startsWith('alarm_'));
                default: // prever 'measure_' capabilities
                    capabilities = capabilities.filter(id => id.startsWith('measure_'));
            }
        }

        return capabilities;
    }

    async stop() {
        delete this._running;
        delete this._discoveryTopic;
        delete this._rootTopic;

        await this.mqttClient.release(); // unsubscribe
    }
}

module.exports = MQTTHomeAssistantDiscovery;