"use strict";

const Log = require('../Log.js');

class FlowTriggerDispatcher {

    constructor(api, mqttClient) {
        this.api = api;
        this.mqttClient = mqttClient;
    }

    async register() {
        this.registered = true;

        await this._registerFlowTriggers();
    }

    async unregister() {
        this.registered = false;
    }

    async _registerFlowTriggers() {
        // TODO: implement
        Log.debug('FlowTriggerDispatcher: not implemented');
    }
}

module.exports = FlowTriggerDispatcher;
