'use strict';

const DEBUG = process.env.DEBUG === '1';
if (DEBUG) {
    require('inspector').open(9229, '0.0.0.0', false);
}

const Homey = require('homey');
const { HomeyAPI } = require('athom-api');
const MQTTClient = require('./mqtt/MQTTClient');
const MessageQueue = require('./mqtt/MessageQueue');
const Message = require('./mqtt/Message');
const TopicsRegistry = require('./mqtt/TopicsRegistry');
const normalize = require('./normalize');

// Services
const Log = require("./Log.js");
const DeviceManager = require("./DeviceManager.js");

// Dispatchers
const SystemStateDispatcher = require("./dispatchers/SystemStateDispatcher.js");
const HomieDispatcher = require("./dispatchers/HomieDispatcher.js");
const HomeAssistantDispatcher = require("./dispatchers/HomeAssistantDispatcher.js");

// Commands
const CommandHandler = require("./commands/CommandHandler.js");

// Birth & Last will
const BIRTH_TOPIC = '{deviceId}/hub/status';
const BIRTH_MESSAGE = 'online';
const WILL_TOPIC = '{deviceId}/hub/status';
const WILL_MESSAGE = 'offline';

class MQTTHub extends Homey.App {

    async onInit() {
        try {
            Log.info('MQTT Hub is running...');

            Homey.on('unload', () => this.uninstall());

            this.settings = Homey.ManagerSettings.get('settings') || {};
            this.birthWill = this.settings.birthWill !== false;

            Log.debug(this.settings, false, false);

            this.api = await HomeyAPI.forCurrentHomey();

            try {
                this.system = await this._getSystemInfo();
            } catch (e) {
                Log.error('[boot] Failed to fetch system info');
                Log.error(e);
                this.system = {};
            }

            Log.debug("Update settings");
            this.initSettings();

            Log.debug("Initialize MQTT Client & Message queue");
            this.mqttClient = new MQTTClient();
            this.messageQueue = new MessageQueue(this.mqttClient);
            this.topicsRegistry = new TopicsRegistry(this.messageQueue);

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

    initSettings() {
        const systemName = this.system.name || 'Homey';
        if (this.settings.deviceId === undefined || this.settings.systemName !== systemName || this.settings.topicRoot) {

            // Backwards compatibility
            if (this.settings.topicRoot && !this.settings.homieTopic) {
                this.settings.homieTopic = this.settings.topicRoot + '/' + (this.settings.deviceId || systemName);
                delete this.settings.topicRoot;
            }

            this.settings.systemName = systemName;
            this.settings.deviceId = this.settings.deviceId || this.settings.systemName;
            Log.debug("Settings initial deviceId: " + this.settings.deviceId);
            Homey.ManagerSettings.set('settings', this.settings);
            Log.debug("Settings updated");
        }
    }

    /**
     * Start Hub
     * */
    async start() {
        if (this._running) return;
        this._running = true;

        try {
            Log.info('start Hub');
            await this.mqttClient.connect();
            this._sendBirthMessage();

            await this.run();
            
            Log.info('app running: true');
        } catch (e) {
            Log.error('Failed to start Hub');
            Log.error(e);
        }
    }

    /**
     * Stop Hub
     * */
    stop() {
        if (!this._running) return;
        this._running = false;

        Log.info('stop Hub');
        this._sendLastWillMessage();
        this.mqttClient.disconnect();

        this._stopCommunicationProtocol();
        this._stopBroadcasters();
        this._stopCommands();
        delete this.protocol;

        this.messageQueue.stop();
        this.messageQueue.clear();

        Log.info('app running: false');
    }

    /**
     * Load configuration & run
     * Note: Called from start & settings changed
     * */
    async run() {
        
        this._initProtocol();

        await this._startCommands();
        await this._startBroadcasters();
        await this._startHomeAssistantDiscovery();
        await this._startCommunicationProtocol();
    }

    _initProtocol() {
        this.protocol = this.settings.protocol || 'homie3';
        Log.info('Initialize communication protocol: ' + this.protocol);

        switch (this.protocol) {
            case "custom":
                this.settings.homieTopic = this.settings.customTopic;
                break;
            case "homie3":
            default:
                this.settings.topicIncludeClass = false;
                this.settings.topicIncludeZone = false;
                this.settings.normalize = true;
                this.settings.percentageScale = "int";
                this.settings.colorFormat = "hsv";
                this.settings.broadcastDevices = true;
                break;
        }

        // NOTE: All communication is based on the (configurable) Homie Convention...
        Log.info("Initialize HomieDispatcher");
        this.homieDispatcher = this.homieDispatcher || new HomieDispatcher(this);
        this.homieDispatcher.applySettings(this.settings);
    }

    async _startCommands() {
        if (this.settings.commands) {
            Log.info("start commands");
            // TODO: Refactor command handler with the abillity to register commands
            this.commandHandler = this.commandHandler || new CommandHandler(this);
            await this.commandHandler.init(this.settings); 
        } else {
            this._stopCommands();
        }
    }
    _stopCommands() {
        if (this.commandHandler) {
            Log.info("stop command handler");
            this.commandHandler.destroy();
            delete this.commandHandler;
        }
    }

    async _startBroadcasters() {
        if (this.settings.broadcastSystemState) {
            Log.info("start system state broadcaster");
            this.systemStateDispatcher = this.systemStateDispatcher || new SystemStateDispatcher(this);
            await this.systemStateDispatcher.init(this.settings);
        } else {
            this._stopBroadcasters();
        }
    }
    _stopBroadcasters() {
        if (this.systemStateDispatcher) {
            Log.info("stop system state broadcaster");
            this.systemStateDispatcher.destroy()
                .then(() => Log.info("Failed to destroy SystemState Dispatcher"))
                .catch(error => Log.error(error));
            delete this.systemStateDispatcher;
        }
    }
    
    async _startHomeAssistantDiscovery() {
        if (this.settings.hass) {
            Log.info("start Home Assistant Discovery");
            this.homeAssistantDispatcher = this.homeAssistantDispatcher || new HomeAssistantDispatcher(this);
            await this.homeAssistantDispatcher.init(this.settings, this.deviceChanges);
        } else {
            Log.info("stop Home Assistant Discovery");
            this._stopHomeAssistantDiscovery();
        }
    }
    _stopHomeAssistantDiscovery() {
        if (this.homeAssistantDispatcher) {
            Log.info("stop Home Assistant Discovery");
            this.homeAssistantDispatcher.destroy();
            delete this.homeAssistantDispatcher;
        }
    }

    async _startCommunicationProtocol() {
        // Register all devices & dispatch current state
        Log.info('Start communication protocol: ' + this.protocol);
        await this.homieDispatcher.init(this.settings, this.deviceChanges);
    }
    _stopCommunicationProtocol() {
        // NOTE: All communication is based on the (configurable) Homie Convention...
        if (this.homieDispatcher) {
            Log.info('stop communication protocol: ' + this.protocol);
            this.homieDispatcher.destroy();
            delete this.homieDispatcher;
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
        return this._running;
        //return this.mqttClient && this.mqttClient.isRegistered() && !this.pause;
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
        if (this.homeAssistantDispatcher) {
            this.homeAssistantDispatcher.dispatchState();
        }
        if (this.homieDispatcher) {
            this.homieDispatcher.dispatchState();
        }
    }

    async settingsChanged() {
        try {
            Log.info("Settings changed");
            this.settings = Homey.ManagerSettings.get('settings') || {};
            Log.debug(this.settings);

            // birth & last will
            if (this.settings.birthWill) {
                if (this.birthWill !== this.settings.birthWill) {
                    this._sendBirthMessage();
                }
            } else {
                if (this.birthWill) {
                    this._clearBirthWill();
                }
            }
            this.birthWill = this.settings.birthWill;

            // devices
            if (this.deviceManager) {
                this.deviceChanges = this.deviceManager.computeChanges(this.settings.devices);
                this.deviceManager.setEnabledDevices(this.settings.devices);
            }

            await this.run();

            // clean-up all messages for disabled devices
            for (let deviceId of this.deviceChanges.disabled) {
                if (typeof deviceId === 'string') {
                    this.topicsRegistry.remove(deviceId, true);
                }
            }

            // clean-up
            delete this.deviceChanges; 

        } catch (e) {
            Log.error("Failed to update settings");
            Log.error(e);
        }
    }

    get _birthTopic() {
        let topic = (this.settings.birthTopic || BIRTH_TOPIC).replace('{deviceId}', this.settings.deviceId);
        if (this.settings.normalize !== false) {
            topic = normalize(topic);
        }
        return topic;
    }
    get _willTopic() {
        let topic = (this.settings.willTopic || WILL_TOPIC).replace('{deviceId}', this.settings.deviceId);
        if (this.settings.normalize !== false) {
            topic = normalize(topic);
        }
        return topic;
    }
    _sendBirthMessage() {
        if (this.mqttClient && this.settings.birthWill !== false) {
            const msg = this.settings.birthMessage || BIRTH_MESSAGE;
            this.mqttClient.publish(new Message(this._birthTopic, msg, 1, true));
        }
    }
    _sendLastWillMessage() {
        if (this.mqttClient && this.settings.birthWill !== false) {
            const msg = this.settings.willMessage || WILL_MESSAGE;
            this.mqttClient.publish(new Message(this._willTopic, msg, 1, true));
        }
    }
    _clearBirthWill() {
        this.mqttClient.publish(new Message(this._birthTopic, null, 1, true));
        this.mqttClient.publish(new Message(this._willTopic, null, 1, true));
    }

    uninstall() {
        try {
            this._sendLastWillMessage();
            this.mqttClient.disconnect();
            // TODO: unregister topics from MQTTClient?
        } catch(e) {
            // nothing...
        }
    }
}

module.exports = MQTTHub;