"use strict";

const _ = require('lodash');
const Log = require('../Log');
const normalize = require('../normalize');
const TopicsRegistry = require('../mqtt/TopicsRegistry');

// Capability overrides
const configurations = {

    // Binary sensor
    alarm_motion: {
        payload: {
            device_class: 'motion'
        }
    },
    alarm_contact: {
        payload: {
            device_class: 'door'
        }
    },
    alarm_co: {
        payload: {
            device_class: 'gas'
        }
    },
    alarm_co2: {
        payload: {
            device_class: 'gas'
        }
    },
    alarm_pm25: {
        payload: {
            device_class: 'smoke'
        }
    },
    alarm_tamper: {
        payload: {
            device_class: 'motion'
        }
    },
    alarm_smoke: {
        payload: {
            device_class: 'smoke'
        }
    },
    alarm_fire: {
        payload: {
            device_class: 'fire'
        }
    },
    alarm_heat: {
        payload: {
            device_class: 'heat'
        }
    },
    alarm_water: {
        payload: {
            device_class: 'moisture'
        }
    },
    alarm_battery: {
        payload: {
            device_class: 'battery'
        }
    },
    //'alarm_night': {
    //    payload: {
    //        device_class: 'night' // invalid class??
    //    }
    //},

    //////////////// TODO: Implement the rest of the pre-defined capabilities /////////////

    //// Sensor
    target_temperature: {
        payload: {
            device_class: 'temperature'
        }
    },
    measure_temperature: {
        payload: {
            device_class: 'temperature'
        }
    },
    //measure_co: {
    //    payload: {
    //        device_class: 'gas' // invalid
    //    },
    //},
    //measure_co2: {
    //    payload: {
    //        device_class: 'gas' // invalid
    //    },
    //},
    //measure_pm25: {
    //    payload: {
    //        device_class: 'gas' // invalid
    //    }
    //},
    measure_humidity: {
        payload: {
            device_class: 'humidity'
        }
    },
    measure_pressure: {
        payload: {
            device_class: 'pressure'
        }
    },
    //measure_noise: {
    //    payload: {
    //        device_class: 'noise' // invalid
    //    }
    //},
    //measure_rain: {
    //    payload: {
    //        device_class: 'rain' // invalid
    //    }
    //},
    //measure_wind_strength: {
    //    payload: {
    //        device_class: 'wind' // invalid
    //    }
    //},
    //measure_wind_angle: {
    //    payload: {
    //        device_class: 'wind' // invalid
    //    }
    //},
    //measure_gust_strength: {
    //    payload: {
    //        device_class: 'gust' // invalid
    //    }
    //},
    //measure_gust_angle: {
    //    payload: {
    //        device_class: 'gust' // invalid
    //    }
    //},
    measure_battery: {
        payload: {
            device_class: 'battery'
        }
    },
    measure_power: {
        payload: {
        }
    },
    measure_voltage: {
        payload: {
        }
    },
    measure_current: {
        payload: {
        }
    },
    measure_luminance: {
        payload: {
            device_class: 'luminance'
        }
    },
    //measure_ultraviolet: {
    //    payload: {
    //        device_class: 'ultraviolet' // invlaid
    //    }
    //},
    measure_water: {
        payload: {
            device_class: 'humidity'
        }
    },

    //// Cover
    // TODO: Implement window cover: https://www.home-assistant.io/components/cover.mqtt/

    //'sensor_cover': {
    //    type: 'sensor',
    //    payload: {
    //    },
    //},

    //'windowcoverings_state': {
    //    type: 'cover',
    //    payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_tilt_up': {
    //    type: 'cover',
    //    payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_tilt_down': {
    //    type: 'cover',
    //    payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_tilt_set': {
    //    type: 'cover',
    //    payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_closed': {
    //    type: 'cover',
    //    payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_set': {
    //    type: 'cover',
    //    payload: {
    //        optimistic: true,
    //    },
    //},

    //// Vacuum
    // TODO: implement vacuum: https://www.home-assistant.io/components/vacuum.mqtt/
    //'vacuumcleaner_state': {
    //    type: 'vacuum',
    //}
};

const sensorClasses = new Set([
    'battery',
    'humidity',
    'illuminance',
    'temperature',
    'pressure',
    'timestamp'
]);

