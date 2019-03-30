'use strict';

const Homey = require('homey');
const MQTTClient = require('../../mqtt/MQTTClient');
const HomeyLib = require('homey-lib');
const CAPABILITIES = HomeyLib.getCapabilities();
const DEVICE_CLASSES = HomeyLib.getDeviceClasses();

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

class MQTTDriver extends Homey.Driver {
	
	onInit() {
        this.log('MQTT Driver is initialized');
    }

    // TODO: language
    get language() {
        return 'en';
    }

    async onPair(socket) {
        let client = new MQTTClient();
        let edit = undefined;

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

        socket.on('deviceClasses', function (data, callback) {
            callback(null, DEVICE_CLASSES);
        });
        socket.on('capabilities', function (data, callback) {
            // filter already configured capabilities?
            const capabilities = { ...CAPABILITIES };
            if (data && data.filter === true) {
                for (let configured of pairingDevice.capabilities) {
                    delete capabilities[configured];
                }
            }
            callback(null, capabilities);
        });

        socket.on('capability', function (data, callback) {
            callback(null, edit);
        });

        socket.on('addCapability', function (data, callback) {
            edit = undefined;
            socket.showView('capability');    
            callback(null, 'ok');
        });

        socket.on('editCapability', function (capabilityId, callback) {
            edit = capabilityId;
            socket.showView('capability');
            callback(null, 'ok');
        });
        socket.on('removeCapability', function (data, callback) {
            if (data && data.capabilityId) {
                pairingDevice.capabilities = pairingDevice.capabilities.filter(c => c !== data.capabilityId);
                delete pairingDevice.settings.capabilities[data.capabilityId];
            }
            callback(null, pairingDevice);
        });

        socket.on('set', function (data, callback) {
            console.log('set: ' + JSON.stringify(data, null, 2));
            for (let key in data) {
                if (pairingDevice.hasOwnProperty(key)) {
                    pairingDevice[key] = data[key];
                } else {
                    pairingDevice.settings[key] = data[key];
                }
            }
            console.log('pairingDevice: ' + JSON.stringify(pairingDevice));
            callback(null, pairingDevice);
        });

        socket.on('setCapability', function (data, callback) {
            console.log('setCapability: ' + JSON.stringify(data, null, 2));
            if (data && data.capability) {
                const id = data.capability;
                if (!pairingDevice.capabilities.includes(data.capability)) {
                    pairingDevice.capabilities.push(data.capability);
                }
                const config = pairingDevice.settings.capabilities[id] || {};
                Object.assign(config, data);
                pairingDevice.settings.capabilities[id] = config;
            }
            console.log('pairingDevice: ' + JSON.stringify(pairingDevice));
            callback(null, pairingDevice);
        });

        socket.on('getPairingDevice', function (data, callback) {
            callback(null, pairingDevice);
        });

        socket.on('install', function (data, callback) {

            client.isInstalled()
                .then(installed => {
                    if (!installed) {
                        calback("MQTT Client app not installed");
                        return;
                    }

                    Homey.addDevice(pairingDevice, (err, res) => {
                        if (err) {
                            callback(err);
                            return;
                        }
                        callback(null, pairingDevice);
                        Homey.done();
                    });
                })
                .catch(error => callback(error));
        });

        socket.on('disconnect', function () {
            console.log("User aborted or pairing is finished");
        });
    }
}

module.exports = MQTTDriver;