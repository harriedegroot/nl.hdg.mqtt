'use strict';

const DEBUG = process.env.DEBUG === '1';
if (DEBUG) {
    require('inspector').open(9229, '0.0.0.0', false);
}

const normalize = require('./normalize');
const Homey = require('homey');
const { HomeyAPI } = require('athom-api');
const MQTTClient = require('./mqtt/MQTTClient');
const MessageQueue = require('./mqtt/MessageQueue');

// Services
const Log = require("./Log.js");
const DeviceManager = require("./DeviceManager.js");

// Dispatchers
const SystemStateDispatcher = require("./dispatchers/SystemStateDispatcher.js");
const HomieDispatcher = require("./dispatchers/HomieDispatcher.js");
const HomeAssistantDispatcher = require("./dispatchers/HomeAssistantDispatcher.js");

// Commands
const CommandHandler = require("./commands/CommandHandler.js");

function getTopicRoot(settings) {
    return typeof settings === 'object' ? settings.deviceId : 'homey';
}

class MQTTHub extends Homey.App {

    async onInit() {
        try {
            Log.info('MQTT Hub is running...');

            this.settings = Homey.ManagerSettings.get('settings') || {};

            Log.debug(this.settings, false, false);

            this.api = await HomeyAPI.forCurrentHomey();

            try {
                this.system = await this._getSystemInfo();
            } catch (e) {
                Log.error('[boot] Failed to fetch system info');
                Log.error(e);
                this.system = {};
            }

            if (this.settings.deviceId === undefined) {
                this.settings.deviceId = normalize(this.system.name || 'homey');
                Log.debug("Settings initial deviceId: " + this.settings.deviceId);
                Homey.ManagerSettings.set('settings', this.settings);
                Log.debug("Settings updated");
            }

            Log.debug("Initialize MQTT Client & Message queue");
            this.mqttClient = new MQTTClient();
            this.messageQueue = new MessageQueue(this.mqttClient);

            // Suppress memory leak warning
            Log.debug("Suppress memory leak warning");
            this.api.devices.setMaxListeners(9999); // HACK

            // devices
            Log.debug("Initialize DeviceManager");
            this.deviceManager = new DeviceManager(this);

            Log.debug("Register DeviceManager");
            await this.deviceManager.register();

            // run
            Log.debug("Launch!");
            await this.start();
        }
        catch (e) {
            Log.error('[boot] Failed to initialize app');
            Log.error(e);
        }
    }

    async start() {
        try {
            Log.info('app start');
            await this.mqttClient.connect();

            this._startCommands();
            this._startBroadcasters();

            const protocol = this.settings.protocol || 'homie3';
            if (this.protocol !== protocol) {
                Log.info("Changing protocol from '" + this.protocol + "' to '" + protocol + "'");
                this._stopCommunicationProtocol(this.protocol);
                this._startCommunicationProtocol(protocol);
            }

            Log.info('app running: true');
        } catch (e) {
            Log.error('Failed to start app');
            Log.error(e);
        }
    }

    stop() {
        Log.info('app stop');
        this.mqttClient.disconnect();
        this._stopCommands();
        this._stopBroadcasters();
        this._stopCommunicationProtocol();
        delete this.protocol;
        Log.info('app running: false');
    }

    _startCommunicationProtocol(protocol) {
        this.protocol = protocol || this.protocol;
        Log.info('start communication protocol: ' + this.protocol);

        // NOTE: All communication is based on the (configurable) Homie Convention...
        this.homieDispatcher = new HomieDispatcher(this);

        // Enable Home Assistant Discovery
        // TODO: Make HomeAssistantDispatcher configurable
        this.homeAssistantDispatcher = new HomeAssistantDispatcher(this);
    }

    _stopCommunicationProtocol(protocol) {
        protocol = protocol || this.protocol;

        if (protocol) {

            Log.info('stop communication protocol: ' + this.protocol);

            // NOTE: All communication is based on the (configurable) Homie Convention...
            if (this.homieDispatcher) {
                this.homieDispatcher.destroy();
                delete this.homieDispatcher;
            }

            // Disable Home Assistant Discovery
            if (this.homeAssistantDispatcher) {
                this.homeAssistantDispatcher.destroy();
                delete this.homeAssistantDispatcher;
            }
        }
    }