const binarySensorClasses = new Set([
    'battery',
    'cold',
    'connectivity',
    'door',
    'pressure',
    'garage_door',
    'gas',
    'heat',
    'light',
    'lock',
    'moisture',
    'motion',
    'moving',
    'occupancy',
    'opening',
    'plug',
    'power',
    'presence',
    'problem',
    'safety',
    'smoke',
    'sound',
    'vibration',
    'window'
]);

const coverClasses = new Set([
    'damper',
    'garage',
    'window'
]);

const DEFAULT_TOPIC = 'homeassistant';
const STATUS_TOPIC = 'homeassistant/status';
const STATUS_ONLINE = 'online';
const STATUS_OFFLINE = 'offline';

/**
 * Home Assistant Discovery
 * */
class HomeAssistantDispatcher {

    constructor({ api, mqttClient, deviceManager, system, homieDispatcher, messageQueue, topicsRegistry }) {
        this.api = api;
        this.mqttClient = mqttClient;
        this.deviceManager = deviceManager;
        this.system = system;
        this.homieDispatcher = homieDispatcher;
        this.messageQueue = messageQueue;
        this.topicsRegistry = topicsRegistry;

        this._registered = new Set();
        this._topics = new TopicsRegistry(messageQueue);

        if (mqttClient) {
            this._clientCallback = this._onMessage.bind(this);
            this.mqttClient.onMessage.subscribe(this._clientCallback);
        }
    }

    breakingChanges(settings, update) {
        const hash = JSON.stringify({
            hass: settings.hass,
            hassTopic: settings.hassTopic,
            hassStatusTopic: settings.hassStatusTopic
        });
        const changed = this._settingsHash !== hash;
        if (update) {
            this._settingsHash = hash;
        }
        return changed || this.homieDispatcher.breakingChanges(settings);
    }

    //clearTopic(topic) {
    //    this.messageQueue.add(topic, null, { retain: true });
    //}

    async init(settings, deviceChanges) {
        if (!this.mqttClient) return;
            
        try {
            this.enabled = settings.hass;
            if (!this.enabled) {
                this._topics.clear();
                return;
            }

            this.normalize = settings.normalize;
            this.deviceId = settings.normalize !== false ? normalize(settings.deviceId) : settings.deviceId;

            await this.registerHassStatus(settings);

            let topic = (settings.hassTopic || DEFAULT_TOPIC).replace('{deviceId}', this.deviceId);

            if (this.breakingChanges(settings, true)) {

                if (this.topic !== topic) {
                    this._topics.clear();
                }
                this.topic = topic.split('/').filter(x => x).join('/');

                if (this.enabled) {
                    // NOTE: If the client is already connected, the 'connect' event won't be fired. 
                    // Therefore we mannually dispatch the state if already connected/registered.
                    if (this.mqttClient.isRegistered()) {
                        this.dispatchState();
                    } else {
                        this.mqttClient.onRegistered.subscribe(() => this.dispatchState(), true);
                    }
                }
            } else if (deviceChanges) { // update changed devices only
                Log.info("Update settings for changed devices only");
                if (this.enabled) {
                    for (let deviceId of deviceChanges.enabled) {
                        if (typeof deviceId === 'string') {
                            this.enableDevice(deviceId);
                        }
                    }
                }
                for (let deviceId of deviceChanges.disabled) {
                    if (typeof deviceId === 'string') {
                        this.disableDevice(deviceId);
                    }
                }
            }

            Log.info("HomeAssistant Dispatcher initialized");
        } catch (e) {
            Log.error("Failed to initialize HomeAssistantDispatcher");
            Log.error(e);
        }
    }

    async registerHassStatus(settings) {
        const statusTopic = settings.hassStatusTopic || STATUS_TOPIC;
        this.hassOnlineMessage = settings.hassOnlineMessage || STATUS_ONLINE;
        this.hassOfflineMessage = settings.hassOfflineMessage || STATUS_OFFLINE;
        if (this.statusTopic !== statusTopic) {
            if (this.statusTopic) {
                await this.mqttClient.unsubscribe(this.statusTopic);
            }
            this.statusTopic = statusTopic;
            if (this.statusTopic) {
                await this.mqttClient.subscribe(this.statusTopic);
            }
        }
    }

