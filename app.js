'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('athom-api');
const MQTTClient = require('./mqtt/MQTTClient.js');

// Services
const Log = require("./Log.js");
const DeviceManager = require("./DeviceManager.js");
const MessageHandler = require("./MessageHandler.js");

// Dispatchers
const DeviceStateChangeDispatcher = require("./dispatchers/DeviceStateChangeDispatcher.js");
const SystemStateDispatcher = require("./dispatchers/SystemStateDispatcher.js");
const FlowTriggerDispatcher = require("./dispatchers/FlowTriggerDispatcher.js");
const HomieDispatcher = require("./dispatchers/HomieDispatcher.js");

// Commands
const DescribeCommandHandler = require("./commands/DescribeCommandHandler.js");
const StateRequestCommandHandler = require("./commands/StateRequestCommandHandler.js");
const UpdateCommandHandler = require("./commands/UpdateCommandHandler.js");

/*
const defaultSettings = {
    "protocol": "homie3",
    "topicRoot": "homie",
    "deviceId": "homey",
    "topicIncludeClass": false,
    "topicIncludeZone": false,
    "propertyScaling": "default",
    "colorFormat": "hsv",
    "broadcastDevices": true,
    "broadcastSystemState": true,
};
*/

class MQTTGateway extends Homey.App {

	async onInit() {
        Log.info('MQTT Gateway is running...');

        this.settings = Homey.ManagerSettings.get('settings') || {};
        this.api = await HomeyAPI.forCurrentHomey();
        this.system = await this._getSystemInfo();

        if (this.settings.deviceId === undefined) {
            this.settings.deviceId = Topic.normalize(this.system.name || 'homey');
            Homey.set('settings', this.settings);
        }

        this.mqttClient = new MQTTClient(this.settings.deviceId);

        // Suppress memory leak warning
        this.api.devices.setMaxListeners(9999); // HACK

        // devices
        this.deviceManager = new DeviceManager(this);
        await this.deviceManager.register();

        // run
        this.start();
    }

    start() {
        Log.debug('app start');
        this.mqttClient.connect();

        const protocol = this.settings.protocol || 'homie3';
        if (this.protocol !== protocol) {
            Log.debug("Changing protocol from '" + this.protocol + "' to '" + protocol + "'");
            this._stopCommunicationProtocol(this.protocol);
            this._startCommunicationProtocol(protocol);
        }

        this._startBroadcasters();
    }

    stop() {
        Log.debug('app stop');
        this.mqttClient.disconnect();
        this._stopCommunicationProtocol();
        this._stopBroadcasters();
    }

    _startCommunicationProtocol(protocol) {
        this.protocol = protocol || this.protocol;
        Log.debug('start communication protocol: ' + this.protocol );
        if (protocol) {
            switch (protocol) {
                case 'deprecated':
                    this._addDeprecatedDispatchers();
                    this._listenToDeprecatedCommands();
                    break;
                case 'ha':
                    // TODO: Implement HA Discovery
                    break;
                case 'homie3':
                default:
                    this.homieDispatcher = new HomieDispatcher(this);
                    break;
            }
        }
    }

    _stopCommunicationProtocol(protocol) {
        protocol = protocol || this.protocol;
        if (protocol) {
            Log.debug('stop communication protocol: ' + this.protocol);
            if (protocol) {
                switch (protocol) {
                    case 'deprecated':
                        this._removeDeprecatedDispatchers();
                        this._stopDeprecatedCommands();
                        break;
                    case 'ha':
                        // TODO: Destroy HA Discovery
                        break;
                    case 'homie3':
                    default:
                        if (this.homieDispatcher) {
                            this.homieDispatcher.destroy();
                            delete this.homieDispatcher;
                        }
                        break;
                }
            }
        }
    }

    _addDeprecatedDispatchers() {
        this.deviceStateChangeDispatcher = new DeviceStateChangeDispatcher(this);
        //this.flowTriggerDispatcher = new FlowTriggerDispatcher(this);
    }

    _removeDeprecatedDispatchers() {
        if (this.deviceStateChangeDispatcher) {
            this.deviceStateChangeDispatcher.destroy();
            delete this.deviceStateChangeDispatcher;
            //this.flowTriggerDispatcher
        }
    }

    _listenToDeprecatedCommands() {
        this.messageHandler = new MessageHandler(this);
        this.messageHandler.addMessageHandler(new DescribeCommandHandler(this));
        this.messageHandler.addMessageHandler(new StateRequestCommandHandler(this));
        this.messageHandler.addMessageHandler(new UpdateCommandHandler(this));
    }
    _stopDeprecatedCommands() {
        if (this.messageHandler) {
            this.messageHandler.destroy();
            delete this.messageHandler;
        }
    }

    _startBroadcasters() {
        Log.debug("start broadcasters");
        if (this.homieDispatcher) {
            const broadcast = this.settings.broadcastDevices !== false;
            Log.debug("homie dispatcher broadcast: " + broadcast);
            this.homieDispatcher.broadcast = broadcast;
        }
        if (!this.systemStateDispatcher && this.settings.broadcastSystemState) {
            Log.debug("start system dispatcher");
            this.systemStateDispatcher = new SystemStateDispatcher(this);
        }
    }

    _stopBroadcasters() {
        Log.debug("stop broadcasters");
        if (this.homieDispatcher) {
            Log.debug("stop homie dispatcher");
            this.homieDispatcher.broadcast = false;
        }

        if (this.systemStateDispatcher) {
            Log.debug("stop system dispatcher");
            this.systemStateDispatcher.destroy();
            delete this.systemStateDispatcher;
        }
    }

    async _getSystemInfo() {
        Log.debug("get system info");
        const info = await this.api.system.getInfo();
        return {
            name: info.hostname,
            version: info.homey_version
        };
    }

    async getDevices() {
        Log.debug("get devices");
        if (this.deviceManager && this.deviceManager.devices)
            return this.deviceManager.devices;

        const api = await HomeyAPI.forCurrentHomey();
        return await api.devices.getDevices();
    }

    async getZones() {
        Log.debug("get zones");
        if (this.deviceManager && this.deviceManager.zones)
            return this.deviceManager.zones;

        const api = await HomeyAPI.forCurrentHomey();
        return await api.zones.getZones();
    }

    isRunning() {
        return this.mqttClient && this.mqttClient.isRegistered() && !this.pause;
    }

    setRunning(running) {
        Log.info(running ? 'switch on' : 'switch off');
        if (this.mqttClient) {
            if (running)
                this.start();
            else
                this.stop();
        }
    }

    /**
     * Publish all device states
     * */
    refresh() {
        Log.info('refresh');
        if (this.homieDispatcher) {
            this.homieDispatcher.dispatchState();
        }
    }

    async settingsChanged() {
        Log.info("Settings changed");
        this.settings = Homey.ManagerSettings.get('settings') || {};
        Log.debug(this.settings);

        // deviceId
        if (this.mqttClient) {
            this.mqttClient.topicRoot = this.settings.deviceId;
        }

        // devices, topicRoot
        let deviceChanges = null;
        if (this.deviceManager) {
            deviceChanges = this.deviceManager.computeChanges(this.settings.devices);
            this.deviceManager.setEnabledDevices(this.settings.devices);
        }
        Log.debug(deviceChanges);

        if (this.homieDispatcher) {
            this.homieDispatcher.updateSettings(this.settings, deviceChanges);
            //this.homieDispatcher.dispatchState();
        }

        // protocol, broadcasts
        this.start(); // NOTE: Changes are detected in the start method(s)
    }
}

module.exports = MQTTGateway;