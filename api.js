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
            Homey.app.getDevices()
                .then(res => {
                    Log.debug(res);
                    callback(null, res);
                })
                .catch(error => {
                    Log.error(error);
                    callback(error, null);
                });
        }
    },
    {
        description: 'Retrieve all zones with their information',
        method: 'GET',
        path: '/zones',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            Homey.app.getZones()
                .then(res => {
                    Log.debug(res);
                    callback(null, res);
                })
                .catch(error => {
                    Log.error(error);
                    callback(error, null);
                });
        }
    },
    {
        description: 'Fetch running state',
        method: 'GET',
        path: '/running',
        fn: function (args, callback) {
            let result = Homey.app.isRunning();
            if (result instanceof Error) callback(result);
            callback(null, result);
        }
    },
    {
        description: 'Set running state',
        method: 'POST',
        path: '/running',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            let running = args && args.body && args.body.running;
            let result = Homey.app.setRunning(running);
            if (result instanceof Error) callback(result);
            callback(null, result);
        }
    },
    {
        description: 'Refresh device states',
        method: 'GET',
        path: '/refresh',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            let result = Homey.app.refresh();
            if (result instanceof Error) callback(result);
            callback(null, result);
        }
    },
    {
        description: 'Refresh device states',
        method: 'GET',
        path: '/refresh',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            let result = Homey.app.refresh();
            if (result instanceof Error) callback(result);
            callback(null, result);
        }
    },
    {
        description: 'Settings changed',
        method: 'GET',
        path: '/settings_changed',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            let result = Homey.app.settingsChanged();
            if (result instanceof Error) callback(result);
            callback(null, result);
        }
    },
    {
        description: 'Log lines',
        method: 'GET',
        path: '/log',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            let result = Log.getLogLines();
            if (result instanceof Error) callback(result);
            callback(null, result);
        }
    }
];
