'use strict';
const Log = require('./Log');
const Homey = require('homey');

module.exports = {

    // Retrieve all devices with their information
    async getDevices({ homey }) {
        return homey.app.getDevices();
    },

    // Retrieve all zones with their information
    async getZones({ homey }) {
        return homey.app.getZones();
    },

    // Fetch running state
    async getRunning({ homey }) {
        return homey.app.isRunning();
    },

    // Set running state
    async setRunning({ homey, body }) {
        const running = body && body.running;
        return homey.app.setRunning(running);
    },

    // Refresh device states
    async refresh({ homey }) {
        return await homey.app.refresh();
    },

    // Settings changed
    async getSettingsChanged({ homey }) {
        return await homey.app.settingsChanged();
    },

    // Log lines
    async getLog({ homey }) {
        return Log.getLogLines();
    },
    
    // Log level
    async getLogLevel({ homey }) {
        return Log.getLevel();
    },

    // Set log level
    async setLogLevel({ homey, body }) {
        const level = body.level;
        Log.info("Set log level: " + level);
        return Log.setLevel(level);
    },

    // Queue/Progress state
    async getState({ homey }) {
        return homey.app.getState();
    }
}
