var $app;
var language = 'en';
var loading = true;
var running = false;
var hubSettings = {};
var refreshLogEnabled = false;
var log = '';
var logTimeout = 0;
var FETCH_LOG_DELAY = 5000;

const STATUS_TOPIC = 'hass/status';
const STATUS_ONLINE = 'online';
const STATUS_OFFLINE = 'offline';

const defaultSettings = {
    "systemName": 'Homey',
    "deviceId": '',
    "protocol": "homie3",
    "homieTopic": "homie/{deviceId}",

    "customTopic": "homie/{deviceId}",
    "topicIncludeClass": false,
    "topicIncludeZone": false,
    "normalize": true,
    "percentageScale": "int",
    "colorFormat": "hsv",
    "broadcastDevices": true,

    "hass": false,
    "hassTopic": "homeassistant",
    "hassStatusTopic": "hass/status",
    "hassOnlineMessage": "online",
    "hassOfflineMessage": "offline",

    "broadcastSystemState": false,
    "systemStateTopic": "{deviceId}/system/info",

    "commands": false,
    "commandTopic": "{deviceId}/$command",

    "birthWill": true,
    "birthTopic": "{deviceId}/hub/status",
    "birthMessage": "online",
    "willTopic": "{deviceId}/hub/status",
    "willMessage": "offline"
};

const homie3Settings = {
    //"topicIncludeClass": false,
    //"topicIncludeZone": false,
    //"colorFormat": "hsv",
    //"broadcastDevices": true
};

const haSettings = {
    //"percentageScale": "int"
};
const customSettings = {
    //"percentageScale": "default"
};

//////////////////////////////////////////////

//const testDevices = {
//    test: { id: 'test', name: "test some long named device lkfjdh sdlkfjhgsldkfhg lksdjfhslkdh ", zone: "zone", iconObj: { url: "../assets/icon.svg" }},
//    test1: { id: 'test', name: "device 1", zone: "zone" },
//    test2: { id: 'test', name: "device 2", zone: "zone" },
//    test3: { id: 'test', name: "device 3", zone: "zone" },
//    test4: { id: 'test', name: "device 4", zone: "zone" },
//    test5: { id: 'test', name: "device 5", zone: "zone" },
//    test6: { id: 'test', name: "device 6", zone: "zone" },
//    test7: { id: 'test', name: "device 7", zone: "zone" },
//    test8: { id: 'test', name: "device 8", zone: "zone" },
//    test9: { id: 'test', name: "device 9", zone: "zone" },
//    test10: { id: 'test', name: "device 10", zone: "zone" }
//};
//$(document).ready(function () {
//    onHomeyReady({
//        ready: () => { },
//        get: (_, callback) => callback(null, {
//            ...defaultSettings, ...{
//                systemName: 'Homey',
//                deviceId: "Harrie",
//                protocol: 'custom',
//                hass: true,
//                broadcastSystemState: true,
//                commands: true,
//                birthWill: true
//            }
//        }),
//        api: (method, url, _, callback) => {
//            switch (url) {
//                case '/devices':
//                    return setTimeout(() => callback(null, testDevices), 2000);
//                case '/zones':
//                    return callback(null, { zone: { name: 'zone' } });
//                case '/log':
//                    return callback(null, ["test " + Math.random(), "test " + Math.random()]);
//                default:
//                    return callback(null, {});
//            }
//        },
//        getLanguage: (cb) => cb(null, 'en'),
//        set: (_, settings) => console.log(settings),
//        alert: (...args) => alert(...args)
//    })
//});

//////////////////////////////////////////////

function onHomeyReady(homeyReady){
    Homey = homeyReady;
    Homey.ready();
    hubSettings = { ...defaultSettings };
    
    Homey.api('GET', '/running', null, (err, result) => {
        $("#running").prop("disabled", false);
        running = !err && result;
    });
    
    showTab(1);
    getLanguage();

    $app = new Vue({
        el: '#app',
        data: {
            devices: {},
            zones: {}
        },
        methods: {
            getZones() {
                return Homey.api('GET', '/zones', null, (err, result) => {
                    if (err) return Homey.alert('getZones ' + err);
                    this.zones = result;
                });
            },
            getDevices() {
                return Homey.api('GET', '/devices', null, (err, result) => {
                    loading = false;
                    if (err) return Homey.alert('getDevices ' + err);
                    this.devices = Object.keys(result).map(key => result[key]);
                });
            },
            getZone: function (device) {
                const zoneId = typeof device.zone === 'object' ? device.zone.id : device.zone;
                const zone = this.zones && this.zones[zoneId];
                return zone && zone.name ? zone.name : 'unknown';
            },
            getIcon: function (device) {
                try {
                    return "<img src=\"" + device.iconObj.url + "\" style=\"width:auto;height:auto;max-width:50px;max-height:30px;\"/>";
                } catch (e) {
                    return "<!-- no device.iconObj.url -->";
                }
            },
            setRunning: function (value) {
                running = !!value;
                const el = document.getElementById("running");
                if (el) {
                    el.checked = running;
                    Homey.api('post', '/running', { running }, (err, result) => {
                        // TODO: Fetch state again
                    });
                }

                // TODO: Call app
            },
            refresh: function () {
                $("#refreshButton").prop("disabled", true);
                setTimeout(() => {
                    Homey.api('GET', '/refresh', null, (err, result) => {
                        $("#refreshButton").prop("disabled", false);
                        if (err) {
                            Homey.alert('Failed to refresh device states');
                        }
                        //Homey.alert(err ? 'failed to refresh device states' : 'refreshed sucessfully');
                    });
                }, 0);
                
            },
            reset: function () {
                // confirm?
                //if(Homey.confirm("Reset default settings?")){
                    const deviceId = hubSettings.systemName;
                    hubSettings = { ...defaultSettings };
                    hubSettings.deviceId = deviceId || 'Homey';
                    updateValues();
                    _writeSettings();
                //}
            }
        },
        async mounted() {
            try {
                await this.getZones();
                await this.getDevices();
            } catch (e) {
                // TODO: Log error;
            }
             
            updateInterface();
        },
        computed: {
            devices() {
                return this.devices;
            },
            zones() {
                return this.zones;
            }
        }
    });

    Homey.get('settings', function (err, savedSettings) {

        if (err) {
            Homey.alert(err);
        } else if (savedSettings) {
            Object.assign(hubSettings, savedSettings);
        }
        updateValues();
    });
}

