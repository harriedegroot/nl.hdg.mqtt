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

        this.log(JSON.stringify(MQTTClient, null, 2));

        MQTTClient
            .register()
            .on('install', () => this.register())
            .on('uninstall', () => this.unregister());

        MQTTClient.getInstalled()
            .then(installed => {
                if (installed) {
                    this.register();
                }
            })
            .catch(error => this.log(error));
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

        // Get the homey object
        const api = await this.getApi();

        // Subscribe to realtime events and set all devices global
        await api.devices.subscribe();
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
        for (let c in device.capabilities) {
            if (device.capabilities.hasOwnProperty(c)) {
                this.attachEventListener(device, c, device.capabilities[c]);
            }
        }
    }

    attachEventListener(device, trigger, capabillity) {
        device.on(trigger, value => this.stateChange(device, trigger, capabillity, value));
    }

    // this function gets called when a device with an attached eventlistener fires an event.
    stateChange(device, trigger, capabillity, value) {
        const state = {
            type: 'state_change',
            device: {
                id: device.id,
                name: device.name,
                state: device.state
            },
            trigger: trigger,
            capabillity: capabillity,
            value: value,
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