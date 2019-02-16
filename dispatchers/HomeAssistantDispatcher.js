"use strict";

const _ = require('lodash');
const Log = require('../Log');
const normalize = require('../normalize');
//const Color = require('../Color');

const configurations = {

    // Binary sensor
    //'alarm_generic': {
    //    type: 'binary_sensor',
    //    type: 'alarm',
    //    payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.alarm }}',
    //        device_class: 'alarm',
    //    },
    //},
    //'alarm_motion': {
    //    type: 'binary_sensor',
    //    type: 'motion',
    //    payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.motion }}',
    //        device_class: 'motion',
    //    },
    //},
    //'alarm_contact': {
    //    type: 'binary_sensor',
    //    type: 'contact',
    //    payload: {
    //        payload_on: false,
    //        payload_off: true,
    //        value_template: '{{ value_json.contact }}',
    //        device_class: 'door',
    //    },
    //},
    //'alarm_co': {
    //    type: 'binary_sensor',
    //    type: 'alarm_co',
    //    payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.alarm_co }}',
    //        device_class: 'gas',
    //    },
    //},
    //'alarm_co2': {
    //    type: 'binary_sensor',
    //    type: 'alarm_co2',
    //    payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.alarm_co2 }}',
    //        device_class: 'gas',
    //    },
    //},
    //'alarm_pm25': {
    //    type: 'binary_sensor',
    //    type: 'alarm_pm25',
    //    payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.alarm_pm25 }}',
    //        device_class: 'dust',
    //    },
    //},
    //'alarm_tamper': {
    //    type: 'binary_sensor',
    //    type: 'tamper',
    //    payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.tamper }}',
    //        device_class: 'motion',
    //    },
    //},
    //'alarm_smoke': {
    //    type: 'binary_sensor',
    //    type: 'smoke',
    //    payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.smoke }}',
    //        device_class: 'smoke',
    //    },
    //},
    //'alarm_fire': {
    //    type: 'binary_sensor',
    //    type: 'fire',
    //    payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.fire }}',
    //        device_class: 'fire',
    //    },
    //},
    //'alarm_heat': {
    //    type: 'binary_sensor',
    //    type: 'heat',
    //    payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.heat }}',
    //        device_class: 'heat',
    //    },
    //},
    //'alarm_water': {
    //    type: 'binary_sensor',
    //    type: 'alarm_water',
    //    payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.alarm_water }}',
    //        device_class: 'moisture',
    //    },
    //},
    //'alarm_battery': {
    //    type: 'binary_sensor',
    //    type: 'alarm_battery',
    //    payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.alarm_battery }}',
    //        device_class: 'battery',
    //    },
    //},
    //'alarm_night': {
    //    type: 'binary_sensor',
    //    type: 'alarm_night',
    //    payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.alarm_night }}',
    //        device_class: 'night',
    //    },
    //},

    //////////////// TODO: Iplement the rest of the pre-defined capabilities /////////////

    ////'binary_sensor_occupancy': {
    ////    type: 'binary_sensor',
    ////    type: 'occupancy',
    ////    payload: {
    ////        payload_on: true,
    ////        payload_off: false,
    ////        value_template: '{{ value_json.occupancy }}',
    ////        device_class: 'motion',
    ////    },
    ////},
    ////'binary_sensor_presence': {
    ////    type: 'binary_sensor',
    ////    type: 'presence',
    ////    payload: {
    ////        payload_on: true,
    ////        payload_off: false,
    ////        value_template: '{{ value_json.presence }}',
    ////        device_class: 'presence',
    ////    },
    ////},
    ////'binary_sensor_gas': {
    ////    type: 'binary_sensor',
    ////    type: 'gas',
    ////    payload: {
    ////        payload_on: true,
    ////        payload_off: false,
    ////        value_template: '{{ value_json.gas }}',
    ////        device_class: 'gas',
    ////    },
    ////},
    ////'binary_sensor_router': {
    ////    type: 'binary_sensor',
    ////    type: 'router',
    ////    payload: {
    ////        payload_on: true,
    ////        payload_off: false,
    ////        value_template: '{{ value_json.state }}',
    ////        device_class: 'connectivity',
    ////    },
    ////},

    ////// Sensor
    //'target_temperature': {
    //    type: 'sensor',
    //    type: 'temperature',
    //    payload: {
    //        unit_of_measurement: '°C',
    //        device_class: 'temperature',
    //        value_template: '{{ value_json.temperature }}',
    //    },
    //},
    //'measure_temperature': {
    //    type: 'sensor',
    //    type: 'temperature',
    //    payload: {
    //        unit_of_measurement: '°C',
    //        device_class: 'temperature',
    //        value_template: '{{ value_json.temperature }}',
    //    },
    //},
    //'measure_co': {
    //    type: 'sensor',
    //    type: 'co',
    //    payload: {
    //        unit_of_measurement: 'ppm',
    //        device_class: 'gas',
    //        value_template: '{{ value_json.co }}',
    //    },
    //},
    //'measure_co2': {
    //    type: 'sensor',
    //    type: 'co2',
    //    payload: {
    //        unit_of_measurement: 'ppm',
    //        device_class: 'gas',
    //        value_template: '{{ value_json.co2 }}',
    //    },
    //},
    //'measure_pm25': {
    //    type: 'sensor',
    //    type: 'pm25',
    //    payload: {
    //        unit_of_measurement: 'ppm',
    //        device_class: 'gas',
    //        value_template: '{{ value_json.pm25 }}',
    //    },
    //},
    //'measure_humidity': {
    //    type: 'sensor',
    //    type: 'humidity',
    //    payload: {
    //        unit_of_measurement: '%',
    //        device_class: 'humidity',
    //        value_template: '{{ value_json.humidity }}',
    //    },
    //},
    //'measure_pressure': {
    //    type: 'sensor',
    //    type: 'pressure',
    //    payload: {
    //        unit_of_measurement: 'hPa',
    //        device_class: 'pressure',
    //        value_template: '{{ value_json.pressure }}',
    //    },
    //},
    //'measure_noise': {
    //    type: 'sensor',
    //    type: 'noise',
    //    payload: {
    //        unit_of_measurement: 'dB',
    //        device_class: 'noise',
    //        value_template: '{{ value_json.noise }}',
    //    },
    //},
    //'measure_rain': {
    //    type: 'sensor',
    //    type: 'rain',
    //    payload: {
    //        unit_of_measurement: 'mm',
    //        device_class: 'rain',
    //        value_template: '{{ value_json.rain }}',
    //    },
    //},
    //'measure_wind_strength': {
    //    type: 'sensor',
    //    type: 'wind_strength',
    //    payload: {
    //        unit_of_measurement: 'km/h',
    //        device_class: 'wind',
    //        value_template: '{{ value_json.wind_strength }}',
    //    },
    //},
    //'measure_wind_angle': {
    //    type: 'sensor',
    //    type: 'wind_angle',
    //    payload: {
    //        unit_of_measurement: '°',
    //        device_class: 'wind',
    //        value_template: '{{ value_json.wind_angle }}',
    //    },
    //},
    //'measure_gust_strength': {
    //    type: 'sensor',
    //    type: 'gust_strength',
    //    payload: {
    //        unit_of_measurement: 'km/h',
    //        device_class: 'gust',
    //        value_template: '{{ value_json.gust_strength }}',
    //    },
    //},
    //'measure_gust_angle': {
    //    type: 'sensor',
    //    type: 'gust_angle',
    //    payload: {
    //        unit_of_measurement: '°',
    //        device_class: 'gust',
    //        value_template: '{{ value_json.gust_angle }}',
    //    },
    //},
    //'measure_battery': {
    //    type: 'sensor',
    //    type: 'battery',
    //    payload: {
    //        unit_of_measurement: '%',
    //        device_class: 'battery',
    //        value_template: '{{ value_json.battery }}',
    //    },
    //},
    //'measure_power': {
    //    type: 'sensor',
    //    type: 'power',
    //    payload: {
    //        unit_of_measurement: 'Watt',
    //        icon: 'mdi:flash',
    //        value_template: '{{ value_json.power }}',
    //    },
    //},
    //'measure_voltage': {
    //    type: 'sensor',
    //    type: 'voltage',
    //    payload: {
    //        unit_of_measurement: 'Volt',
    //        icon: 'mdi:flash',
    //        value_template: '{{ value_json.voltage }}',
    //    },
    //},
    //'measure_current': {
    //    type: 'sensor',
    //    type: 'current',
    //    payload: {
    //        unit_of_measurement: 'Ampere',
    //        icon: 'mdi:flash',
    //        value_template: '{{ value_json.current }}',
    //    },
    //},
    //'measure_luminance': {
    //    type: 'sensor',
    //    type: 'luminance',
    //    payload: {
    //        unit_of_measurement: 'lx',
    //        device_class: 'luminance',
    //        value_template: '{{ value_json.luminance }}',
    //    },
    //},
    //'measure_ultraviolet': {
    //    type: 'sensor',
    //    type: 'ultraviolet',
    //    payload: {
    //        unit_of_measurement: 'UVI',
    //        device_class: 'ultraviolet',
    //        value_template: '{{ value_json.ultraviolet }}',
    //    },
    //},
    //'measure_water': {
    //    type: 'sensor',
    //    type: 'water',
    //    payload: {
    //        unit_of_measurement: 'L/min',
    //        device_class: 'water',
    //        value_template: '{{ value_json.water }}',
    //    },
    //},

    ////'sensor_click': {
    ////    type: 'sensor',
    ////    type: 'click',
    ////    payload: {
    ////        icon: 'mdi:toggle-switch',
    ////        value_template: '{{ value_json.click }}',
    ////        force_update: true,
    ////    },
    ////},
    ////'sensor_action': {
    ////    type: 'sensor',
    ////    type: 'action',
    ////    payload: {
    ////        icon: 'mdi:gesture-double-tap',
    ////        value_template: '{{ value_json.action }}',
    ////        force_update: true,
    ////    },
    ////},
    ////'sensor_brightness': {
    ////    type: 'sensor',
    ////    type: 'brightness',
    ////    payload: {
    ////        unit_of_measurement: 'brightness',
    ////        icon: 'mdi:brightness-5',
    ////        value_template: '{{ value_json.brightness }}',
    ////    },
    ////},
    ////'sensor_lock': {
    ////    type: 'sensor',
    ////    type: 'lock',
    ////    payload: {
    ////        icon: 'mdi:lock',
    ////        value_template: '{{ value_json.inserted }}',
    ////    },
    ////},
    ////'sensor_linkquality': {
    ////    type: 'sensor',
    ////    type: 'linkquality',
    ////    payload: {
    ////        unit_of_measurement: '-',
    ////        value_template: '{{ value_json.linkquality }}',
    ////    },
    ////},
    ////'sensor_gas_density': {
    ////    type: 'sensor',
    ////    type: 'gas_density',
    ////    payload: {
    ////        value_template: '{{ value_json.gas_density }}',
    ////        icon: 'mdi:google-circles-communities',
    ////    },
    ////},

    

    //// Light
    //'light_hue': {
    //    type: 'light',
    //    type: 'light',
    //    payload: {
    //        brightness: true,
    //        color_temp: true,
    //        hs: true,
    //        schema: 'json',
    //    },
    //},
    //'light_saturation': {
    //    type: 'light',
    //    type: 'light',
    //    payload: {
    //        brightness: true,
    //        hs: true,
    //        schema: 'json',
    //    },
    //},
    //'light_temperature': {
    //    type: 'light',
    //    type: 'light',
    //    payload: {
    //        brightness: true,
    //        color_temp: true,
    //        hs: true,
    //        schema: 'json',
    //    },
    //},
    //'dim': {
    //    type: 'light',
    //    type: 'light',
    //    payload: {
    //        brightness: true,
    //        schema: 'json',
    //    },
    //},
    // ? Enum ?
    //'light_mode': {
    //    type: 'light',
    //    type: 'light',
    //    payload: {
    //        brightness: true,
    //        schema: 'json',
    //    },
    //},

    //// Switch
    //'onoff': {
    //    type: 'switch',
    //    type: 'switch',
    //    payload: {
    //        payload_off: false,
    //        payload_on: true,
    //        value_template: '{{ value_json.onoff }}',
    //    },
    //},

    //// Cover
    // TODO: Implement window cover: https://www.home-assistant.io/components/cover.mqtt/

    //'sensor_cover': {
    //    type: 'sensor',
    //    type: 'cover',
    //    payload: {
    //        value_template: '{{ value_json.position }}',
    //        icon: 'mdi:view-array',
    //    },
    //},

    //'windowcoverings_state': {
    //    type: 'cover',
    //    type: 'cover',
    //    payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_tilt_up': {
    //    type: 'cover',
    //    type: 'cover',
    //    payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_tilt_down': {
    //    type: 'cover',
    //    type: 'cover',
    //    payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_tilt_set': {
    //    type: 'cover',
    //    type: 'cover',
    //    payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_closed': {
    //    type: 'cover',
    //    type: 'cover',
    //    payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_set': {
    //    type: 'cover',
    //    type: 'cover',
    //    payload: {
    //        optimistic: true,
    //    },
    //},

    //// Vacuum
    // TODO: implement vacuum: https://www.home-assistant.io/components/vacuum.mqtt/
    //'vacuumcleaner_state': {
    //    type: 'vacuum',
    //    type: 'vacuum',
    //    payload: {
    //        value_template: '{{ value_json.state }}',
    //    },
    //}
};

