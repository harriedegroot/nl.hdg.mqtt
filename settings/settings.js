var $app;
var language = 'en';
var loading = true;
var running = false;
var hubSettings = {};
var refreshLogEnabled = false;
var log = '';
var logTimeout = 0;
var FETCH_LOG_DELAY = 5000;

const defaultSettings = {
    "protocol": "homie3",
    "topicRoot": "homie",
    "deviceId": "homey",
    "topicIncludeClass": false,
    "topicIncludeZone": false,
    "propertyScaling": "default",
    "colorFormat": "hsv",
    "broadcastDevices": true,
    "broadcastSystemState": false
};

const homie3Settings = {
    "topicIncludeClass": false,
    "topicIncludeZone": false,
    "propertyScaling": "default",
    "colorFormat": "hsv",
    "broadcastDevices": true
};

const haSettings = {
    "propertyScaling": "default" // not implemented yet
};
const customSettings = {
    "propertyScaling": "default" // not implemented yet
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
//        get: (_, callback) => callback(null, defaultSettings),
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
//        set: () => 'settings saved',
//        alert: (...args) => alert(...args)
//    })
//});

//////////////////////////////////////////////

function onHomeyReady(homeyReady){
    Homey = homeyReady;
    Homey.ready();
    hubSettings = defaultSettings;
    
    Homey.api('GET', '/running', null, (err, result) => {
        $("#running").prop("disabled", false);
        running = !err && result;
    });

    Homey.get('settings', function (err, savedSettings) {

        if (err) {
            Homey.alert(err);
        } else if (savedSettings) {
            Object.assign(hubSettings, savedSettings);
        }
            
        for (let key of Object.keys(defaultSettings)) {
            if (defaultSettings.hasOwnProperty(key)) {
                const el = document.getElementById(key);
                if (el) {
                    switch (typeof defaultSettings[key]) {
                        case 'boolean':
                            el.checked = hubSettings[key];
                            break;
                        default:
                            el.value = hubSettings[key];
                            break;
                    }
                }
            }
        }

        lockProtocolSetttings(hubSettings.protocol || 'homie');
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
                        Homey.alert(err ? 'failed to refresh device states' : 'refreshed sucessfully');
                    });
                }, 0)
                
            }
        },
        async mounted() {
            try {
                await this.getZones();
                await this.getDevices();
            } catch (e) {
                // TODO: Log error;
            }

            lockProtocolSetttings(hubSettings.protocol || 'homie');
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
    lockProtocolSetttings(protocol);
    saveSettings();
}

function lockProtocolSetttings(protocol) {
    let settings = {};
    switch (protocol) {
        case 'homie3':
            settings = homie3Settings;
            break;
        case 'ha':
            settings = haSettings;
            break;
        case 'custom':
            settings = customSettings;
            break;
    }

    lockSettings(settings);
}

function lockSettings(settings) {
    hubSettings = Object.assign(hubSettings, settings);
    for (let key of Object.keys(defaultSettings)) {
        if (defaultSettings.hasOwnProperty(key)) {
            const disabled = settings.hasOwnProperty(key);
            const el = document.getElementById(key);
            
            if (disabled) {
                switch (typeof settings[key]) {
                    case 'boolean':
                        el.checked = settings[key];
                        break;
                    default:
                        el.value = settings[key];
                }
            }   
            el.disabled = disabled;
            $('#' + key + '-container').toggle(!disabled);
        }
    }
}

function saveSettings(warning) {
    if (warning) Homey.alert("Changes are being saved. Press 'Broadcast' to publish them to the broker");

    for (let key in defaultSettings) {
        let el = document.getElementById(key);
        if (el) {
            hubSettings[key] = typeof defaultSettings[key] === 'boolean' ? el.checked : el.value;
        }
    }
    _writeSettings(warning);
}

function _writeSettings(warning) {
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