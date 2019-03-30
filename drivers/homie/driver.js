'use strict';

const Homey = require('homey');
const delay = require('../../delay');
const MQTTClient = require('../../mqtt/MQTTClient');
const MQTTDevice = require('../device/device');
const HomeyLib = require('homey-lib');
const CAPABILITIES = HomeyLib.getCapabilities();

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
        switch (id) {
            case 'brightness':
                return 'dim';
            default:
                return CAPABILITIES[id];
        }

        // TODO: Custom capabilities
        // TODO: Extend capability matching
    }
}

class HomieNode {

    constructor(nodeId) {
        this.id = nodeId;
        this.properties = new Map();
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
            console.log("Failed to parse topic for device: " + this.deviceId);
            console.log(e);
        }
    }

    addProperty(propertyId, parts, payload) {
        const property = this.properties.get(propertyId) || new HomieProperty(propertyId);
        property.parse(parts, payload);
        this.properties.set(propertyId, property);
    }
}

class MQTTHomieDiscovery extends Homey.Driver {
	
	onInit() {
        this.log('MQTT Driver is initialized');
        this._map = new Map();
        this.mqttClient = new MQTTClient();
        this._messageHandler = this.onMessage.bind(this);
        this.mqttClient.onMessage.subscribe(this._messageHandler);
    }

    // Homey.showLoadingOverlay()
    // Homey.hideLoadingOverlay()

    // TODO: language
    get language() {
        return 'en';
    }

    onMapDeviceClass(device) {
        return MQTTDevice; // NOTE: Always create an MQTT Device
    }

    async onPair(socket) {
        let pairingDevice = {
            name: Homey.__('pair.default.name.device'),
            class: undefined,
            settings: {
                capabilities: {}
            },
            data: {
                id: guid(),
                version: 1
            },
            capabilities: []
        };

        socket.on('log', function (msg, callback) {
            console.log(msg);
            callback(null, "ok");
        });

        socket.on('discover', ({ topic }, callback) => {
            console.log('discover');
            this.discover(topic)
                .then(() => {
                    callback(null, 'ok');
                    socket.showView('discover');
                })
                .catch(error => callback('failed to start discovery'));
        });

        socket.on('disconnect', function () {
            // TODO: Disconnect MQTT client
            console.log("User aborted or pairing is finished");
        });
    }

    async discover(topic) {
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

    async onMessage(topic, message) {
        if (!topic || !this._topic) return;
        if (!topic.startsWith(this._topic)) return;

        this.log('onHomieMessage: ' + topic);
        const relativeTopic = topic.substring(this._topic.length); // remove root
        const parts = relativeTopic.split('/');

        const part = parts.shift();
        switch (part) {
            case '$homie':
                this.log('Homie device version: ' + message);
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

        if (this._nodes && this._nodes.length === this._map.size) {
            await delay(1000); // wait 1 more sec to complete last device
            this.log("All nodes discovered");
            // TODO: stop discovery
            // TODO: report front-end
        }

        return Promise.resolve();
    }

    addDevice(nodeId, parts, message) {
        try {
            if (!nodeId) return;

            console.log('addHomieDevice: ' + nodeId);
            console.log(message);

            const node = this._map.get(nodeId) || new HomieNode(nodeId);
            node.parse(parts, message);
            this._map.set(nodeId, node);

            // TODO: Notify front-end
            this.log(JSON.stringify(node, null, 2));

        } catch (e) {
            this.log('Error handeling MQTT homie discovery message');
            this.log(e);
        }
    }
}

module.exports = MQTTHomieDiscovery;