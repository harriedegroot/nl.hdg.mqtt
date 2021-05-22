'use strict';

const Homey = require('homey');
const MQTTClient = require('../../mqtt/MQTTClient');
const MQTTDevice = require('../device/device');
const HomeyLib = require('homey-lib');
const HOMEY_CAPABILITIES = HomeyLib.getCapabilities();
const APP_CAPABILITIES = require('../../capabilities');
const CAPABILITIES = { ...APP_CAPABILITIES, ...HOMEY_CAPABILITIES };
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
            session.showView('discover');
            await this.discover(topic);
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
        this._devices = {};

        topic = trim(trim(topic || '', '#'), '/'); // NOTE: remove '/#'
        const rootTopic = `${topic}/`; // NOTE: force tailing /
        
        // release any previous topic subscriptions
        await this.mqttClient.release();

        if (!topic) return;
        
        this._rootTopic = rootTopic;
        let discoveryTopics = topic.endsWith('/config') 
            ? [topic] 
            : [`${topic}/+/+/config`, `${topic}/+/+/+/config`];

        try {
            if (!this.mqttClient.isRegistered()) {
                this.log("Connect MQTT Client");
                await this.mqttClient.connect();
            }

            if (this.mqttClient.isRegistered()) {
                this.log('start discovery');
                for(let topic of discoveryTopics) {
                    await this.mqttClient.subscribe(topic);
                }
            } else {
                this.log("Waiting for MQTT Client...");
                this.mqttClient.onRegistered.subscribe(async () => {
                    for(let topic of discoveryTopics) {
                        await this.mqttClient.subscribe(topic);
                    }
                });
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

    getDeviceId(config) {
        if(!config) return undefined;
        if(config.device && config.device.identifiers) {
            return Array.isArray(config.device.identifiers) 
                ? config.device.identifiers[0]
                : config.device.identifiers;
        }

        return config.id || config.unique_id || config.uniq_id;
    }

    async onMessage(topic, message) {
        if (!this._session) return;
        if (!topic || !this._rootTopic || !this._running) return;
        if (!message) return;
        if (!topic.startsWith(this._rootTopic) || !topic.endsWith('config')) return;

        const type = topic.replace(this._rootTopic, '').split('/')[0];
        if(!type) return;

        this.log('on HomeAssistant Discovery Message: ' + topic);
        
        try {
            const config = typeof message === 'string' ? JSON.parse(message) : message;
            if(!config || typeof config !== 'object') return;

            const deviceId = this.getDeviceId(config);
            const deviceName = config.device && config.device.name ? config.device.name : config.name;
            const properties = this.createProperties(type, config) || [];
            
            // Remove device name from property names
            if(deviceName && properties) {
                for(let property of properties) {
                    property.name = (property.name || "").replace(deviceName, "").replace(/[\W_]+/g," ").trim();
                    if(!property.name) {
                        property.name = CAPABILITIES[property.capability].title.en;
                    }
                }
            }

            var device = this._devices[deviceId];
            if(!device) {
                device = {
                    id: deviceId,
                    type: type,
                    name: deviceName,
                    deviceClass: this.getDeviceClass(type),
                    icon: this.getIcon(type),
                    properties: properties
                }
                this._devices[deviceId] = device;
            } else { // merge with existing device
                device = { ...device }; // clone
                this._devices[deviceId] = device;

                if(['light', 'cover'].includes(type)) {
                    device.type = type;
                } else if(['sensor', 'binary_sensor'].includes(device.type)) {
                    device.type = type;
                }
                device.deviceClass = device.deviceClass || this.getDeviceClass(device.type);
                device.icon = device.icon || this.getIcon(device.type);
                device.name = device.name || deviceName;

                for(let property of properties) {
                    if(!device.properties.some(p => p.id == property.id)) {
                        device.properties.push(property);
                    }
                }
            }

            this._session.emit('device', device);
        } catch (e) {
            this.log(e);
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

    createDevice(config) {
        try {
            this.log(`create HomeAssistant Device`);
            this.log(config);

            const capabilities = this.parseCapabilities(config.properties);

            let device = {
                name: config.deviceName || config.name,
                class: config.deviceClass,
                icon: config.icon,
                data: {
                    id: guid(),
                    externalId: config.id,
                    version: 1
                },
                settings: { 
                    percentageScale: 'default',
                    capabilities: capabilities,
                },
                capabilities: Object.keys(capabilities),
                capabilitiesOptions: {}
            };

            for(let property of config.properties) {
                if(property.displayName) {
                    device.capabilitiesOptions[property.capabilityId] = {
                        title: property.displayName
                    };
                }
            }

            return device;

        } catch (e) {
            this.log('Error handeling MQTT home assistant discovery message');
            this.log(e);
        }
    }

    parseCapabilities(properties) {
        if(!properties) return null;
        var capabilities = {};
        for(let property of properties) {
            let idx = 0;
            let capabilityId = property.capabilityId;
            while(capabilities[property.capabilityId]) {
                property.capabilityId = `${capabilityId}.${++idx}`;
            }
            capabilities[property.capabilityId] = {
                capability: property.capabilityId,
                stateTopic: property.stateTopic,
                commandTopic: property.commandTopic,
                valueTemplate: property.valueTemplate,
                outputTemplate: property.outputTemplate,
                displayName: property.displayName,
            }
        }
        return capabilities;
    }

    createProperties(type, config){
        if(!config) return null;
        switch(type) {
            case 'light':
                return this.createLight(type, config);
            case 'switch':
                return this.createSwitch(type, config);
            case 'sensor':
                return this.createSensor(type, config);
            case 'binary_sensor':
                return this.createBinarySensor(type, config);
            default:
                this.log('HA Device type is not yet supported: ' + type);
                return null;
        }
    }

    createLight(type, config) {
        
        const on = config.pl_on || config.payload_on || 'on';
        const off = config.pl_off || config.payload_off || 'off';
        
        return [{
                id: `${config.unique_id || config.uniq_id}_onoff`,
                type: type,
                config: config,
                capability: 'onoff',
                name: config.device && config.name ? config.name : CAPABILITIES['onoff'].title.en,
                stateTopic: config.state_topic,
                commandTopic: config.command_topic,
                valueTemplate: `value == '${on}'`,
                outputTemplate: `value ? '${on}' : '${off}'`,
            }, {
                id: `${config.unique_id || config.uniq_id}_dim`,
                type: type,
                config: config,
                capability: 'dim',
                name: config.device && config.name ? config.name : CAPABILITIES['dim'].title.en,
                stateTopic: config.bri_stat_t || config.brightness_state_topic,
                commandTopic: config.bri_cmd_t || config.brightness_command_topic,
                valueTemplate: "value / 255",
                outputTemplate: "round(value * 255)",
            }
        ];

        // TODO: value templates (state_value_template, brightness_value_template)
        // TODO: brightness_scale
        // TODO: temperature (color_temp_state_topic, color_temp_command_topic)
        // TODO: color
    }

    createSwitch(type, config) {

        const on = config.pl_on || config.payload_on || 'on';
        const off = config.pl_off || config.payload_off || 'off';

        return [{
            id: config.unique_id || config.uniq_id,
            type: type,
            config: config,
            capability: 'onoff',
            name: config.device && config.name ? config.name : CAPABILITIES['onoff'].title.en,
            stateTopic: config.state_topic,
            commandTopic: config.command_topic,
            valueTemplate: `value == '${on}'`,
            outputTemplate: `value ? '${on}' : '${off}'`,
        }];

        // TODO: value templates (state_value_template, brightness_value_template)
    }
    
    createSensor(type, config) {

        const capabilityId = this.detectSensorCapability(type, config, 'number');
        const entity = {
            id: config.unique_id || config.uniq_id,
            type: type,
            config: config,
            capability: capabilityId,
            name: config.device ? config.name : (config.dev_cla || config.device_class || 'sensor').replace('_', ' '),
            unit: config.unit_of_meas || config.unit_of_measurement,
            stateTopic: config.state_topic,
        };

        // if(config.name && (!entity.displayName || DEFAULT_CAPABILITIES.includes(capabilityId))) {
        //     entity.displayName = config.name;
        // }

        return [entity];

        // TODO: value template
    }

    createBinarySensor(type, config) {
        const capabilityId = this.detectSensorCapability(type, config, 'boolean') || 'onoff';
        const on = config.pl_on || config.payload_on || 'on';
        
        let entity = {};
        entity = {
            id: config.unique_id || config.uniq_id,
            type: type,
            config: config,
            capability: capabilityId,
            name: config.device ? config.name : (config.dev_cla || config.device_class || 'binary sensor').replace('_', ' '),
            unit: config.unit_of_meas || config.unit_of_measurement,
            stateTopic: config.state_topic,
            valueTemplate: `value == '${on}'`
        };

        // if(config.name && (!entity.displayName || DEFAULT_CAPABILITIES.includes(capabilityId))) {
        //     entity.displayName = config.name;
        // }

        return [entity];

        // TODO: value template
    }

    detectSensorCapability(type, config) {
        const deviceClass = config.dev_cla || config.device_class;
        const unit = config.unit_of_meas || config.unit_of_measurement;
        let capabilities = this._matchSensorCapabilities(deviceClass, type, unit);

        if(capabilities.length == 0) return undefined;
        if(capabilities.length == 1) return capabilities[0];
        
        // match by sate topic (sensor name)
        if(config.state_topic) {
            let parts = (config.state_topic || '').split('/');
            let sensorName = parts[parts.length-1];
            if(sensorName) {
                let tags = sensorName.split(/[\s,-_ ]+/);
                const getTags = (capability) => {
                    let s = capability.split('_');
                    if(s.length > 1) s.shift();
                    return s;
                }
                var matches = capabilities.filter(c => getTags(c).some(t => tags.includes(t)));
                if(matches.length > 0) {
                    capabilities = matches;
                }
            }
        }
        return capabilities[0];
    }

    _matchSensorCapabilities(deviceClass, type, unit) {

        unit = unit ? unit.toLowerCase() : undefined;

        let capabilities;
        let matches;

        // match by device class name
        if(deviceClass) {
            capabilities = CAPABILITY_IDS.filter(id => id.includes(deviceClass));
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

            matches = this._filterSensorCapabilities(capabilities, type, unit);
            if(matches.length > 0) return matches;
        }

        // match by unit
        if(unit) {
            capabilities = CAPABILITY_IDS.filter(id => CAPABILITIES[id].units && (CAPABILITIES[id].units.en || '').toLowerCase() === unit);
            matches = this._filterSensorCapabilities(capabilities, type);
            if(matches.length > 0) return matches;
        }

        // fallback: measure_binary, measure_text, measure_numeric
        switch(type) {
            case 'string': 
            case 'enum': 
                return ['measure_text'];
            case 'boolean': 
                return ['measure_binary'];
            case 'number': 
            default:
                return ['measure_numeric'];
        }
    }

    _filterSensorCapabilities(capabilities, type, unit) {
        // filter by type
        var matches = capabilities;
        
        if(type) {
            matches= capabilities.filter(id => CAPABILITIES[id].type === type);
            if(matches.length === 1) return matches;
            if(matches.length > 1) capabilities = matches;
        }

        // filter read-only capabilities
        matches = capabilities.filter(id => !CAPABILITIES[id].setable);
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
                    matches = capabilities.filter(id => id.startsWith('alarm_'));
                    break;
                default: // prever 'measure_' capabilities
                    matches = capabilities.filter(id => id.startsWith('measure_'));
                    break;
            }
        }

        return matches.length > 0 ? matches : capabilities;
    }

    async stop() {
        delete this._running;
        delete this._devices;
        delete this._rootTopic;

        await this.mqttClient.release(); // unsubscribe
    }
}

module.exports = MQTTHomeAssistantDiscovery;