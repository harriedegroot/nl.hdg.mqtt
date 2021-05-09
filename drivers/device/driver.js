'use strict';

const Homey = require('homey');
const MQTTClient = require('../../mqtt/MQTTClient');
const HomeyLib = require('homey-lib');
const CAPABILITIES = HomeyLib.getCapabilities();
const DEVICE_CLASSES = HomeyLib.getDeviceClasses();
const { formatValue, parseValue } = require('../../ValueParser');

// files
const http = require('http');
const https = require('https');
const fs = require('fs');

const DEBUG = process.env.DEBUG === '1';

function listFiles( path ) {
    console.log("listFiles: ");
    return new Promise((resolve, reject) => {
      try {
        fs.readdirSync(path).forEach(file => {
          console.log(file);
        });
      } catch (error) {
        return reject(error);
      }
    })
  }

function download(url, path, encoding){
    var file = fs.createWriteStream(path);
    return new Promise((resolve, reject) => {
      var responseSent = false;
      const action = url.startsWith('https') ? https.get : http.get;
      action(url, response => {
        if(encoding) {
            response.setEncoding(encoding);
        }
        response.pipe(file);
        file.on('finish', () =>{
          file.close(() => {
            if(responseSent)  return;
            responseSent = true;
            resolve();
          });
        });
      }).on('error', err => {
          if(responseSent)  return;
          responseSent = true;
          reject(err);
      });
    });
}

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
        let installed = false;

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
            capabilities: [],
            capabilitiesOptions: {}
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
            if(!edit) return;
            return pairingDevice.settings.capabilities[edit];
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
                pairingDevice.capabilities = (pairingDevice.capabilities || []).filter(id => id !== data.capabilityId);
                delete pairingDevice.capabilitiesOptions[data.capabilityId];
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
            let capabilityId = undefined;
            if(data) {
                capabilityId = data.capabilityId;

                // new capability selected?
                if(capabilityId && data.capability && capabilityId.split('.')[0] !== data.capability) {
                    pairingDevice.capabilities = (pairingDevice.capabilities || []).filter(id => id === capabilityId);
                    delete pairingDevice.capabilitiesOptions[capabilityId];
                    delete pairingDevice.settings.capabilities[capabilityId];
                    capabilityId = undefined;
                }

                // new capability?
                if(!capabilityId && data.capability) {

                    // get next available id
                    capabilityId = this._getCapabilityId(pairingDevice, data.capability);
                    data.capabilityId = capabilityId;
                    
                    // register capability
                    pairingDevice.capabilities.push(capabilityId);

                    // displayName?
                    if(!data.displayName) {
                        data.displayName = CAPABILITIES[data.capability] ? CAPABILITIES[data.capability].title.en : undefined;
                    }
                }

                // update settings
                if(capabilityId) {

                    // update custom display name
                    if(data.displayName) {
                        pairingDevice.capabilitiesOptions[capabilityId] = {
                            title: data.displayName
                        };
                    } else if(pairingDevice.capabilitiesOptions[capabilityId]) {
                        delete pairingDevice.capabilitiesOptions[capabilityId].title;
                    }

                    // update config
                    const config = pairingDevice.settings.capabilities[capabilityId] || {};
                    Object.assign(config, data);
                    pairingDevice.settings.capabilities[capabilityId] = config;
                }
            }

            pairingDevice.settings.topics = this.getSettingsTopics(pairingDevice);

            this.log('pairingDevice: ' + JSON.stringify(pairingDevice));
            return data;
        });

        session.setHandler('getPairingDevice', async (data) => {
            return pairingDevice;
        });

        session.setHandler('setIcon', async (svg) => {
            console.log('setIcon: ' + svg);
            pairingDevice.data.icon = svg;
            pairingDevice.icon = svg
            
            return svg;
        });

        session.setHandler('setRemoteIcon', async (item) => {
            console.log('setRemoteIcon: ' + item.url);
            // if(DEBUG) listFiles("./userdata");

            const root = "../../";
            const file  = await this.downloadIcon(item.url, pairingDevice.data.id);
            const path = root + file;
            pairingDevice.data.icon = path;
            pairingDevice.icon = path;
            
            return file;
        });
    
        session.setHandler('saveIcon', async (data) => {
          try {
            console.log('saveIcon: ' + JSON.stringify(data));
            // if(DEBUG) listFiles("./userdata");

            this.uploadIcon(data, pairingDevice.data.id);
            const root = '../../';
            const deviceIcon = "../userdata/"+ pairingDevice.data.id +".svg";
    
            pairingDevice.data.icon = root + deviceIcon;
            pairingDevice.icon = root + deviceIcon;
            
            return deviceIcon;
    
          } catch (error) {
            console.log('saveIcon ERROR ' + JSON.stringify(error));
          }
        });

        session.setHandler('install', (data) => {
            installed = true;
            return pairingDevice;

            // const installed = await client.isInstalled();
            // if (!installed) {
            //     throw new Error("MQTT Client app not installed");
            // }
            //return await this.homey.createDevice(pairingDevice);
        });

        session.setHandler('disconnect', async () => {
            if(installed) {
                this.log("Pairing is finished");
            } else {
                this.log("User aborted");
                this.tryRemoveIcon(pairingDevice.data.id);
            }
        });
    }

    tryRemoveIcon(id) {
        try {
            const path = `../userdata/${id}.svg`;
            fs.unlinkSync(path);
        } catch(err) {
            this.log(err);
        }
    }

    async downloadIcon(url, id) {
        const path = `../userdata/${id}.svg`;
        await download(url, path);
        //await download(url, path, 'base64');
        return path;
    }

    uploadIcon(img, id) {
        const path = "../userdata/"+ id +".svg";
        const base64 = img.replace("data:image/svg+xml;base64,", '');
        fs.writeFileSync(path, base64, 'base64');
    }

    _getCapabilityId(pairingDevice, capability) {

        // already has a postfix?
        if(capability.indexOf('.') !== -1) {
            return capability;
        }

        // multiple of the same capability? => add index postfix
        if (pairingDevice.capabilities.includes(capability)) {
            let idx = 0;
            while(pairingDevice.capabilities.includes(capability + '.' + (++idx))){}
            capability += '.'  + idx;
        }
        return capability;
    }

    getSettingsTopics(pairingDevice) {
        if (!pairingDevice || !pairingDevice.settings || !pairingDevice.settings.capabilities) return '';

        // clone
        let topics = JSON.parse(JSON.stringify(pairingDevice.settings.capabilities || {})); 
        for (let id in topics) {
            delete topics[id].capabilityId;
        }
        return JSON.stringify(topics, null, 2);
    }

    registerFlowCardAction(card_name) {
        let flowCardAction = this.homey.flow.getActionCard(card_name);
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