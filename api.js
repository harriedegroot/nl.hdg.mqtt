'use strict';
const Log = require('./Log');
const Homey = require('homey');

module.exports = [
    {
        description: 'Retrieve all devices with their information',
        method: 'GET',
        path: '/devices',
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
    }
];
