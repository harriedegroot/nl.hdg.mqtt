'use strict';
const Log = require('./Log');
const Homey = require('homey');

module.exports = [
    {
        description: 'Retrieve all devices with their information',
        method: 'GET',
        path: '/devices',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            if (Homey.app) {
                Homey.app.getDevices()
                    .then(res => {
                        callback(null, res);
                    })
                    .catch(error => {
                        Log.error(error);
                        callback(error, null);
                    });
            } else {
                callback('App not ready, please try again');
            }
        }
    },
    {
        description: 'Retrieve all zones with their information',
        method: 'GET',
        path: '/zones',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            if (Homey.app) {
                Homey.app.getZones()
                    .then(res => {
                        callback(null, res);
                    })
                    .catch(error => {
                        Log.error(error);
                        callback(error, null);
                    });
            } else {
                callback('App not ready, please try again');
            }
        }
    },
    {
        description: 'Fetch running state',
        method: 'GET',
        path: '/running',
        fn: function (args, callback) {
            if (Homey.app) {
                let result = Homey.app.isRunning();
                if (result instanceof Error) callback(result);
                callback(null, result);
            } else {
                callback(null, false);
            }
        }
    },
    {
        description: 'Set running state',
        method: 'POST',
        path: '/running',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            if (Homey.app) {
                let running = args && args.body && args.body.running;
                let result = Homey.app.setRunning(running);
                if (result instanceof Error) callback(result);
                callback(null, result);
            } else {
                callback('App not ready, please try again');
            }
        }
    },
    {
        description: 'Refresh device states',
        method: 'GET',
        path: '/refresh',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            if (Homey.app) {
                let result = Homey.app.refresh();
                if (result instanceof Error) callback(result);
                callback(null, result);
            } else {
                callback('App not ready, please try again');
            }
        }
    },
    {
        description: 'Settings changed',
        method: 'GET',
        path: '/settings_changed',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            if (Homey.app) {
                let result = Homey.app.settingsChanged();
                if (result instanceof Error) callback(result);
                callback(null, result);
            } else {
                callback('App not ready, please try again');
            }
        }
    },
    {
        description: 'Log lines',
        method: 'GET',
        path: '/log',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            if (Log) {
                let result = Log.getLogLines();
                if (result instanceof Error) callback(result);
                callback(null, result);
            } else {
                callback(null, '');
            }
        }
    },
    {
        description: 'Log level',
        method: 'GET',
        path: '/loglevel',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            if (Log) {
                let result = Log.getLevel();
                if (result instanceof Error) callback(result);
                callback(null, result);
            } else {
                callback(null, '');
            }
        }
    },
    {
        description: 'Set log level',
        method: 'POST',
        path: '/loglevel',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            if (Log && args && args.body) {
                const level = args.body.level;
                Log.info("Set log level: " + level);
                let result = Log.setLevel(level);
                if (result instanceof Error) callback(result);
                callback(null, result);
            } else {
                callback('App not ready, please try again');
            }
        }
    },
];