    async _onMessage(topic, message) {

        if (topic !== this.statusTopic) return;

        Log.debug("Received HomeAssistant status message: " + message);

        try {
            if (message === this.hassOnlineMessage && this.mqttClient.isRegistered()) {
                Log.info('Dispatch state');
                this.dispatchState();
                this.homieDispatcher.dispatchState();
            }
            // Note: Hass offline message is discarded
        } catch (e) {
            Log.info('Error handling HomeAssistant status message');
            Log.debug(topic);
            Log.debug(message);
            Log.error(e);
        }
    }

    dispatchState() {
        this._registered = new Set();
        this.registerDevices();
    }

    // Get all devices and add them
    registerDevices() {
        Log.info("Home Assistant discovery: register devices");
        const devices = this.deviceManager.devices;
        if (devices) {
            for (let key in devices) {
                if (devices.hasOwnProperty(key)) {
                    this._registerDevice(devices[key]);
                }
            }
        }
    }

    // Remove all device registrations
    unregisterDevices() {
        Log.debug("HomeAssistantDispatcher.unregisterDevices");
    }

    _registerDevice(device) {
        if (!device || !(device || {}).id) {
            Log.debug("invalid device");
            return;
        } 

        if (!device.capabilitiesObj || typeof device.capabilitiesObj !== 'object') {
            Log.debug("[skip] Device without capabilities");
            return;
        } 

        if (!this.deviceManager.isDeviceEnabled(device.id)) {
            //Log.info('[SKIP] Device disabled');
            this.disableDevice(device.id);
            return;
        }

        if (this._registered.has(device.id)) {
            Log.debug("[SKIP] Already registered");
            return;
        }
        this._registered.add(device.id);

        Log.debug("HASS discover: " + device.name);

        const remainingCapabilities = this._registerDeviceClass(device);
        this._registerCapabilities(device, remainingCapabilities);
    }

    _registerDeviceClass(device) {

        const capabilities = { ...device.capabilitiesObj };

        try {
            switch (device.class) {
                case 'light':
                    this._registerLight(device).forEach(id => delete capabilities[id]);
                    break;
                case 'thermostat':
                    this._registerThermostat(device).forEach(id => delete capabilities[id]);
                    break;
                case 'windowcoverings':
                case 'curtain':
                case 'blinds':
                case 'sunshade':
                    this._registerCover(device).forEach(id => delete capabilities[id]);
                    break;
                case 'heater':
                case 'socket':
                case 'vacuumcleaner':
                case 'fan':
                case 'sensor':
                case 'kettle':
                case 'coffeemachine':
                case 'homealarm':
                case 'speaker':
                case 'button':
                case 'doorbell':
                case 'lock':
                case 'tv':
                case 'amplifier':
                case 'remote':
                case 'other':
                default:
                    // capture all other devices with onoff & dim capabilities and create a light device for it
                    if (capabilities) {
                        if (capabilities.hasOwnProperty('onoff') && capabilities.hasOwnProperty('dim')) {
                            this._registerLight(device).forEach(id => delete capabilities[id]);
                        }

                        // capture all other window coverings
                        if (capabilities.hasOwnProperty('windowcoverings_state')) {
                            this._registerCover(device).forEach(id => delete capabilities[id]);
                        }
                    }

                    // nothing
                    break;
            }
        } catch (e) {
            Log.error("Failed to register device by class");
            Log.error(e);
        }

        return capabilities;
    }