const NodeRed = { // Node RED
    //switch (Dtype) {     // TODO check is settable & has name & properties
    //    case "kettle": //TODO
    //        node.warn("kettle TODO");
    //        break
    //    case "other": //TODO
    //        node.warn("other TODO");
    //        break;
    //    case "":  //TODO do - well handle
    //        node.warn("<blank> TODO, need more info");
    //        break;
    //    case "vacuumcleaner": //TODO
    //        node.warn("vacuumcleaner TODO TODO");
    //        break;
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
    //    case "doorbell":
    //        node.warn("doorbell TODO");
    //        break;
    //    case "speaker":
    //        //node.warn ("speaker TODO")
    //        break;
    //    case "zwavecontroller":
    //        node.warn("zwavecontroller ToLOOKAT");
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
}

const DEVICE_ID = 'homey';
const TOPIC_ROOT = 'homeassistant';
const STATUS_TOPIC = 'hass/status';

/**
 * Home Assistant Discovery
 * */
class HomeAssistantDispatcher {

    get _topicRoot() {
        return this.settings && this.settings.haRoot ? this.settings.haRoot : TOPIC_ROOT; // TODO: add haRoot property to settings
    }
    get _deviceId() {
        return this.settings && this.settings.deviceId ? this.settings.deviceId : DEVICE_ID;
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

        this._init()
            .then(() => Log.info("HomeAssistant Dispatcher initialized"))
            .catch(error => Log.error(error));
    }
    
