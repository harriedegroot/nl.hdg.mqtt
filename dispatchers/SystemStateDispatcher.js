"use strict";

const Log = require('../Log');
const normalize = require('../normalize');

const TOPIC = '{deviceId}/system/info';
const TOPIC_SYSLOAD_1 = '/systemload/1min';
const TOPIC_SYSLOAD_5 = '/systemload/5min';
const TOPIC_SYSLOAD_15 = '/systemload/15min';
const TOPIC_MEMUSAGE_APPS = '/memusage/apps';
const TOPIC_MEMUSAGE_TOTAL = '/memusage/total';
const TOPIC_MEMUSAGE_USED = '/memusage/used';
const TOPIC_MEMUSAGE_FREE = '/memusage/free';
const DELAY = 60000;

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
        this.counter = 0; // counter for updates to count 5/15min intervals

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
            this.TOPIC_SYSLOAD_1 = this.topic.replace('/info', TOPIC_SYSLOAD_1);
            this.TOPIC_SYSLOAD_5 = this.topic.replace('/info', TOPIC_SYSLOAD_5);
            this.TOPIC_SYSLOAD_15 = this.topic.replace('/info', TOPIC_SYSLOAD_15);
            this.TOPIC_MEMUSAGE_APPS = this.topic.replace('/info', TOPIC_MEMUSAGE_APPS);
            this.TOPIC_MEMUSAGE_TOTAL = this.topic.replace('/info', TOPIC_MEMUSAGE_TOTAL);
            this.TOPIC_MEMUSAGE_USED = this.topic.replace('/info', TOPIC_MEMUSAGE_USED);
            this.TOPIC_MEMUSAGE_FREE = this.topic.replace('/info', TOPIC_MEMUSAGE_FREE);

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
        Log.debug('System info update...');

        if (!this.enabled || !this.registered) return;

        try {
            
            let sysinfo = await this.api.system.getInfo();
            // TODO: Create state value messages for each value of interest
            const info = {
                system: sysinfo,
                //storage: await this.api.system.getStorageStats(),
                //memory: await this.api.system.getMemoryStats(),
                timestamp: new Date().getTime()
            };
            this.messageQueue.add(this.topic, info, { qos: 0, retain: true });

            // systemload for 1 min interval
            this.messageQueue.add(this.TOPIC_SYSLOAD_1, sysinfo.loadavg[0], { qos: 0, retain: true });
            // systemload for 5 min interval
            if ( this.counter == 0 || this.counter == 5 || this.counter == 10 || this.counter == 15 ){
                this.messageQueue.add(this.TOPIC_SYSLOAD_5, sysinfo.loadavg[1], { qos: 0, retain: true });
                // Memory info for 5 min interval
                let meminfo = await this.getMemoryUsage();
                this.messageQueue.add(this.TOPIC_MEMUSAGE_APPS, meminfo.apps, { qos: 0, retain: true });
                this.messageQueue.add(this.TOPIC_MEMUSAGE_FREE, meminfo.free, { qos: 0, retain: true });
                this.messageQueue.add(this.TOPIC_MEMUSAGE_USED, meminfo.used, { qos: 0, retain: true });
                this.messageQueue.add(this.TOPIC_MEMUSAGE_TOTAL, meminfo.total, { qos: 0, retain: true });
            }
            // systemload for 15 min interval
            if ( this.counter == 0 || this.counter >= 15 ){
                this.messageQueue.add(this.TOPIC_SYSLOAD_15, sysinfo.loadavg[2], { qos: 0, retain: true });
                this.counter = 0;
            }
        } catch (e) {
            Log.error("Failed to fetch system info");
            Log.info(e);
        }
        
        this.counter ++;
        // loop
        this.timeout = setTimeout(() => this.update().catch(e => Log.error(e)), DELAY);
    }

    async getMemoryUsage(){
        let array = [];
        let used = 0;
        let free = 0;
        let total = 0;
        let json_dict;

        let mem = await this.api.system.getMemoryInfo( );

        for(var i in mem.types)
            array.push(mem.types [i]);
        array = array.sort((a, b) => {
        return (a.size > b.size) ? -1 : 1;
        });
        json_dict = "{";
        for(var i in array){
            used += array[i].size;
            array[i].size = Math.round(array[i].size /1000 /10)/100; 
            json_dict += '"'+array[i].name+'":"'+array[i].size+'"';
            if ( i<array.length-1)
            json_dict+=",";
        }
        json_dict += "}";

        free = ( mem.total - used ) / 1000 / 1000;
        used = used / 1000 / 1000;
        total = mem.total / 1000 / 1000;
        return {
            'apps': json_dict,
            'total': total,
            'used': used,
            'free': free
        }
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