    _registerLight(device) {
        const capabilities = device.capabilitiesObj;
        if (!capabilities) return [];

        const stateTopic = this.homieDispatcher.getTopic(device);
        const type = 'light';

        const payload = {
            name: device.name,
            unique_id: `${device.id}_${type}`,
            payload_on: "true",
            payload_off: "false",
            state_topic: `${stateTopic}/onoff`,
            state_value_template: '{{ value }}',
            command_topic: `${stateTopic}/onoff/set`,
            //on_command_type: 'first' // send 'onoff' before sending state (dim, color, etc.)
            //on_command_type: 'last' // send 'onoff' after sending state (dim, color, etc.)
            //on_command_type: 'brightness' // skip 'on' command
            on_command_type: device.class === 'light' ? 'first' : 'brightness'
        };

        if (capabilities.hasOwnProperty('dim')) {
            payload.brightness_state_topic = `${stateTopic}/dim`;
            payload.brightness_command_topic = `${stateTopic}/dim/set`;
            payload.brightness_value_template = "{{ value }}";
            payload.brightness_scale = 100;
        }
        if (capabilities.hasOwnProperty('light_temperature')) {
            payload.color_temp_state_topic = `${stateTopic}/color/v`;
            payload.color_temp_command_topic = `${stateTopic}/color/set`;

            // Homie values are 0...100
            // HASS: The color temperature command slider has a range of 153 to 500 mireds (micro reciprocal degrees).
            payload.color_temp_value_template = "{{ ((((value | float / 100) * (500 - 153)) + 153)) | round(0) }}";
        }
        if (capabilities.hasOwnProperty('light_hue') || capabilities.hasOwnProperty('light_saturation')) {
            payload.hs_state_topic = `${stateTopic}/color/hsv`;
            payload.hs_command_topic = `${stateTopic}/color/set`;
            payload.hs_value_template = `{{ value_json.h }},{{ value_json.s }}`;
        }

        // TODO: light_mode
        // TODO: RGB color setting
        
        let topic = [device.name, 'config'].filter(x => x).join('/');
        if (this.normalize) {
            topic = normalize(topic);
        }
        this._registerConfig(device, type, `${this.topic}/${type}/${topic}`, payload);

        return ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'color', 'rgb', 'hsv'];
    }

    _registerThermostat(device) {
        const capabilities = device.capabilitiesObj;
        if (!capabilities) return [];

        const stateTopic = this.homieDispatcher.getTopic(device);
        const type = 'climate';

        //const capability = device.capabilitiesObj['measure-temperature'] || device.capabilitiesObj['target-temperature'] || device.capabilitiesObj['measure-temperature'];
        //let unit = capability
        //    ? (capability.units && typeof capability.units === 'object' ? capability.units['en'] : capability.units)
        //    : undefined;

        const payload = {
            name: device.name,
            unique_id: `${device.id}_${type}`,
            current_temperature_topic: `${stateTopic}/measure-temperature`,
            current_temperature_template: `{{ value }}`,
            temperature_state_topic: `${stateTopic}/target-temperature`,
            temperature_command_topic: `${stateTopic}/target-temperature/set`,
            temperature_state_template: `{{ value }}`,
            min_temp: 5,
            max_temp: 30,
            temp_step: 0.5,
            //unit_of_measurement: unit || '°C'  // NOT Supported?
        };

        if (capabilities.hasOwnProperty('onoff')) {
            payload.payload_on = `true`;
            payload.payload_off = `false`;
            payload.state_topic = `${stateTopic}/onoff`;
            //payload.power_state_topic = `${stateTopic}/onoff`;
            payload.power_command_topic = `${stateTopic}/onoff/set`;
            payload.value_template = '{{ value }}';
        }

        // TODO: Implement thermostat modes
        if (capabilities.hasOwnProperty('custom-thermostat-mode')) {
            payload.mode_state_topic = `${stateTopic}/custom-thermostat-mode`;
            payload.mode_command_topic = `${stateTopic}/custom-thermostat-mode/set`;
            payload.modes = ['auto', 'off', 'cool', 'heat', 'dry', 'fan_only'];
            payload.mode_state_template = "{% set values = { 'schedule':'auto', 'manual':'heat', 'notused':'cool', 'off':'off'} %}{{ values[value] if value in values.keys() else 'off' }}";
        }

        let topic = [device.name, 'config'].filter(x => x).join('/');
        if (this.normalize) {
            topic = normalize(topic);
        }
        this._registerConfig(device, type, `${this.topic}/${type}/${topic}`, payload);

        return ['onoff', 'measure-temperature', 'target-temperature', 'custom-thermostat-mode'];
    }

    _registerCover(device) {
        const capabilities = device.capabilitiesObj;
        if (!capabilities) return [];

        const stateTopic = this.homieDispatcher.getTopic(device);
        const type = 'cover';

        /*
         cover:
            command_topic: "home-assistant/cover/set"
            state_topic: "home-assistant/cover/state"
            availability_topic: "home-assistant/cover/availability"
            payload_open: "OPEN"
            payload_close: "CLOSE"
            payload_stop: "STOP"
            state_open: "open"
            state_closed: "closed"
            value_template: '{{ value.x }}'
            tilt_command_topic: 'home-assistant/cover/tilt'
            tilt_status_topic: 'home-assistant/cover/tilt-state'
            tilt_min: 0
            tilt_max: 180
            tilt_closed_value: 70
            tilt_opened_value: 180
         */

        //windowcoverings_state	enum up	[up|idle|down]
        //windowcoverings_set	number 0
        //dim	number	0.02

        const payload = {
            name: device.name,
            unique_id: `${device.id}_${type}`,
            //value_template: '{{ value }}',
        };

        const hasState = capabilities.hasOwnProperty('windowcoverings_state');
        if (hasState) {
            const coverStateTopic = this.normalize ? normalize('windowcoverings_state') : 'windowcoverings_state';
            payload.state_topic = `${stateTopic}/${coverStateTopic}`;
            payload.state_open = 'up';
            payload.state_closed = 'down';
            if (capabilities.windowcoverings_state.setable) {
                payload.command_topic = `${stateTopic}/${coverStateTopic}/set`;
                payload.payload_open = 'up';
                payload.payload_close = 'down';
                payload.payload_stop = 'idle';
            }
        }

        // NOTE: If position_topic is set state_topic is ignored.
        if (!hasState || !capabilities.windowcoverings_state.setable) {
            const position = capabilities.hasOwnProperty('dim') ? 'dim'
                            : capabilities.hasOwnProperty('windowcoverings_set') ? 'windowcoverings_set'
                            : undefined;
            if (position) {
                const positonTopic = this.normalize ? normalize(position) : position;
                payload.position_topic = `${stateTopic}/${positonTopic}`;
                payload.position_template = '{{ value }}',
                payload.position_closed = capabilities[position].min || 0;
                payload.position_open = capabilities[position].max || 100;
                if (capabilities[position].setable) {
                    payload.set_position_topic = `${stateTopic}/${positonTopic}/set`;
                    payload.set_position_template = '{{ value }}';
                }
            }
        }

        if (capabilities.hasOwnProperty('windowcoverings_tilt_set')) {
            const tiltTopic = this.normalize ? normalize('windowcoverings_tilt_set') : 'windowcoverings_tilt_set';
            payload.tilt_status_topic = `${stateTopic}/${tiltTopic}`;
            if (capabilities['windowcoverings_tilt_set'].setable) {
                payload.tilt_command_topic = `${stateTopic}/${tiltTopic}/set`;
                payload.tilt_min = capabilities['windowcoverings_tilt_set'].min || 0;
                payload.tilt_max = capabilities['windowcoverings_tilt_set'].max || 180;
                //payload.tilt_closed_value = 70
                //payload.tilt_opened_value = 180
            }
        }

        let topic = [device.name, 'config'].filter(x => x).join('/');
        if (this.normalize) {
            topic = normalize(topic);
        }
        this._registerConfig(device, type, `${this.topic}/${type}/${topic}`, payload);

        return ['windowcoverings_state', 'windowcoverings_set', 'dim', 'windowcoverings_tilt_set'];
    }

    _registerCapabilities(device, capabilities) {
        if (!device || !capabilities) return;

        Log.debug("HASS: register (remaining) capabilities: " + device.name);
        for (let key in capabilities) {
            if (capabilities.hasOwnProperty(key)) {
                const capability = capabilities[key];
                if (capability && capability.id) {
                    this._registerCapability(device, capability);
                }
            }
        }
    }

    _registerCapability(device, capability) {
        if (typeof device !== 'object' || typeof capability !== 'object') return undefined;

        const config = this._createConfig(device, capability);
        if (!config) {
            Log.debug(`[SKIP] No config for: ${device.name} - ${capability.id}`);
            return undefined;
        }

        const capabilityTitle = capability.title && typeof capability.title === 'object' ? capability.title['en'] : capability.title;
        const capabilityName = capabilityTitle || capability.desc || capability.id;
        const type = config.type;
        const stateTopic = this.homieDispatcher.getTopic(device, capability);

        const payload = {
            name: `${device.name} - ${capabilityName}`,
            unique_id: `${device.id}_${capability.id}`,
            state_topic: stateTopic
        };

        if (capability.setable && ['alarm', 'binary_sensor', 'cover', 'fan', 'lock', 'switch', 'vacuum'].includes(type)) {
            payload.command_topic = `${stateTopic}/set`;
        }

        //// Set availability payload
        //payload.availability_topic = `${nodeTopic}/availability`;

        // Add precision to value_template
        //if (capability.decimals) {
        //    let template = payload.value_template;
        //    if (typeof template === 'string') {
        //        template = template.replace('{{ ', '').replace(' }}', '');
        //        template = `{{ (${template} | float) | round(${capability.decimals}) }}`;
        //        payload.value_template = template;
        //    }
        //}

        // final payload = above payload with added & overidden values from config
        let topic = [device.name, capability.id, 'config'].filter(x => x).join('/');
        if (this.normalize) {
            topic = normalize(topic);
        }
        this._registerConfig(device, type, `${this.topic}/${type}/${topic}`, { ...payload, ...config.payload });
    }

    _createConfig(device, capability) {
        if (typeof capability.id !== 'string') return undefined;

        // based on capability type from id (i.e. type_property)
        //switch (capability.id.split('_').shift()) {
        //    case 'alarm':
        //        return {
        //            type: 'alarm',
        //            payload: {
        //                payload_on: "true",
        //                payload_off: "false",
        //                device_class: 'alarm'
        //            }
        //        };
        //}

        // based on capability data type
        let cfg;
        switch (capability.type) {
            case 'boolean':
                cfg = {
                    type: capability.setable ? 'switch' : 'binary_sensor',
                    payload: {
                        payload_on: "true",
                        payload_off: "false"
                    }
                };
                return cfg;
            case 'number':
            case 'float':
            case 'integer':
            case 'string':
            case 'enum':
                cfg = {
                    type: 'sensor',
                    payload: {}
                };
                const unit = capability.units && typeof capability.units === 'object' ? capability.units['en'] : capability.units;
                if (unit) {
                    cfg.payload.unit_of_measurement = unit;
                }
                return cfg;
            default:
                return undefined;
        }
    }

    _registerConfig(device, type, topic, config) {
        if (!device || !topic || !config) return;

        if (!type) {
            Log.error('HASS: No device type provided');
            return;
        }
        if (!config.name) {
            Log.error('HASS: No config name provided');
            return;
        }

        Log.debug(`HASS: Register [${type}]: ${config.name}`);

        // Include device info
        config.device = {
            identifiers: `${this.deviceId}_${device.id}`,
            name: device.name
        };

        if (['binary_sensor', 'sensor'].includes(type)) {
            config.value_template = config.value_template || '{{ value }}';
        }

        this.publish(device.id, topic, config, true);
    }

    publish(deviceId, topic, payload, retained) {
        this.topicsRegistry.register(deviceId, topic);
        this._topics.register(deviceId, topic);
        
        this.messageQueue.add(topic, payload, { qos:0, retained: retained !== false });
    }

    _unregisterDevice(device) {
        if (typeof device === 'object' && device.id) {
            this._registered.delete(device.id);
            this._topics.remove(device.id, true);
        }
    }

    enableDevice(deviceId) {
        //if (this._nodes.has(deviceId))
        //    return;
        
        const device = this.deviceManager.devices[deviceId];
        if (device) {
            Log.info("Enable device: " + device.name);
            this._registerDevice(device);
        } else {
            Log.error("Failed to register device: Device not found");
        }
    }

    disableDevice(deviceId) {
        if (this._registered.has(deviceId))
            return;

        const device = this.deviceManager.devices[deviceId];
        if (device) {
            Log.info("Disable device: " + device.name);
            this._unregisterDevice(device);
        } else {
            Log.error("Failed to unregister device: Device not found");
        }
    }

    destroy() {
        if (this.mqttClient) {
            this.mqttClient.onMessage.unsubscribe(this._clientCallback);
            this._topics.clear();
        }
        Log.debug('Destroy HomeAssistantDispatcher');
    }
}

module.exports = HomeAssistantDispatcher;
