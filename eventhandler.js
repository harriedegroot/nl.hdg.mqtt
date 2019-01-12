"use strict";

const Log = require('./Log.js');

class EventHandler {

    constructor(name) {
        this.name = name || 'unknown';
        this._listeners = [];
    }

    subscribe(callback) {
        if (this._listeners.indexOf(callback) !== -1) {
            Log.info("[Skip] Listener already subscribed");
        }
        this._listeners.push(callback);
    }

    remove(callback) {
        this._listeners = this._listeners.filter(c => c !== callback);
    }

    async emit(...args) {
        for (var i = 0; i < this._listeners.length; i++) {
            const callback = this._listeners[i];
            if (typeof callback === 'function') {
                try {
                    await callback(...args);
                } catch (e) {
                    Log.info('Error handling event: ' + this.name);
                    Log.debug(args);
                    Log.error(e, false); // note prevent notification spamming
                }
            }
        }
    }
}

module.exports = EventHandler;
