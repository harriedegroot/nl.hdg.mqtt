'use strict';

const DEBUG = process.env.DEBUG === '1';

const STARTUP_DELAY = 30 * 1000; // wait 30 sec. before starting the broadcasts

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

const DEFAULT_LOG_LEVEL = 'info';

class MQTTHub extends Homey.App {

    async onInit() {

        if  (DEBUG ){
            if (this.homey.platform == "local"){
                try{ 
                    require('inspector').waitForDebugger();
                }
                catch(error){
                    require('inspector').open(9229, '0.0.0.0', true);
                }
            }
        }

        try {
            Log.info('MQTT Hub is running...');

            this.homey.on('unload', () => this.uninstall());
            this.homey.on('memwarn', async (data) => await this.onMemwarn(data));
            this.homey.on('cpuwarn', async (data) => await this.onCpuwarn(data));
    
            this.settings = this.homey.settings.get('settings') || {};
            this.birthWill = this.settings.birthWill !== false;

            Log.setLevel(DEBUG ? 'debug' : this.settings.loglevel || DEFAULT_LOG_LEVEL);
            Log.debug(this.settings, false, false);

            this.api = await HomeyAPI.forCurrentHomey(this.homey);

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
            this.mqttClient = new MQTTClient(this.homey);
            this.messageQueue = new MessageQueue(this.mqttClient, this.settings.performanceDelay);
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

            // listen to broadcast flow card actions
            this.homey.flow.getActionCard('broadcast')
                .registerRunListener(async (args, state) => {
                    this.log('Broadcast triggered from flow');
                    try {
                        await this.refresh();
                    }
                    catch (error) {
                        this.log('Broadcast flow card trigger failed: ' + error.message);
                    }
                });

            this._initialized = true;
        }
        catch (e) {
            Log.error('[boot] Failed to initialize app');
            Log.error(e);
        }
    }
    

    initSettings() {
        let systemName = this.system.name || 'Homey';
        if (this.settings.deviceId === undefined || this.settings.systemName !== systemName || this.settings.topicRoot) {

            // Backwards compatibility
            if (this.settings.topicRoot && !this.settings.homieTopic) {
                this.settings.homieTopic = this.settings.topicRoot + '/' + (this.settings.deviceId || systemName);
                delete this.settings.topicRoot;
            }

            this.settings.systemName = systemName;
            if(!this.settings.deviceId) {
                let idx = systemName.lastIndexOf('-');
                this.settings.deviceId = idx === -1 ? systemName : systemName.substr(0, idx);
            }

            Log.debug("Settings initial deviceId: " + this.settings.deviceId);
            this.homey.settings.set('settings', this.settings);
            Log.debug("Settings updated");
        }
    }

    /**
     * Start Hub
     * */
    async start() {
        try {
            if (!this.mqttClient.isRegistered()) {
                Log.debug("Connect MQTT Client");
                await this.mqttClient.connect();
            }

            if (this.mqttClient.isRegistered()) {
                Log.info('start Hub');
                await this._sendBirthMessage();

                this.homey.setTimeout(async () => {
                    try {
                        await this.run();
                        Log.info('app running: true');
                    } catch(e) {
                        Log.error('[RUN] Hub initializasion failed');
                        Log.error(e);
                    }
                }, STARTUP_DELAY);
            } else {
                Log.debug("Waiting for MQTT Client...");
                this.mqttClient.onRegistered.subscribe(() => this.start(), true); // NOTE: Recursive
            }
        } catch (e) {
            Log.error('Failed to start Hub');
            Log.error(e);
        }
    }