const normalize = function (topic) {
    if (typeof topic !== 'string') return undefined;

    return topic
        .split('/')
        .map(name => name
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[ _]/g, "-")
            .replace(/[^a-z0-9-]/g, "")
        )
        .join('/');
};

function parseTopic(key, value) {

    if (value && typeof value === 'string') {
        if (hubSettings.deviceId) {
            value = value.replace('{deviceId}', normalize(hubSettings.deviceId));
        }

        return hubSettings.normalize !== false && ['homieTopic', 'customTopic'].includes(key)
            ? normalize(value)
            : value;
    }
    return value;
}

function updateValues() {

    for (let key of Object.keys(defaultSettings)) {
        if (defaultSettings.hasOwnProperty(key)) {
            const el = document.getElementById(key);
            if (el) {
                const value = hubSettings[key];
                switch (typeof defaultSettings[key]) {
                    case 'boolean':
                        el.checked = value;
                        break;
                    default:
                        el.value = key.indexOf('Topic') !== -1 ? parseTopic(key, value) : value;
                        break;
                }
            }
        }
    }

    if ($app) {
        $app.$forceUpdate();
    }

    updateInterface();
}

function showTab(tab, log){
    $('.tab').removeClass('tab-active');
    $('.tab').addClass('tab-inactive');
    $('#tabb' + tab).removeClass('tab-inactive');
    $('#tabb' + tab).addClass('active');
    $('.panel').hide();
    $('#tab' + tab).show();
    
    refreshLog(log);
}

function getLanguage() {
    const el = document.getElementById("instructionsen");
    if (el) {
        el.style.display = "inline";
    }

    //NOTE: Enable if dutch instructions are available
    //try {
    //    Homey.getLanguage(function (err, language) {
    //        language = language === 'nl' ? 'nl' : 'en';
    //        const el = document.getElementById("instructions" + language) || document.getElementById("instructionsen");
    //        if (el) {
    //            el.style.display = "inline";
    //        }
    //    });
    //} catch (e) {
    //    Homey.alert('Failed to get language: ' + e);
    //    const el = document.getElementById("instructions" + language) || document.getElementById("instructionsen");
    //    if (el) {
    //        el.style.display = "inline";
    //    }
    //}
}

function selectProtocol(protocol) {
    saveSettings();
}

function updateInterface() {
    $('#homieSettings').toggle(hubSettings.protocol === 'homie3');
    $('#customSettings').toggle(hubSettings.protocol === 'custom');
    $('#hassSettings').toggle(hubSettings.hass);
    $('#systemStateSettings').toggle(hubSettings.broadcastSystemState);
    $('#commandsSettings').toggle(hubSettings.commands);
    $('#birthWillSettings').toggle(hubSettings.birthWill);
}

function saveSettings(broadcast, write) {
    for (let key in defaultSettings) {
        let el = document.getElementById(key);
        if (el) {
            hubSettings[key] = typeof defaultSettings[key] === 'boolean' ? el.checked : el.value;
        }
    }

    updateInterface();
    _writeSettings();
}

function _writeSettings() {
    try {
        Homey.set('settings', hubSettings);
        Homey.api('GET', '/settings_changed', null, (err, result) => {
            if (err) Homey.alert("Failed to save changes");
        });
    } catch (e) {
        Homey.alert('Failed to save settings: ' + e);
    }
}

function saveDevice(device, checked) {
    if (typeof device !== 'object' || !device.id)
        return;

    hubSettings.devices = hubSettings.devices || {};
    hubSettings.devices[device.id] = checked;

    _writeSettings();
}

function deviceEnabled(device) {
    if (typeof device !== 'object' || !device.id)
        return false;
    
    return !hubSettings.devices || hubSettings.devices[device.id] !== false;
}

/*** LOG ***/

function refreshLog(refresh) {
    refreshLogEnabled = refresh;

    if (refresh && !log) {
        displayLog('loading...');
    }

    stopLogUpdateTimer();
    if (refresh) {
        updateLog();
    }
}

function displayLog(lines) {
    log = lines;
    $app.$forceUpdate();
}

function updateLog() {
    try {
        stopLogUpdateTimer();
        Homey.api('GET', '/log', null, (err, result) => {
            stopLogUpdateTimer();
            if (!err) {
                let lines = '';
                for (var i = 0; i < result.length; i++) {
                    lines += result[i] + "<br />";
                }
                displayLog(lines);

                if (refreshLogEnabled) {
                    setLogUpdateTimer();
                }
            } else {
                displayLog(err);
            }
        });
    } catch (e) {
        displayLog(e);
    }
}

function setLogUpdateTimer() {
    logTimeout = setTimeout(updateLog, FETCH_LOG_DELAY);
}

function stopLogUpdateTimer() {
    if (logTimeout) {
        clearTimeout(logTimeout);
        logTimeout = 0;
    }
}
