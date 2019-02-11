"use strict";

const _ = require('lodash');
const Log = require('../Log.js');
const Topic = require('../mqtt/Topic.js');
const Message = require('../mqtt/Message.js');
//const Color = require('../Color.js');
const normalize = Topic.normalize;

const configurations = {
    // NOT IMPLEMENTED
    //
    // thermostat_mode




    // Binary sensor
    'alarm_generic': {
        type: 'binary_sensor',
        object_id: 'alarm',
        discovery_payload: {
            payload_on: true,
            payload_off: false,
            value_template: '{{ value_json.alarm }}',
            device_class: 'alarm',
        },
    },
    'alarm_motion': {
        type: 'binary_sensor',
        object_id: 'motion',
        discovery_payload: {
            payload_on: true,
            payload_off: false,
            value_template: '{{ value_json.motion }}',
            device_class: 'motion',
        },
    },
    'alarm_contact': {
        type: 'binary_sensor',
        object_id: 'contact',
        discovery_payload: {
            payload_on: false,
            payload_off: true,
            value_template: '{{ value_json.contact }}',
            device_class: 'door',
        },
    },
    'alarm_co': {
        type: 'binary_sensor',
        object_id: 'alarm_co',
        discovery_payload: {
            payload_on: true,
            payload_off: false,
            value_template: '{{ value_json.alarm_co }}',
            device_class: 'gas',
        },
    },
    'alarm_co2': {
        type: 'binary_sensor',
        object_id: 'alarm_co2',
        discovery_payload: {
            payload_on: true,
            payload_off: false,
            value_template: '{{ value_json.alarm_co2 }}',
            device_class: 'gas',
        },
    },
    'alarm_pm25': {
        type: 'binary_sensor',
        object_id: 'alarm_pm25',
        discovery_payload: {
            payload_on: true,
            payload_off: false,
            value_template: '{{ value_json.alarm_pm25 }}',
            device_class: 'dust',
        },
    },
    'alarm_tamper': {
        type: 'binary_sensor',
        object_id: 'tamper',
        discovery_payload: {
            payload_on: true,
            payload_off: false,
            value_template: '{{ value_json.tamper }}',
            device_class: 'motion',
        },
    },
    'alarm_smoke': {
        type: 'binary_sensor',
        object_id: 'smoke',
        discovery_payload: {
            payload_on: true,
            payload_off: false,
            value_template: '{{ value_json.smoke }}',
            device_class: 'smoke',
        },
    },
    'alarm_fire': {
        type: 'binary_sensor',
        object_id: 'fire',
        discovery_payload: {
            payload_on: true,
            payload_off: false,
            value_template: '{{ value_json.fire }}',
            device_class: 'fire',
        },
    },
    'alarm_heat': {
        type: 'binary_sensor',
        object_id: 'heat',
        discovery_payload: {
            payload_on: true,
            payload_off: false,
            value_template: '{{ value_json.heat }}',
            device_class: 'heat',
        },
    },
    'alarm_water': {
        type: 'binary_sensor',
        object_id: 'alarm_water',
        discovery_payload: {
            payload_on: true,
            payload_off: false,
            value_template: '{{ value_json.alarm_water }}',
            device_class: 'moisture',
        },
    },
    'alarm_battery': {
        type: 'binary_sensor',
        object_id: 'alarm_battery',
        discovery_payload: {
            payload_on: true,
            payload_off: false,
            value_template: '{{ value_json.alarm_battery }}',
            device_class: 'battery',
        },
    },
    'alarm_night': {
        type: 'binary_sensor',
        object_id: 'alarm_night',
        discovery_payload: {
            payload_on: true,
            payload_off: false,
            value_template: '{{ value_json.alarm_night }}',
            device_class: 'night',
        },
    },

    ////////////// TODO: Iplement the rest of the pre-defined capabilities /////////////

    //'binary_sensor_occupancy': {
    //    type: 'binary_sensor',
    //    object_id: 'occupancy',
    //    discovery_payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.occupancy }}',
    //        device_class: 'motion',
    //    },
    //},
    //'binary_sensor_presence': {
    //    type: 'binary_sensor',
    //    object_id: 'presence',
    //    discovery_payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.presence }}',
    //        device_class: 'presence',
    //    },
    //},
    //'binary_sensor_gas': {
    //    type: 'binary_sensor',
    //    object_id: 'gas',
    //    discovery_payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.gas }}',
    //        device_class: 'gas',
    //    },
    //},
    //'binary_sensor_router': {
    //    type: 'binary_sensor',
    //    object_id: 'router',
    //    discovery_payload: {
    //        payload_on: true,
    //        payload_off: false,
    //        value_template: '{{ value_json.state }}',
    //        device_class: 'connectivity',
    //    },
    //},

    //// Sensor
    'target_temperature': {
        type: 'sensor',
        object_id: 'temperature',
        discovery_payload: {
            unit_of_measurement: '°C',
            device_class: 'temperature',
            value_template: '{{ value_json.temperature }}',
        },
    },
    'measure_temperature': {
        type: 'sensor',
        object_id: 'temperature',
        discovery_payload: {
            unit_of_measurement: '°C',
            device_class: 'temperature',
            value_template: '{{ value_json.temperature }}',
        },
    },
    'measure_co': {
        type: 'sensor',
        object_id: 'co',
        discovery_payload: {
            unit_of_measurement: 'ppm',
            device_class: 'gas',
            value_template: '{{ value_json.co }}',
        },
    },
    'measure_co2': {
        type: 'sensor',
        object_id: 'co2',
        discovery_payload: {
            unit_of_measurement: 'ppm',
            device_class: 'gas',
            value_template: '{{ value_json.co2 }}',
        },
    },
    'measure_pm25': {
        type: 'sensor',
        object_id: 'pm25',
        discovery_payload: {
            unit_of_measurement: 'ppm',
            device_class: 'gas',
            value_template: '{{ value_json.pm25 }}',
        },
    },
    'measure_humidity': {
        type: 'sensor',
        object_id: 'humidity',
        discovery_payload: {
            unit_of_measurement: '%',
            device_class: 'humidity',
            value_template: '{{ value_json.humidity }}',
        },
    },
    'measure_pressure': {
        type: 'sensor',
        object_id: 'pressure',
        discovery_payload: {
            unit_of_measurement: 'hPa',
            device_class: 'pressure',
            value_template: '{{ value_json.pressure }}',
        },
    },
    'measure_noise': {
        type: 'sensor',
        object_id: 'noise',
        discovery_payload: {
            unit_of_measurement: 'dB',
            device_class: 'noise',
            value_template: '{{ value_json.noise }}',
        },
    },
    'measure_rain': {
        type: 'sensor',
        object_id: 'rain',
        discovery_payload: {
            unit_of_measurement: 'mm',
            device_class: 'rain',
            value_template: '{{ value_json.rain }}',
        },
    },
    'measure_wind_strength': {
        type: 'sensor',
        object_id: 'wind_strength',
        discovery_payload: {
            unit_of_measurement: 'km/h',
            device_class: 'wind',
            value_template: '{{ value_json.wind_strength }}',
        },
    },
    'measure_wind_angle': {
        type: 'sensor',
        object_id: 'wind_angle',
        discovery_payload: {
            unit_of_measurement: '°',
            device_class: 'wind',
            value_template: '{{ value_json.wind_angle }}',
        },
    },
    'measure_gust_strength': {
        type: 'sensor',
        object_id: 'gust_strength',
        discovery_payload: {
            unit_of_measurement: 'km/h',
            device_class: 'gust',
            value_template: '{{ value_json.gust_strength }}',
        },
    },
    'measure_gust_angle': {
        type: 'sensor',
        object_id: 'gust_angle',
        discovery_payload: {
            unit_of_measurement: '°',
            device_class: 'gust',
            value_template: '{{ value_json.gust_angle }}',
        },
    },
    'measure_battery': {
        type: 'sensor',
        object_id: 'battery',
        discovery_payload: {
            unit_of_measurement: '%',
            device_class: 'battery',
            value_template: '{{ value_json.battery }}',
        },
    },
    'measure_power': {
        type: 'sensor',
        object_id: 'power',
        discovery_payload: {
            unit_of_measurement: 'Watt',
            icon: 'mdi:flash',
            value_template: '{{ value_json.power }}',
        },
    },
    'measure_voltage': {
        type: 'sensor',
        object_id: 'voltage',
        discovery_payload: {
            unit_of_measurement: 'Volt',
            icon: 'mdi:flash',
            value_template: '{{ value_json.voltage }}',
        },
    },
    'measure_current': {
        type: 'sensor',
        object_id: 'current',
        discovery_payload: {
            unit_of_measurement: 'Ampere',
            icon: 'mdi:flash',
            value_template: '{{ value_json.current }}',
        },
    },
    'measure_luminance': {
        type: 'sensor',
        object_id: 'luminance',
        discovery_payload: {
            unit_of_measurement: 'lx',
            device_class: 'luminance',
            value_template: '{{ value_json.luminance }}',
        },
    },
    'measure_ultraviolet': {
        type: 'sensor',
        object_id: 'ultraviolet',
        discovery_payload: {
            unit_of_measurement: 'UVI',
            device_class: 'ultraviolet',
            value_template: '{{ value_json.ultraviolet }}',
        },
    },
    'measure_water': {
        type: 'sensor',
        object_id: 'water',
        discovery_payload: {
            unit_of_measurement: 'L/min',
            device_class: 'water',
            value_template: '{{ value_json.water }}',
        },
    },

    //'sensor_click': {
    //    type: 'sensor',
    //    object_id: 'click',
    //    discovery_payload: {
    //        icon: 'mdi:toggle-switch',
    //        value_template: '{{ value_json.click }}',
    //        force_update: true,
    //    },
    //},
    //'sensor_action': {
    //    type: 'sensor',
    //    object_id: 'action',
    //    discovery_payload: {
    //        icon: 'mdi:gesture-double-tap',
    //        value_template: '{{ value_json.action }}',
    //        force_update: true,
    //    },
    //},
    //'sensor_brightness': {
    //    type: 'sensor',
    //    object_id: 'brightness',
    //    discovery_payload: {
    //        unit_of_measurement: 'brightness',
    //        icon: 'mdi:brightness-5',
    //        value_template: '{{ value_json.brightness }}',
    //    },
    //},
    //'sensor_lock': {
    //    type: 'sensor',
    //    object_id: 'lock',
    //    discovery_payload: {
    //        icon: 'mdi:lock',
    //        value_template: '{{ value_json.inserted }}',
    //    },
    //},
    //'sensor_linkquality': {
    //    type: 'sensor',
    //    object_id: 'linkquality',
    //    discovery_payload: {
    //        unit_of_measurement: '-',
    //        value_template: '{{ value_json.linkquality }}',
    //    },
    //},
    //'sensor_gas_density': {
    //    type: 'sensor',
    //    object_id: 'gas_density',
    //    discovery_payload: {
    //        value_template: '{{ value_json.gas_density }}',
    //        icon: 'mdi:google-circles-communities',
    //    },
    //},



    

    // Light
    'light_hue': {
        type: 'light',
        object_id: 'light',
        discovery_payload: {
            brightness: true,
            color_temp: true,
            hs: true,
            schema: 'json',
        },
    },
    'light_saturation': {
        type: 'light',
        object_id: 'light',
        discovery_payload: {
            brightness: true,
            hs: true,
            schema: 'json',
        },
    },
    'light_temperature': {
        type: 'light',
        object_id: 'light',
        discovery_payload: {
            brightness: true,
            color_temp: true,
            hs: true,
            schema: 'json',
        },
    },
    'dim': {
        type: 'light',
        object_id: 'light',
        discovery_payload: {
            brightness: true,
            schema: 'json',
        },
    },
    // ? Enum ?
    //'light_mode': {
    //    type: 'light',
    //    object_id: 'light',
    //    discovery_payload: {
    //        brightness: true,
    //        schema: 'json',
    //    },
    //},

    // Switch
    'onoff': {
        type: 'switch',
        object_id: 'switch',
        discovery_payload: {
            payload_off: 'OFF',
            payload_on: 'ON',
            value_template: '{{ value_json.state }}',
        },
    },

    //// Cover
    // TODO: Implement window cover: https://www.home-assistant.io/components/cover.mqtt/

    //'sensor_cover': {
    //    type: 'sensor',
    //    object_id: 'cover',
    //    discovery_payload: {
    //        value_template: '{{ value_json.position }}',
    //        icon: 'mdi:view-array',
    //    },
    //},

    //'windowcoverings_state': {
    //    type: 'cover',
    //    object_id: 'cover',
    //    discovery_payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_tilt_up': {
    //    type: 'cover',
    //    object_id: 'cover',
    //    discovery_payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_tilt_down': {
    //    type: 'cover',
    //    object_id: 'cover',
    //    discovery_payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_tilt_set': {
    //    type: 'cover',
    //    object_id: 'cover',
    //    discovery_payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_closed': {
    //    type: 'cover',
    //    object_id: 'cover',
    //    discovery_payload: {
    //        optimistic: true,
    //    },
    //},
    //'windowcoverings_set': {
    //    type: 'cover',
    //    object_id: 'cover',
    //    discovery_payload: {
    //        optimistic: true,
    //    },
    //},

    // Vacuum
    // TODO: implement vacuum: https://www.home-assistant.io/components/vacuum.mqtt/
    'vacuumcleaner_state': {
        type: 'vacuum',
        object_id: 'vacuum',
        discovery_payload: {
            value_template: '{{ value_json.state }}',
        },
    }
};

