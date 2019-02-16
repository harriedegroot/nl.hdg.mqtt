"use strict";

const normalize = require('../normalize');

const DEFAULT_CLASS = 'other';
const DEFAULT_ZONE = 'home';
const DEFAULT_DEVICE = 'homey';
const DEFAULT_TRIGGER = 'default';
const DEFAULT_COMMAND = 'state';

/**
 * @deprecated [DEPRECATED] Replaced by Homie convention
 * 
 * Topic descriptor
 * Format: <homey>/class/zone/device/trigger/command
 * 
 * */
class Topic {

    static parse(topic) {
        return new Topic().parse(topic);
    }

    static normalize(name) {
        return name ? name.trim().toLowerCase().normalize("NFD").replace(/[ _]/g, "-").replace(/[^a-z0-9-]/g, "") : undefined;
    }

    constructor(device, trigger, command, deviceClass, zone) {
        this.topic = undefined;
        this.device = this.parseDevice(device, deviceClass, zone);
        this.trigger = trigger;
        this.command = command;
    }

    parseDevice(device, deviceClass, zone) {
        device = typeof device === 'string'
            ? { name: device }
            : typeof device === 'object' ? device : {};

        if (deviceClass && !device.class) {
            device.class = deviceClass;
        } 
        if (zone && !device.zone) {
            device.zone = typeof zonde === 'string'
                ? { name: zone }
                : typeof zone === 'object' ? zone : {};
        }
        return device;
    }


    getClass() {
        return this.getDevice().class;
    }

    getZone() {
        return this.getDevice().zone || {};
    }
    getZoneName() {
        const name = this.getZone().name;
        return name ? name.trim() : undefined;
    }
    getZoneTopicName() {
        return normalize(this.getZoneName());
    }

    getDevice() {
        return this.device || {};
    }
    getDeviceName() {
        const name = this.getDevice().name;
        return name ? name.trim() : undefined;
    }
    getDeviceTopicName() {
        return normalize(this.getDeviceName());
    }

    getTrigger() { return this.trigger; }

    getCommand() { return this.command; }

    parse(topic) {
        this.topic = topic;
        if (topic) {
            if (typeof topic === 'object') {
                this.device = this.parseDevice(topic.device, topic.class, topic.zone);
                this.trigger = topic.trigger;
                this.command = topic.command;
            } else {
                let path = topic.split('/');

                if (path.length > 4) this.command = path[4];
                if (path.length > 3) this.trigger = path[3];
                if (path.length > 2) this.device = this.parseDevice(path[2], path[1], path[0]);
                else if (path.length > 1) this.device = this.parseDevice(undefined, path[1], path[0]);
                else if (path.length > 0) this.zone = this.parseDevice(undefined, undefined, path[0]);
            }
        }
        return this;
    }

    toString() {
        // homey/{device.class}/{zone}/{device.name}/{capability}/{command}
        return this.topic || [
            this.getClass() || DEFAULT_CLASS,
            this.getZoneTopicName() || DEFAULT_ZONE,
            this.getDeviceTopicName() || DEFAULT_DEVICE,
            this.trigger || DEFAULT_TRIGGER,
            this.command || DEFAULT_COMMAND
        ].filter(x => x).join('/');
    }
}

Topic.DEFAULT_CLASS = DEFAULT_CLASS;
Topic.DEFAULT_ZONE = DEFAULT_ZONE;
Topic.DEFAULT_DEVICE = DEFAULT_DEVICE;
Topic.DEFAULT_TRIGGER = DEFAULT_TRIGGER;
Topic.DEFAULT_COMMAND = DEFAULT_COMMAND;

module.exports = Topic;