    _startCommands() {
        this._stopCommands();
        this.commandHandler = new CommandHandler(this); // TODO: Refactor command handler with the abillity to register commands
    }
    _stopCommands() {
        if (this.commandHandler) {
            this.commandHandler.destroy();
            delete this.commandHandler;
        }
    }

    _startBroadcasters() {
        Log.info("start broadcasters");
        if (this.homieDispatcher) {
            const broadcast = this.settings.broadcastDevices !== false;
            Log.info("homie dispatcher broadcast: " + broadcast);
            this.homieDispatcher.broadcast = broadcast;
        }

        if (this.homeAssistantDispatcher) {
            const broadcast = this.settings.broadcastDevices !== false;
            Log.info("Home Assistant dispatcher broadcast: " + broadcast);
            this.homeAssistantDispatcher.broadcast = broadcast;
        }

        if (!this.systemStateDispatcher && this.settings.broadcastSystemState) {
            Log.info("start system dispatcher");
            this.systemStateDispatcher = new SystemStateDispatcher(this);
        }
    }

    _stopBroadcasters() {
        Log.info("stop broadcasters");
        if (this.homieDispatcher) {
            Log.info("stop homie dispatcher");
            this.homieDispatcher.broadcast = false;
        }

        if (this.homeAssistantDispatcher) {
            Log.info("stop Home Assistant dispatcher");
            this.systemStateDispatcher.broadcast = false;
        }

        if (this.systemStateDispatcher) {
            Log.info("stop system dispatcher");
            this.systemStateDispatcher.destroy()
                .then(() => Log.info("Failed to destroy SystemState Dispatcher"))
                .catch(error => Log.error(error));
            delete this.systemStateDispatcher;
        }
    }

    async _getSystemInfo() {
        Log.info("get system info");
        const info = await this.api.system.getInfo();
        return {
            name: info.hostname,
            version: info.homey_version
        };
    }

    async getDevices() {
        try {
            Log.info("get devices");
            if (this.deviceManager && this.deviceManager.devices)
                return this.deviceManager.devices;

            const api = await HomeyAPI.forCurrentHomey();
            return await api.devices.getDevices();
        } catch (e) {
            Log.error("Failed to get Homey's devices");
            Log.error(e);
        }
    }

    async getZones() {
        try {
            Log.info("get zones");
            if (this.deviceManager && this.deviceManager.zones)
                return this.deviceManager.zones;

            const api = await HomeyAPI.forCurrentHomey();
            return await api.zones.getZones();
        } catch (e) {
            Log.error("Failed to get Homey's zones");
            Log.error(e);
        }
    }

    isRunning() {
        return this.mqttClient && this.mqttClient.isRegistered() && !this.pause;
    }

    setRunning(running) {
        Log.info(running ? 'switch on' : 'switch off');
        if (this.mqttClient) {
            if (running) {
                this.start()
                    .then(() => Log.info("App running"))
                    .catch(error => Log.error(error));
            }
            else {
                this.stop();
            }
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

        if (this.homeAssistantDispatcher) {
            this.homeAssistantDispatcher.dispatchState();
        }
    }

    async settingsChanged() {
        try {
            Log.info("Settings changed");
            this.settings = Homey.ManagerSettings.get('settings') || {};
            Log.debug(this.settings);

            // deviceId
            if (this.mqttClient) {
                this.mqttClient.topicRoot = getTopicRoot(this.settings);
            }

            // devices, topicRoot
            let deviceChanges = null;
            if (this.deviceManager) {
                deviceChanges = this.deviceManager.computeChanges(this.settings.devices);
                this.deviceManager.setEnabledDevices(this.settings.devices);
            }

            if (this.homieDispatcher) {
                this.homieDispatcher.updateSettings(this.settings, deviceChanges);
            }

            if (this.homeAssistantDispatcher) {
                this.homeAssistantDispatcher.updateSettings(this.settings, deviceChanges);
            }

            // protocol, broadcasts
            await this.start(); // NOTE: Changes are detected in the start method(s)
        } catch (e) {
            Log.error("Failed to update settings");
            Log.error(e);
        }
    }
}

module.exports = MQTTHub;