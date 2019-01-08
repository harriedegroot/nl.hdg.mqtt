"use strict";

class Dispatcher {

    constructor(app) {
        this.app = app;
        this.log = app.logModule;
        this.api = app.api;
    }

    // Get all devices and add them
    async register() {

        // Subscribe to realtime events and set all devices global
        this.api.devices.on('device.create', async id => await this.addDevice(id));
        this.api.devices.on('device.delete', id => this.removeDevice(id));

        // register devices
        await this.registerDevices();

        this.log.debug('Devices registered');
        return true;
    }

    async registerDevices() {
        this.devices = await this.api.devices.getDevices();
        for (let device in this.devices) {
            if (this.devices.hasOwnProperty(device)) {
                this.addStateChangeListeners(this.devices[device]);
            }
        }
    }

    async addDevice(id) {
        console.log('New device found!');
        if (this.devices) {
            const device = await this.api.devices.getDevice({ id: id });
            this.devices.push(device);
            this.addStateChangeListeners(device);
        }
    }

    removeDevice(id) {
        this.log.info('Device deleted!');
        if (this.devices) {
            this.devices = this.devices.filter(d => d.id !== id);
        }
    }

    addStateChangeListeners(device) {
        let events = [];
        let capabilities = device.capabilitiesObj || device.capabilities; // 1.5.13 vs 2.0
        for (let c in capabilities) {
            if (capabilities.hasOwnProperty(c)) {
                let capabillity = capabilities[c];
                this.attachEventListener(device, capabillity.id, capabillity);
                events.push(capabillity.id);

                const split = capabillity.id.split('_');
                if (split.length > 1) {
                    for (let i = 1; i < split.length; i++) {
                        this.attachEventListener(device, split[i], capabilities[capabillity.id]);
                        events.push(split[i]);
                    }
                }
            }
        }
        this.log.info(device.name + ": " + events.join(', '));
    }

    attachEventListener(device, trigger, capabillity) {
        if (device.makeCapabilityInstance) { // Homey 2.0
            device.makeCapabilityInstance(capabillity.id, value => this.onStateChange(device, trigger, capabillity, value));
        } else { // Homey 1.5.13
            device.on(trigger, value => this.onStateChange(device, trigger, capabillity, value));
        }
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

        if (!state) return;

        const deviceName = state.device.name.replace(' ', '_').toLowerCase();
        const trigger = state.trigger;
        const topic = ['homey', deviceName, trigger, state.type].filter(x => x).join('/');

        const msg = {
            qos: 0,
            retain: false,
            mqttTopic: topic,
            mqttMessage: state
        };

        this.app.publishMessage(msg);
    }
}

module.exports = Dispatcher;