    /**
     * Stop Hub
     * */
    async stop() {
        if (!this._running) return;
        this._running = false;

        Log.info('stop Hub');
        try {
            await this._sendLastWillMessage();
        } catch (e) {
            Log.error("Failed to send last will message on stop");
            Log.error(e);
        }
        try {
            Log.info("Disconnect MQTT Client");
            await this.mqttClient.disconnect();
        } catch (e) {
            Log.error("Failed to disconnect MQTTClient");
            Log.error(e);
        }

        this._stopCommunicationProtocol();
        await this._stopBroadcasters();
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
    async run(force) {
        if (force !== true && this._running) return;
        this._running = true;

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
                this.settings.homieTopic = normalize(this.settings.homieTopic);
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
    async _stopBroadcasters() {
        if (this.systemStateDispatcher) {
            Log.info("stop system state broadcaster");
            try {
                await this.systemStateDispatcher.destroy();
            } catch (e) {
                Log.error("Failed to destroy SystemState Dispatcher");
                Log.error(e);
            }
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
        Log.debug("get system info");
        const info = await this.api.system.getInfo();
        return {
            name: info.hostname,
            version: info.homey_version
        };
    }

    async getDevices() {
        if (this.deviceManager) {
            try {
                Log.debug("get devices");
                if (this.deviceManager && this.deviceManager.devices)
                    return this.deviceManager.devices;

                const api = await HomeyAPI.forCurrentHomey(this.homey);
                return await api.devices.getDevices();
            } catch (e) {
                Log.info("Failed to get Homey's devices");
                Log.error(e);
            }
        } else {
            return [];
        }
    }

    async getZones() {
        if (this.deviceManager) {
            try {
                Log.debug("get zones");
                if (this.deviceManager && this.deviceManager.zones)
                    return this.deviceManager.zones;

                const api = await HomeyAPI.forCurrentHomey(this.homey);
                return await api.zones.getZones();
            } catch (e) {
                Log.info("Failed to get Homey's zones");
                Log.error(e);
            }
        } else {
            return [];
        }
    }

    isRunning() {
        return this._running;
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
                this.stop()
                    .then(() => Log.info("App stopped"))
                    .catch(error => Log.error(error));
            }
        }
    }

    getState() {
        if (this.messageQueue) {
            const state = this.messageQueue.getState();
            //Log.debug(state);
            return state;
        }
        return {};
    }

    /**
     * Publish all device states
     * */
    async refresh() {
        Log.info('refresh');

        if (!this._initialized) return;

        if (this.mqttClient) {
            await this.mqttClient.retryFailedSubscriptions();
        }

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
            this.settings = this.homey.settings.get('settings') || {};
            Log.debug(this.settings);

            // birth & last will
            if (this.settings.birthWill) {
                if (this.birthWill !== this.settings.birthWill) {
                    await this._sendBirthMessage();
                }
            } else {
                if (this.birthWill) {
                    await this._clearBirthWill();
                }
            }
            this.birthWill = this.settings.birthWill;

            // devices
            if (this.deviceManager) {
                this.deviceChanges = this.deviceManager.computeChanges(this.settings.devices);
                this.deviceManager.setEnabledDevices(this.settings.devices);
            }

            if (this._initialized) {
                await this.run(true);
            }

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
        const deviceId = this.settings.normalize !== false ? normalize(this.settings.deviceId) : this.settings.deviceId;
        return (this.settings.birthTopic || BIRTH_TOPIC).replace('{deviceId}', deviceId);
    }
    get _willTopic() {
        const deviceId = this.settings.normalize !== false ? normalize(this.settings.deviceId) : this.settings.deviceId;
        return (this.settings.willTopic || WILL_TOPIC).replace('{deviceId}', deviceId);
    }
    async _sendBirthMessage() {
        Log.debug("Send birth message");
        if (this.mqttClient && this.settings.birthWill !== false) {
            const msg = this.settings.birthMessage || BIRTH_MESSAGE;
            return await this.mqttClient.publish(new Message(this._birthTopic, msg, 1, true));
        }
    }
    async _sendLastWillMessageAndReleaseAllTopics() {
        Log.debug("Send last will message");
        if (this.mqttClient && this.settings.birthWill !== false) {
            const msg = this.settings.willMessage || WILL_MESSAGE;
            const result = await this.mqttClient.publish(new Message(this._willTopic, msg, 1, true));
            await this.mqttClient.release(); // Notify client to release all topics used by the app
            return result;
        }
    }
    async _clearBirthWill() {
        await this.mqttClient.publish(new Message(this._birthTopic, null, 1, true));
        await this.mqttClient.publish(new Message(this._willTopic, null, 1, true));
    }

    uninstall() {
        try {
            this._sendLastWillMessageAndReleaseAllTopics()
                .then(() => this.mqttClient.disconnect().catch(e => Log.error(e)))
                .catch(error => {
                    Log.error("Failed to send last will message at uninstall");
                    Log.error(error);
                    this.mqttClient.disconnect().catch(e => Log.error(e));
                });
        } catch(e) {
            // nothing...
        }
    }

    async onMemwarn(data){
		if (data == undefined){
			data = {
				count: 0,
				limit: 0
			};
		}
		Log.debug("A memory warning has occured: "+data.count+"/"+data.limit);
		// this._flowTriggerAppMemwarn.trigger(data).catch(error => this.log("onMemwarn() flow trigger error: ", error.message));

	}

	async onCpuwarn(data){
		if (data == undefined){
			data = {
				count: 0,
				limit: 0
			};
		}
		Log.debug("A CPU warning has occured: "+data.count+"/"+data.limit);
		// this._flowTriggerAppCpuwarn.trigger(data).catch(error => this.log("onCpuwarn() flow trigger error: ", error.message));

	}
}

module.exports = MQTTHub;