    async _init() {

        await this.mqttClient.subscribe(STATUS_TOPIC/*, CLIENT_OPTIONS*/);

        // NOTE: If the client is already connected, the 'connect' event won't be fired. 
        // Therefore we mannually dispatch the state if already connected/registered.
        if (this.mqttClient.isRegistered()) {
            this.dispatchState();
        } else {
            this.mqttClient.onRegistered.subscribe(() => this.dispatchState(), true);

            this._clientCallback = this._onMessage.bind(this);
            this.mqttClient.onMessage.subscribe(this._clientCallback);
        }
    }

    async _onMessage(topic, message) {

        if (topic !== STATUS_TOPIC) return;

        try {
            // TODO: implement
        } catch (e) {
            Log.info('Error handling HASS status message');
            Log.debug(topic);
            Log.debug(message);
            Log.error(e);
        }
    }

    dispatchState() {
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
        //this.settings.propertyScaling = settings.propertyScaling || DEFAULT_PROPERTY_SCALING;
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

    _createConfig(device, capability) {
        if (typeof capability.id !== 'string') return undefined;

        //switch (capability.id) {
        //    case 'onoff': {
        //        return {
        //            type: 'switch',
        //            payload: {
        //                payload_on: true,
        //                payload_off: false
        //            }
        //        };
        //    }
        //}

        // TODO: icons

        //TODO: Lights
        //"brightness_state_topic": "homie/" + homey + "/" + device + "/dim*100",
        //        "brightness_command_topic": "homie/" + homey + "/" + device + "/dim" + "/set*100",
        //        "brightness_scale": "100"
        //    }

        switch (capability.type) {
            case 'boolean':
                return {
                    type: capability.setable ? 'switch' : 'binary_sensor',
                    payload: {
                        payload_on: "true",
                        payload_off: "false"
                    }
                };
            case 'number':
            case 'float':
            case 'integer':
                return {
                    type: 'sensor',
                    payload: {
                        value_template: '{{ value }}',
                        unit_of_measurement: capability.units && typeof capability.units === 'object' ? capability.units['en'] : capability.units
                    }
                };
            case 'enum': // ????
            case 'string':// ????
            default:
                return undefined;
        }
    }

    _getConfiguration(device, capability) {
        if (typeof device !== 'object' || typeof capability !== 'object') return undefined;
        return configurations[capability.id] || this._createConfig(device, capability);
    }

    _getMessage(device, capability) {

        const config = this._getConfiguration(device, capability);
        if (!config) return undefined;

        const deviceId = normalize(device.name);
        const capabilityId = normalize(capability.id);
        const capabilityTitle = capability.title && typeof capability.title === 'object' ? capability.title['en'] : capability.title;
        const capabilityName = capabilityTitle || capability.desc || capability.id;
        const type = config.type;
        const stateTopic = this.homieDispatcher.getTopic(device, capability);

        const payload = {
            name: `${device.name} - ${capabilityName}`,
            unique_id: `${device.id}_${capability.id}`,
            state_topic: stateTopic,
            device: {
                identifiers: `${this._deviceId}_${device.id}`,
                name: device.name
            }
        };

        if (capability.setable) {
            payload.command_topic = `${stateTopic}/set`;
        }

        //if (['binary_sensor', 'sensor', 'cover'].includes(config.type)) {
        //    payload.device_class = device.class;
        //}

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
        return {
            topic: [this._topicRoot, type, deviceId, capabilityId, 'config'].join('/'),
            payload: { ...payload, ...config.payload }
        };
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

        const capabilities = device.capabilitiesObj;
        if (!capabilities)
            return;
        
        for (let key in capabilities) {
            if (capabilities.hasOwnProperty(key)) {
                const capability = capabilities[key];

                if (capability && capability.id) {
                    let msg = this._getMessage(device, capability);
                    if (msg) {
                        this.publish(msg);
                    } else {
                        Log.info("Failed to generate message for device: " + device.name);
                    }
                }
            }
        }
    }

    publish(msg) {
        this.messageQueue.add(msg.topic, msg.payload, { qos:0, retained: true });
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