const switchWithPostfix = (postfix) => {
    return {
        type: 'switch',
        object_id: `switch_${postfix}`,
        discovery_payload: {
            payload_off: 'OFF',
            payload_on: 'ON',
            value_template: `{{ value_json.state_${postfix} }}`,
            command_topic_prefix: postfix,
        },
    };
};

const TOPIC_ROOT = 'homeassistant';
const CLIENT_OPTIONS = { injectRoot: false };

/**
 * Home Assistant Discovery
 * */
class HomeAssistantDispatcher {

    get _topicRoot() {
        return this.settings && this.settings.topicRoot ? this.settings.topicRoot : TOPIC_ROOT;
    }
    get _deviceId() {
        return this.settings && this.settings.deviceId ? this.settings.deviceId : 'homey';
    }

    constructor({ api, mqttClient, deviceManager, system, settings }) {
        this.api = api;
        this.mqttClient = mqttClient;
        this.deviceManager = deviceManager;
        this.system = system;

        // A map of all discoverd devices
        this._discovered = new Set();

        this._capabilityInstances = new Map();
        this._init();
    }
    
    _init() {

        this.mqttClient.subscribe('hass/status', CLIENT_OPTIONS);

        this.registerDevices();

        // NOTE: If the client is already connected, the 'connect' event won't be fired. 
        // Therefore we mannually dispatch the state if already connected/registered.
        if (this.mqttClient.isRegistered()) {
            this.dispatchState();
        }
    }

