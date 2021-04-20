'use strict';

const Homey = require('homey');
const delay = require('../../delay');
const MQTTClient = require('../../mqtt/MQTTClient');
const MQTTDevice = require('../device/device');
const HomeyLib = require('homey-lib');
const CAPABILITIES = HomeyLib.getCapabilities();
const DEVICE_CLASSES = HomeyLib.getDeviceClasses();
const MQTT_REFERENCE = "nl.hdg.mqtt.homie.discovery";

// Mapping of device types to classes
const CLASSES = {
    // TODO: Add additional known mappings
};

// Mapping of properties to capabilities
const PROPERTIES = {
    'brightness': 'dim'
    // TODO: Add additional known property to capability mappings
};

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

function sortByTitle(a, b, lang) {
    lang = lang || 'en';
    let title1 = a.title[lang].trim().toLowerCase();
    let title2 = b.title[lang].trim().toLowerCase();
    return title1 < title2 ? -1 : title1 > title2 ? 1 : 0;
}

function toBool(value) {
    if (typeof value === 'string') {
        value = value.toLowerCase();
    }
    return value === true || value === 'true' || value === 1 || value === '1' || value === 'on' || value === 'yes';
}

class HomieProperty {
    constructor(propertyId) {
        this.id = propertyId;
        this.capability = this.matchCapability(propertyId);
    }
    parse(parts, payload) {
        if (!parts) return;
        const attr = parts.shift();

        switch (attr) {
            case '$name':
                this.name = payload;
                return;
            case '$settable':
                this.settable = toBool(payload);
                return;
            case '$retained':
                this.retained = toBool(payload);
                return;
            case '$unit':
                this.unit = payload;
                return;
            case '$datatype':
                this.datatype = payload;
                return;
            case '$format':
                this.format = payload;
                return;
            default:
                // WARN: Value is not parsed yet
                this.value = payload;   // NOTE: value is submitted on main property topic
        }
    }

    matchCapability(propertyId) {
        if (!propertyId) return undefined;

        const id = propertyId.toLowerCase().replace('-', '_');

        // known property mapping?
        if (PROPERTIES.hasOwnProperty(id))
            return CAPABILITIES[PROPERTIES[id]];

        // exact match?
        if (CAPABILITIES.hasOwnProperty(id))
            return CAPABILITIES[id];

        // match by [measure_ | alarm_ | ..._] capability
        for (let capabilityId in Object.keys(CAPABILITIES)) {
            const parts = capabilityId.split('_');
            if (parts.length > 1) {
                parts.shift();
                if (parts.join('_') === id)
                    return CAPABILITIES[capabilityId];
            }
        }

        // string contains?
        const match = Object.keys(CAPABILITIES).find(c => c.indexOf(id) !== -1);
        if (match)
            return CAPABILITIES[match];

        // TODO: Custom capabilities

        return undefined;
    }
}

class HomieNode {

    constructor(nodeId) {
        this.id = nodeId;
        this.properties = {};
    }

    parse(parts, payload) {
        try {
            if (!parts) return;
            const attr = parts.shift();
            if (!attr) return;

            switch (attr) {
                case '$name':
                    this.name = payload;
                    return;
                case '$type':
                    this.type = payload;
                    this.matchedClass = this.matchClass(payload);
                    return;
                case '$properties':
                    this.propertiesIds = (payload || '').split(',');
                    return;
                case '$array':
                    this.array = payload;
                    return;
                default:
                    this.addProperty(attr, parts, payload);
            }
        } catch (e) {
            this.log("Failed to parse topic for device: " + this.deviceId);
            this.log(e);
        }
    }

    addProperty(propertyId, parts, payload) {
        const property = this.properties[propertyId] || new HomieProperty(propertyId);
        property.parse(parts, payload);
        this.properties[propertyId] = property;
    }

    matchClass(type) {
        if (!type) return undefined;
        return CLASSES[type] || DEVICE_CLASSES.hasOwnProperty(type) ? type : undefined;
    }
}

class MQTTHomieDiscovery extends Homey.Driver {
	
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

