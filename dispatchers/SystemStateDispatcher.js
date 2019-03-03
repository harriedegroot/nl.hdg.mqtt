"use strict";

const Log = require('../Log');
const normalize = require('../normalize');

const TOPIC = '{deviceId}/system/info';
const DELAY = 30000;

/*
{
    "system": {
    "bootId": "xxxxxxxxxxxxxxxxxxx",
    "cloudId": "`xxxxxxxxxxxxxxxxxxxxx",
    "hostname": "Homey",
    "platform": "linux",
    "release": "4.14.15-g81f15bab94",
    "arch": "arm",
    "uptime": 5465,
    "loadavg": [
        0.3359375,
        0.263671875,
        0.3818359375
    ],
    "totalmem": 511922176,
    "freememMachine": 12529664,
    "freememHuman": "2%",
    "cpus": [
        {
        "model": "ARMv7 Processor rev 10 (v7l)",
        "speed": 996,
        "times": {
            "user": 7944800,
            "nice": 3252900,
            "sys": 7554700,
            "idle": 35332100,
            "irq": 0
        }
        }
    ],
    "date": "2019-02-16T14:15:16.493Z",
    "dateHuman": "zaterdag 16de februari 2019 15:15:16",
    "dateDst": false,
    "devmode": false,
    "nodeVersion": "v8.12.0",
    "homeyVersion": "2.0.2",
    "homeyModelId": "homey2s",
    "homeyModelName": "Homey (Early 2018)",
    "timezone": "Europe/Amsterdam",
    "wifiSsid": "xxxxxxxxx",
    "wifiAddress": "192.168.1.1:80",
    "wifiMac": "aa:00:aa:00:aa:00"
    },
    "timestamp": 1550326516547
}
*/

class SystemStateDispatcher {

    constructor({ api, mqttClient, messageQueue, settings }) {
        this.api = api;
        this.mqttClient = mqttClient;
        this.messageQueue = messageQueue;
        this.settings = settings;

        this._registerCallback = this.register.bind(this);
        this._unregisterCallback = this.unregister.bind(this);
        this.mqttClient.onRegistered.subscribe(this._registerCallback);
        this.mqttClient.onUnRegistered.subscribe(this._unregisterCallback);
    }

    async init(settings) {
        try {
            this.settings = settings;
            this.enabled = settings.broadcastSystemState;

            if (this.mqttClient.isRegistered())
                await this.register();

            Log.info("SystemStateDispatcher initialized");
        } catch (e) {
            Log.error('Failed to initialize SystemStateDispatcher');
            Log.debug(e);
        }
    }

    // Get all devices and add them
    async register() {

        if (!this.enabled) {
            await this.unregister();
            return;
        }

        try {
            this.registered = true;

            const deviceId = this.settings.normalize !== false ? normalize(this.settings.deviceId) : this.settings.deviceId;
            const topic = (this.settings.systemStateTopic || TOPIC).replace('{deviceId}', deviceId);
            if (this.topic && this.topic !== topic) {
                try {
                    await this.mqttClient.clear(this.topic);
                } catch (e) {
                    Log.error("Failed to clear previous System State Dispatcher topics");
                    Log.error(e);
                }
            }
            this.topic = topic;

            await this.update();

            Log.debug('System info dispatcher registered');
        } catch (e) {
            Log.error("Failed to register SystemState dispatcher");
            Log.error(e);
        }
    }

    async unregister() {
        this.registered = false;
        this._resetTimeout();
        Log.debug('System info dispatcher unregistered');
    }

    _resetTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
    }

    async update() {
        this._resetTimeout();
        if (!this.enabled || !this.registered) return;

        try {
            // TODO: Create state value messages for each value of interest
            const info = {
                system: await this.api.system.getInfo(),
                //storage: await this.api.system.getStorageStats(),
                //memory: await this.api.system.getMemoryStats(),
                timestamp: new Date().getTime()
            };
            this.messageQueue.add(this.topic, info, { qos: 0, retain: true });

        } catch (e) {
            Log.error("Failed to fetch system info");
            Log.info(e);
        }

        // loop
        this.timeout = setTimeout(() => this.update().catch(e => Log.error(e)), DELAY);
    }

    async destroy() {
        await this.unregister();
        if (this.mqttClient) {
            this.mqttClient.onRegistered.remove(this._registerCallback);
            this.mqttClient.onUnRegistered.remove(this._unregisterCallback);
        }
    }
}

module.exports = SystemStateDispatcher;