    dispatchState() {
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

    _getDeviceType(dataType) {
    }

    _createConfig(device, capability) {
        const type = capability.id.split('_').pop();

        switch (capability.dataType) {
            case 'boolean':
                return {
                    type: 'binary_sensor',
                    discovery_payload: {
                        payload_on: true,
                        payload_off: false,
                        value_template: '{{ value_json.'+type+' }}'
                    }
                };
            case 'number':
            case 'float':
            case 'integer':
            case 'enum': // ????
            case 'string':// ????
                return {
                    type: 'sensor',
                    discovery_payload: {
                        unit_of_measurement: capability.units && typeof capability.units === 'object' ? capability.units['en'] : capability.units,
                        value_template: '{{ value_json.' + type + ' }}'
                    }
                };
            default:
                return undefined;
        }
    }

    _getConfiguration(device, capability) {
        let config = configurations[capability.id] || this._createConfig(device, capability);

        // NOTE: Config is stored persistent in global configurations
        if (!config.discovery_payload.device_class) {
            config.discovery_payload.device_class = device.class; 
        }
        config.object_id = config.object_id || capability.id;

        return config;
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

        Log.info("register device: " + device.name);
        
        const capabilities = device.capabilitiesObj;
        if (capabilities) {
            for (let key in capabilities) {
                if (capabilities.hasOwnProperty(key)) {
                    const capability = capabilities[key];
                    const capabilityTitle = (capability.title && typeof capability.title === 'object') ? capability.title['en'] : capability.title;
                    const capabilityName = capabilityTitle || capability.desc || capability.id;
                    const name = _.replace([device.name, capabilityName].filter(x => x).join(' - '), "_", " ");
                    const value = capability.value;
                    const friendlyName = Topic.normalize(device.name);
                    
                    let config = this._getConfiguration(device, capability);

                    ///////////////////

                    const topic = `${this._topicRoot}/${config.type}/${device.id}/${config.object_id}/config`;
                    const payload = { ...config.discovery_payload };
                    payload.state_topic = `${this._topicRoot}/${friendlyName}`;

                    // Set json_attributes_topic for types which support this
                    if (['binary_sensor', 'sensor'].includes(config.type)) {
                        payload.json_attributes_topic = payload.state_topic;
                    }

                    // Set (unique) name
                    payload.name = `${friendlyName}_${config.object_id}`;

                    // Set unique_id
                    payload.unique_id = `${device.id}_${config.object_id}`;

                    // Attributes for device registry
                    payload.device = {
                        identifiers: `${this._deviceId}_${device.id}`,
                        name: device.name,
                        //sw_version: `Homey ${this.system.version}`,
                        //model: `${mappedModel.description} (${mappedModel.model})`,
                        //manufacturer: mappedModel.vendor,
                    };

                    // Set availability payload
                    payload.availability_topic = `${payload.state_topic}/availability`;

                    // Add precision to value_template
                    if (capability.decimals) {
                        let template = payload.value_template;
                        template = template.replace('{{ ', '').replace(' }}', '');
                        template = `{{ (${template} | float) | round(${capability.decimals}) }}`;
                        payload.value_template = template;
                    }

                    if (capability.setable) {
                        payload.command_topic = [payload.state_topic, payload.command_topic_prefix, 'set'].filter(x => x).join('/');
                    }

                    this.publish(topic, JSON.stringify(payload), { retain: true, qos: 0 });

                    // Listen to state changes
                    try {
                        const deviceCapabilityId = device.id + capability.id;
                        this._destroyCapabilityInstance(deviceCapabilityId);
                        const capabilityInstance = device.makeCapabilityInstance(key, value =>
                            this._handleStateChange(node, device.id, key, value)
                        );
                        Log.debug("Register CapabilityInstance: " + device.name + " - " + capability.title);
                        this._capabilityInstances.set(deviceCapabilityId, capabilityInstance);
                    } catch (e) {
                        Log.info("Error capability: " + key);
                        Log.debug(e);
                    }
                }
            }
        }
        return undefined;
    }

    publish(topic, msg, opt) {
        if (msg) {
            opt = opt || {};
            const message = new Message(topic, msg, opt.qos, opt.retain);
            this.mqttClient.publish(message, CLIENT_OPTIONS);
        }
    }

    _destroyCapabilityInstance(deviceCapabilityId) {
        const capabilityInstance = this._capabilityInstances.get(deviceCapabilityId);
        if (capabilityInstance) {
            Log.debug("Destroy CapabilityInstance: " + deviceCapabilityId);
            capabilityInstance.destroy();
            this._capabilityInstances.delete(deviceCapabilityId);
        } else {
            //Log.debug("[SKIP] No existing CapabilityInstance found to destroy");
        }
    }

    _unregisterDevice(device) {

        // stop listening for state changes
        if (device && device.capabilities) {
            for (let capabilityId of device.capabilities) {
                this._destroyCapabilityInstance(device.id + capabilityId);
            }
        }

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

    async _handleStateChange(deviceId, capabilityId, value) {

        if (!this.deviceManager.isDeviceEnabled(deviceId)) {
            //Log.info('[SKIP] Device disabled');
            return;
        }
        
        Log.info("HASS set value [" + capabilityId + "]: " + value);

        if (value === undefined) {
            Log.info("HASS: No value provided");
            return;
        }

        try {
            // TODO: Implement
        } catch (e) {
            Log.error(e);
        }
    }

    async setValue(deviceId, capabilityId, value, dataType) {

        Log.info('HomeAssistantDispatcher.setValue');
        
        try {
            const state = {
                deviceId: deviceId,
                capabilityId: capabilityId,
                value: this._parseValue(value, dataType)
            };
            Log.debug("state: " + JSON.stringify(state));
            await this.api.devices.setCapabilityValue(state);
        } catch (e) {
            Log.info("Failed to update capability value");
            Log.error(e);
        }
    }

    _formatValue(value) {
        if (typeof value === 'boolean') {
            return value ? 'ON' : 'OFF';
        }
        return value;
    }

    _parseValue(value, dataType) {
        switch (dataType) {
            case 'boolean':
                return value === 'ON' || value === 'on' || value === true || value === 'true' || value === 1 || value === '1';
            case 'number':
            case 'float':
                return typeof value === 'number' ? value : typeof value === 'string' ? Number(value) || 0 : 0;
            case 'integer':
                return typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value) || 0 : 0;
            case 'string':
                return value ? value.toString() : undefined;
            case 'enum':
            case 'color':
            default:
                let numeric = Number(value);
                return isNaN(numeric) ? value : numeric;
        }
    }

    ///////////////////////

    onMQTTMessage(topic, message) {
        if (!topic === 'hass/status') {
            return false;
        }

        if (message.toString().toLowerCase() === 'online') {
            const timer = setTimeout(() => {
                // Publish all device states.
                this.zigbee.getAllClients().forEach((device) => {
                    if (this.state.exists(device.deviceId)) {
                        this.publishDeviceState(device, this.state.get(device.deviceId), false);
                    }
                });

                clearTimeout(timer);
            }, 20000);
        }

        return true;
    }

    onZigbeeMessage(message, device, mappedModel) {
        if (device && mappedModel) {
            this.discover(device.deviceId, mappedModel);
        }
    }



    /////////////////////////
   
    destroy() {
        Log.info('Destroy HomeAssistantDispatcher');
    }
}

module.exports = HomeAssistantDispatcher;
