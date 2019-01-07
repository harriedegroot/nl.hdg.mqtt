'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('athom-api');
const MQTTClient = new Homey.ApiApp('nl.scanno.mqtt');

class MQTTDispatcher extends Homey.App {
    
    // Get API control function
    getApi() {
        if (!this.api) {
            this.api = HomeyAPI.forCurrentHomey();
        }
        return this.api;
    }

    // Get all devices function
    async getDevices() {
        const api = await this.getApi();
        return await api.devices.getDevices();
    }

    async initMQTTClient() {

        MQTTClient
            .register()
            .on('install', () => this.register())
            .on('uninstall', () => this.unregister())
            .on('realtime', (topic, message) => this.onMessage(topic, message));
        
        MQTTClient.getInstalled()
            .then(installed => {
                if (installed) {
                    this.register();
                }
            })
            .catch(error => this.log(error));
    }

    onMessage(topic, message) {
        this.log(topic + ": " + JSON.stringify(message, null, 2));
    }

	onInit() {
        this.log('MQTT Dispatcher is running...');

        this.initMQTTClient();
    }
   
    // Get all devices and add them
    async register() {
        this.mqttClient = true;

        if (this.registered) {
            console.log("[SKIP] Already registered");
            return;
        }
        this.registered = true;

        // receive all messages from the homey topic
        MQTTClient.post('subscribe', { topic: 'homey/#' }, (error) => this.log(error || 'subscribed to topic: homey/#'));

        // Get the homey object
        const api = await this.getApi();

        // Subscribe to realtime events and set all devices global
        api.devices.on('device.create', async (id) => {
            console.log('New device found!');
            const device = await api.devices.getDevice({ id: id });
            await this.addDevice(device);
        });
        api.devices.on('device.delete', async (id) => {
            console.log('Device deleted!');
        });

        let devices = await api.devices.getDevices();
        for (let device in devices) {
            if (devices.hasOwnProperty(device)) {
                this.addDevice(devices[device]);
            }
        }

        this.log('Devices registered');
        return true;
    }


    // Add device
    addDevice(device) {
        this.addStateChangeListeners(device);
    }

    addStateChangeListeners(device) {
        let events = [];
        for (let c in device.capabilities) {
            if (device.capabilities.hasOwnProperty(c)) {
                let capabillity = device.capabilities[c];
                if (capabillity && typeof capabillity == 'object' && capabillity.id) {
                    this.attachEventListener(device, capabillity.id, capabillity);
                    events.push(capabillity.id);

                    const split = capabillity.id.split('_');
                    if (split.length > 1) {
                        for (let i = 1; i < split.length; i++) {
                            this.attachEventListener(device, split[i], device.capabilities[capabillity.id]);
                            events.push(split[i]);
                        }
                    }
                }
            }
        }
        this.log(device.name + ": " + events.join(', '));
    }

    attachEventListener(device, trigger, capabillity) {
        device.on(trigger, value => this.onStateChange(device, trigger, capabillity, value));
    }

    // this function gets called when a device with an attached eventlistener fires an event.
    onStateChange(device, trigger, capabillity, value) {
        const state = {
            type: 'state_change',
            device: {
                id: device.id,
                type: device.class,
                name: device.name,
                state: device.state
            },
            trigger,
            source: capabillity,
            value,
            timestamp: new Date().getTime()
        };
        this.dispatch(state);
    }
  
    /**
     * Dispatch MQTT message for device trigger with state as payload
     * @param {any} state Message payload (Device state)
     * @see https://github.com/scanno/nl.scanno.mqtt/blob/f887f507be94191fb86b85f1856e0714736039fe/broker.js
     */
    dispatch(state) {

        // NOTE: MQTT Client uninstalled
        if (!this.mqttClient) return;
        if (!state) return;

        const deviceName = state.device.name.replace(' ', '_');
        const trigger = state.trigger;
        const topic = ['homey', deviceName, trigger, state.type].filter(x => x).join('/');
        
        const msg = {
            qos: 0,
            retain: false,
            mqttTopic: topic,
            mqttMessage: state
        };

        this.log(JSON.stringify(msg, null, 2));

        try {
            MQTTClient.post('send', msg);
        } catch (error) {
            this.log(error);
        }
    }

    async unregister() {
        this.mqttClient = false;

        // TODO: unregister
        //this.registered = false;
    }
}

module.exports = MQTTDispatcher;