        session.setHandler('create', async (config) => {
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

    createDevice(config) {
        const capabilities = {};
        if (config.properties) {
            for (let propertyId in config.properties) {
                const property = config.properties[propertyId];
                if (!property) continue;

                let capabilityId = property.capabilityId;
                if (!capabilityId) continue; // NOTE: No capability selected => skip
                const capability = CAPABILITIES[capabilityId];

                let settings = capabilities[capabilityId];
                if (settings) {
                    capabilityId = `${capabilityId}.${guid()}`; 
                } else {
                    settings = {};
                }

                if (!capability || capability.getable !== false) {
                    settings.stateTopic = `${this._topic}${config.id}/${propertyId}`;
                }
                if ((capability && capability.setable) || property.settable) {
                    settings.setTopic = `${this._topic}${config.id}/${propertyId}/set`;
                }
                capabilities[capabilityId] = settings;
            }
        }

        return {
            name: config.deviceName || config.name,
            class: config.deviceClass,
            data: {
                id: guid(),
                version: 1
            },
            settings: { capabilities },
            capabilities: Object.keys(capabilities)
        };
    }

    async discover(topic) {
        this._running = true;
        this._finished = false;
        topic = trim(trim(topic || '', '#'), '/'); // NOTE: remove '/#'
        let discoveryTopic = `${topic}/#`; // listen to all messages within root topic
        topic = `${topic}/`; // NOTE: force tailing /

        if (!topic || this._topic === topic) return;

        if (this._topic) {
            // TODO: unregister?
        }
        this._topic = topic;

        try {
            if (!this.mqttClient.isRegistered()) {
                this.log("Connect MQTT Client");
                await this.mqttClient.connect();
            }

            if (this.mqttClient.isRegistered()) {
                this.log('start discovery');
                await this.mqttClient.subscribe(discoveryTopic);
            } else {
                this.log("Waiting for MQTT Client...");
                this.mqttClient.onRegistered.subscribe(async () => await this.mqttClient.subscribe(discoveryTopic));
            }
        } catch (e) {
            this.log('Failed to start dicovery');
            this.log(e);
        }
    }

    detected(deviceName) {
        if (deviceName && this._session) {
            this._session.emit('detected', deviceName);
        }
    }

    async onMessage(topic, message) {
        if (!topic || !this._topic || !this._running) return;
        if (!topic.startsWith(this._topic)) return;

        this.log('onHomieMessage: ' + topic);
        const relativeTopic = topic.substring(this._topic.length); // remove root
        const parts = relativeTopic.split('/');

        const part = parts.shift();
        switch (part) {
            case '$homie':
                this.log('Homie device version: ' + message);
                this.detected();
                return; // TODO: Handle $homie message (version); Skip unsupported versions?
            case '$name':
                this.log('Found Homie device: ' + message);
                return;
            case '$state':
                this.log('Homie device state: ' + message);
                if (message !== 'ready') {
                    // TODO: Stop discovery if device not ready
                }
                return;
            case '$nodes':
                this._nodes = (message || '').split(',');
                return;
            case '$localip':
            case '$mac':
            case '$fw':
            case '$extensions':
            case '$implementation':
            case '$stats':
                return;
            default:
                this.addDevice(part, parts, message);
        }

        if (!this._finished && this._nodes && this._nodes.length === this._map.size) {
            this._finished = true;
            await delay(1000); // wait 1 more sec to complete last device
            this.log("All nodes discovered");
            this._session.emit('done', true);

            await this.stop();
        }

        return Promise.resolve();
    }

    addDevice(nodeId, parts, message) {
        try {
            if (!nodeId) return;

            this.log('addHomieDevice: ' + nodeId);
            this.log(message);

            const node = this._map.get(nodeId) || new HomieNode(nodeId);
            node.parse(parts, message);
            this._map.set(nodeId, node);

            if (this._session) {
                try {
                    this._session.emit('device', node);
                } catch (e) {
                    this.log(e);
                }
            }

            return node;
        } catch (e) {
            this.log('Error handeling MQTT homie discovery message');
            this.log(e);
        }
    }

    async stop() {
        delete this._running;
        await this.mqttClient.release(); // unsubscribe
    }
}

module.exports = MQTTHomieDiscovery;