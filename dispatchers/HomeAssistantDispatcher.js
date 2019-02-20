"use strict";

const _ = require('lodash');
const Log = require('../Log');
const normalize = require('../normalize');

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

    //////////////// TODO: Iplement the rest of the pre-defined capabilities /////////////

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
            icon: 'mdi:flash'
        }
    },
    measure_voltage: {
        payload: {
            icon: 'mdi:flash'
        }
    },
    measure_current: {
        payload: {
            icon: 'mdi:flash'
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
    //        icon: 'mdi:view-array',
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

const NodeRed = { // Node RED
    //switch (Dtype) {     // TODO check is settable & has name & properties
    //    case "button": // not working in MQTT-Gateway
    //        node.warn("button TOFIX");
    //        newmsg = {
    //            topic: "homeassistant/switch" + "/" + homey + "/" + device + "/config",
    //            payload: {
    //                "name": Dname,
    //                "icon": "mdi:adjust",
    //                "payload_off": "false",
    //                "payload_on": "true",
    //                "state_topic": "homie/" + homey + "/" + device + "/onoff",
    //                "command_topic": "homie/" + homey + "/" + device + "/onoff" + "/set"
    //            }
    //        }
    //        break;
    //    case "switch":
    //    case "socket":
    //        //node.warn ("Adding socket: " + Dname)
    //        newmsg = {
    //            topic: "homeassistant/switch" + "/" + homey + "/" + device + "/config",
    //            payload: {
    //                "name": Dname,
    //                "icon": "mdi:nature",
    //                "payload_off": "false",
    //                "payload_on": "true",
    //                "state_topic": "homie/" + homey + "/" + device + "/onoff",
    //                "command_topic": "homie/" + homey + "/" + device + "/onoff" + "/set"
    //            }
    //        };
    //        break;
    //    case "light":
    //        //node.warn ("Adding light: " + Dname)
    //        newmsg = {
    //            topic: "homeassistant/light/" + homey + "/" + device + "/config",
    //            payload: {
    //                "name": Dname,
    //                "icon": "mdi:nature",
    //                "payload_off": "false",
    //                "payload_on": "true",
    //                "state_topic": "homie/" + homey + "/" + device + "/onoff",
    //                "command_topic": "homie/" + homey + "/" + device + "/onoff" + "/set",
    //                "brightness_state_topic": "homie/" + homey + "/" + device + "/dim*100",
    //                "brightness_command_topic": "homie/" + homey + "/" + device + "/dim" + "/set*100", "brightness_scale": "100"
    //            }
    //        };
    //        if (Colour) newmsg = {
    //            topic: "homeassistant/light/" + homey + "/" + device + "/config",
    //            payload: {
    //                "name": Dname,
    //                "icon": "mdi:nature",
    //                "payload_off": "false",
    //                "payload_on": "true",
    //                "state_topic": "homie/" + homey + "/" + device + "/onoff",
    //                "command_topic": "homie/" + homey + "/" + device + "/onoff" + "/set",
    //                "brightness_state_topic": "homie/" + homey + "/" + device + "/dim*100",
    //                "brightness_command_topic": "homie/" + homey + "/" + device + "/dim" + "/set*100",
    //                "brightness_scale": "100",
    //                "hs_state_topic": "homie/" + homey + "/" + device + "/color_hsv",
    //                "hs_command_topic": "homie/" + homey + "/" + device + "/color/set_hs"
    //            }
    //        };
    //        break;
    //    case "thermostat":
    //        //node.warn ("Adding thermostat: " + Dname)
    //        newmsg = {
    //            topic: "homeassistant/climate/" + homey + "/" + device + "/config",
    //            payload: {
    //                "name": Dname,
    //                "curr_temp_t": "homie/" + homey + "/" + device + "/measure-temperature",
    //                "temp_stat_t": "homie/" + homey + "/" + device + "/target-temperature",
    //                "temp_cmd_t": "homie/" + homey + "/" + device + "/target-temperature/set",
    //                "mode_stat_t": "homie/" + homey + "/" + device + "/custom-thermostat-mode",
    //                "mode_stat_tpl": "{% set values = { 'schedule':'auto', 'manual':'heat',  'notused':'cool', 'off':'off'} %}{{ values[value] if value in values.keys() else 'off' }}",
    //                "mode_cmd_t": "homie/" + homey + "/" + device + "/custom-thermostat-mode/set",
    //                "min_temp": "5",
    //                "max-temp": "30",
    //                "temp_step": "0.5",
    //                "unit_of_measurement": "°C"
    //            }
    //        };
    //        break;
    //    case "sensor":
    //        //node.warn ("Adding sensor: " + Dname) 
    //        //node.warn (device + "~" + Dname + "~" + sensor)
    //        var Dunit = local[tpath + contents[3] + "/" + "$unit"];
    //        if (Dunit === undefined) Dunit = "";
    //        var xdevice = device + sensor;
    //        Dname = Dname + " " + sensor;
    //        newmsg = {
    //            topic: "homeassistant/sensor/" + homey + "/" + device + Lsensor + "/config",
    //            payload: {
    //                "name": Dname,
    //                "state_topic": "homie/" + homey + "/" + device + "/" + Lsensor,
    //                "unit_of_measurement": Dunit
    //            }
    //        }; //"value_template": "{{ value_json.humidity }}"}}
    //        //return [ newmsg1, newmsg2] 
    //        break;
    //    default:
    //        node.error("## Unhandled type " + Dname + " " + Dtype + " ## PLEASE REPORT");
    //        return null;
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

{
/* device classes
    SENSOR:
        battery: Percentage of battery that is left.
        humidity: Percentage of humidity in the air.
        illuminance: The current light level in lx or lm.
        temperature: Temperature in °C or °F.
        pressure: Pressure in hPa or mbar.
        timestamp: Datetime object or timestamp string.
    
    BINARY SENSOR:
        battery: On means low, Off means normal
        cold: On means cold, Off means normal
        connectivity: On means connected, Off means disconnected
        door: On means open, Off means closed
        garage_door: On means open, Off means closed
        gas: On means gas detected, Off means no gas (clear)
        heat: On means hot, Off means normal
        light: On means light detected, Off means no light
        lock: On means open (unlocked), Off means closed (locked)
        moisture: On means moisture detected (wet), Off means no moisture (dry)
        motion: On means motion detected, Off means no motion (clear)
        moving: On means moving, Off means not moving (stopped)
        occupancy: On means occupied, Off means not occupied (clear)
        opening: On means open, Off means closed
        plug: On means device is plugged in, Off means device is unplugged
        power: On means power detected, Off means no power
        presence: On means home, Off means away
        problem: On means problem detected, Off means no problem (OK)
        safety: On means unsafe, Off means safe
        smoke: On means smoke detected, Off means no smoke (clear)
        sound: On means sound detected, Off means no sound (clear)
        vibration: On means vibration detected, Off means no vibration (clear)
        window: On means open, Off means closed
    
    COVER:
        damper: Ventilation damper controller.
        garage: Garage door controller.
        window: Window controller.
 */
}

// NOTE: Make configurable
const DEFAULT_DEVICE_ID = 'homey';
const DEFAULT_TOPIC_ROOT = 'homeassistant';
const STATUS_TOPIC = 'hass/status';
const STATUS_ONLINE = 'online';
const STATUS_OFFLINE = 'offline';

/**
 * Home Assistant Discovery
 * */
class HomeAssistantDispatcher {

    get _topicRoot() {
        return this.settings && this.settings.haRoot ? this.settings.haRoot : DEFAULT_TOPIC_ROOT; // TODO: add haRoot property to settings
    }
    get _deviceId() {
        return this.settings && this.settings.deviceId ? this.settings.deviceId : DEFAULT_DEVICE_ID;
    }

    constructor({ api, mqttClient, deviceManager, system, settings, homieDispatcher, messageQueue }) {
        this.api = api;
        this.mqttClient = mqttClient;
        this.deviceManager = deviceManager;
        this.system = system;
        this.homieDispatcher = homieDispatcher;
        this.messageQueue = messageQueue;

        this._registered = new Set();

        this.updateSettings(settings);
    }

    async register() {
        try {
            await this._init();
            Log.info("HomeAssistant Dispatcher initialized");
        } catch (e) {
            Log.error("Failed to initialize HomeAssistantDispatcher");
            Log.error(error);
        }
    }
    
    async _init() {

        // subscribe the HASS Birth & Last will messages
        await this.mqttClient.subscribe(STATUS_TOPIC);
        this._clientCallback = this._onMessage.bind(this);
        this.mqttClient.onMessage.subscribe(this._clientCallback);

        // NOTE: If the client is already connected, the 'connect' event won't be fired. 
        // Therefore we mannually dispatch the state if already connected/registered.
        if (this.mqttClient.isRegistered())
            this.dispatchState();
        else
            this.mqttClient.onRegistered.subscribe(() => this.dispatchState(), true);
    }

    async _onMessage(topic, message) {

        if (topic !== STATUS_TOPIC) return;

        Log.info("Received HASS Birth message: " + message);

        try {
            if (message === STATUS_ONLINE && this.mqttClient.isRegistered()) {
                Log.info('Dispatch state');
                this.dispatchState();
                this.homieDispatcher.dispatchState();
            }
        } catch (e) {
            Log.info('Error handling HASS status message');
            Log.debug(topic);
            Log.debug(message);
            Log.error(e);
        }
    }

    dispatchState() {
        this._registered = new Set();
        this.registerDevices();
    }

    updateSettings(settings, deviceChanges) {
        settings = settings || {};
        const current = this.settings ? JSON.stringify(this.settings) : null;
        this.settings = this.settings || {};

        //this.settings.topicRoot = settings.topicRoot === undefined ? DEFAULT_TOPIC_ROOT : settings.topicRoot;
        this.settings.deviceId = normalize(settings.deviceId || this.system.name || DEFAULT_DEVICE_ID);
        //this.settings.topicIncludeClass = settings.topicIncludeClass === true;
        //this.settings.topicIncludeZone = settings.topicIncludeZone === true;
        //this.settings.percentageScale = settings.percentageScale || DEFAULT_PROPERTY_SCALING;
        //this.settings.colorFormat = settings.colorFormat || DEFAULT_COLOR_FORMAT;

        // Breaking changes? => Start a new HomieDevice (& destroy current)
        if (current && current !== JSON.stringify(this.settings)) {
            // TODO: Implement
        } else if (deviceChanges) { // update changed devices only
            Log.info("Update settings for changed devices only");
            for (let deviceId of deviceChanges.enabled) {
                if (typeof deviceId === 'string') {
                    this.enableDevice(deviceId);
                }
            }
            for (let deviceId of deviceChanges.disabled) {
                if (typeof deviceId === 'string') {
                    this.disableDevice(deviceId);
                }
            }
        }
    }

    // Get all devices and add them
    registerDevices() {
        Log.info("register devices");
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
        Log.info("HomeAssistantDispatcher.unregisterDevices");
    }

    _registerDevice(device) {
        if (!device || !(device || {}).id) {
            Log.info("invalid device");
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

        Log.info("Home Assistant discover: " + device.name);

        const remainingCapabilities = this._registerDeviceClass(device);
        this._registerCapabilities(device, remainingCapabilities);
    }

    _registerDeviceClass(device) {

        const capabilities = { ...device.capabilitiesObj };

        switch (device.class) {
            case 'light':
                this._registerLight(device).forEach(id => delete capabilities[id]);
                break;
            case 'thermostat':
                this._registerThermostat(device).forEach(id => delete capabilities[id]);
                break;
            case 'socket':
            case 'vacuumcleaner':
            case 'fan':
            case 'heater':
            case 'sensor':
            case 'kettle':
            case 'coffeemachine':
            case 'homealarm':
            case 'speaker':
            case 'button':
            case 'doorbell':
            case 'lock':
            case 'windowcoverings':
            case 'tv':
            case 'amplifier':
            case 'curtain':
            case 'blinds':
            case 'sunshade':
            case 'remote':
            case 'other':
            default:
                // nothing
                break;
        }

        return capabilities;
    }

    _registerLight(device) {
        const capabilities = device.capabilitiesObj;
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
            on_command_type: 'first' // send 'onoff' before sending state (dim, color, etc.)
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
            payload.color_temp_value_template = "{{ ((value | float / 100) * (500 - 153)) + 153  }}";
        }
        if (capabilities.hasOwnProperty('light_hue') || capabilities.hasOwnProperty('light_saturation')) {
            payload.hs_state_topic = `${stateTopic}/color/hsv`;
            payload.hs_command_topic = `${stateTopic}/color/set`;
            payload.hs_value_template = `{{ value_json.h }},{{ value_json.s }}`;
        }

        // TODO: light_mode
        // TODO: RGB color setting
        
        const topic = [this._topicRoot, type, normalize(device.name), 'config'].join('/');
        this._registerConfig(device, type, topic, payload);

        return ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'color', 'rgb', 'hsv'];
    }

    _registerThermostat(device) {
        const capabilities = device.capabilitiesObj;
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

        const topic = [this._topicRoot, type, normalize(device.name), 'config'].join('/');
        this._registerConfig(device, type, topic, payload);

        return ['onoff', 'measure-temperature', 'target-temperature', 'custom-thermostat-mode'];
    }

    _registerCapabilities(device, capabilities) {
        if (!device || !capabilities) return;

        Log.info("HASS: register (remaining) capabilities: " + device.name);
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

        const deviceId = normalize(device.name);
        const capabilityId = normalize(capability.id);
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
        const topic = [this._topicRoot, type, deviceId, capabilityId, 'config'].join('/');
        this._registerConfig(device, type, topic, { ...payload, ...config.payload });
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

        // TODO: icons

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
                if (capability.setable) {
                    cfg.payload.icon = 'mdi:power';
                }
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
            identifiers: `${this._deviceId}_${device.id}`,
            name: device.name
        };

        if (['binary_sensor', 'sensor'].includes(type)) {
            config.value_template = config.value_template || '{{ value }}';
        }

        this.publish(topic, config);
    }

    publish(topic, payload, retained) {
        this.messageQueue.add(topic, payload, { qos:0, retained: retained !== false });
    }

    _unregisterDevice(device) {

        // TODO: Implement
    }

    enableDevice(deviceId) {
        //if (this._nodes.has(deviceId))
        //    return;
        
        const device = this.deviceManager.devices[deviceId];
        if (device) {
            Log.info("Enable device: " + device.name);

            // TODO: Implement

        } else {
            Log.error("Failed to register device: Device not found");
        }
    }

    disableDevice(deviceId) {
        //if (!this._nodes.has(deviceId))
        //    return;

        const device = this.deviceManager.devices[deviceId];
        if (device) {
            Log.info("Disable device: " + device.name);
            this._unregisterDevice(device);
        } else {
            Log.error("Failed to unregister device: Device not found");
        }
    }

    destroy() {
        Log.info('Destroy HomeAssistantDispatcher');
    }
}

module.exports = HomeAssistantDispatcher;
