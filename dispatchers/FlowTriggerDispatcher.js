"use strict";

const Log = require('../Log.js');

const COMMAND = 'trigger';

class FlowTriggerDispatcher {

    constructor({ api, mqttClient }) {
        this.api = api;
        this.mqttClient = mqttClient;

        this._init();
    }

    _init() {
        //this.mqttClient.onRegistered.subscribe(this.register.bind(this));
        //this.mqttClient.onUnRegistered.subscribe(this.unregister.bind(this));
        if (this.mqttClient.isRegistered()) {
            this._registerFlowTriggers();
        }
    }

    async _registerFlowTriggers() {
        // TODO: implement
        Log.debug('FlowTriggerDispatcher: not implemented');
    }
}

module.exports = FlowTriggerDispatcher;
