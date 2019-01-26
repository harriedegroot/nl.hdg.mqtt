var language = 'en';
var gatewaySettings = {};
const defaultSettings = {
    "topicRoot": "homie",
    "deviceId": "homey",
    "topicIncludeClass": false,
    "topicIncludeZone": false
};

//$(document).ready(function () {
//    onHomeyReady({
//        ready: () => { },
//        get: (_, callback) => callback(null, defaultSettings),
//        api: (method, url, _, callback) => {
//            switch (url) {
//                case '/devices':
//                    return callback(null, { test: { id: 'test', name: "test", zone: "zone" } });
//                case '/zones':
//                    return callback(null, { zone: { name: 'zone' } });
//                default:
//                    return callback(null, {});
//            }
//        },
//        getLanguage: () => 'en',
//        set: () => 'settings saved',
//        alert: () => alert(...arguments)
//    })
//});

function onHomeyReady(homeyReady){
    Homey = homeyReady;
    Homey.ready();
    gatewaySettings = defaultSettings;
    
    Homey.get('settings', function (err, savedSettings) {
            
        if (err) {
            Homey.alert(err);
        } else if (savedSettings) {
            gatewaySettings = savedSettings;
        }
            
        for (let key in defaultSettings) {
            if (defaultSettings.hasOwnProperty(key)) {
                if (typeof defaultSettings[key] === 'boolean') {
                    const el = document.getElementById(key);
                    if (el) {
                        el.checked = gatewaySettings[key];
                    }
                }
            }
        }
    });
        
    showTab(1);
    getLanguage();

    new Vue({
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
                    return "<img src=\"" + device.iconObj.url + "\" style=\"height:30px;width:auto;\"/>";
                } catch (e) {
                    return "<!-- no device.iconObj.url -->";
                }
            }
        },
        async mounted() {
            await this.getZones();
            await this.getDevices();
        },
        computed: {
            devices() {
                return this.devices;
            },
            zones() {
                return this.zones;
            }
        }
    })
}

function showTab(tab){
    $('.tab').removeClass('tab-active');
    $('.tab').addClass('tab-inactive');
    $('#tabb' + tab).removeClass('tab-inactive');
    $('#tabb' + tab).addClass('active');
    $('.panel').hide();
    $('#tab' + tab).show();
}

function getLanguage() {
    try {
        Homey.getLanguage(function (err, language) {
            language = language === 'nl' ? 'nl' : 'en';
            const el = document.getElementById("instructions" + language) || document.getElementById("instructionsen");
            if (el) {
                el.style.display = "inline";
            }
        });
    } catch (e) {
        Homey.alert('Failed to get language: ' + e);
        const el = document.getElementById("instructions" + language) || document.getElementById("instructionsen");
        if (el) {
            el.style.display = "inline";
        }
    }
}

function saveSettings() {

    for (let key in defaultSettings) {
        let el = document.getElementById(key);
        if (el) {
            gatewaySettings[key] = typeof defaultSettings[key] === 'boolean' ? el.checked : el.value;
        }
    }

    try {
        Homey.set('settings', gatewaySettings);
    } catch (e) {
        Homey.alert('Failed to save settings: ' + e);
    }
}

function saveDevice(device, checked) {
    if (typeof device !== 'object' || !device.id)
        return;

    gatewaySettings.devices = gatewaySettings.devices || {};
    gatewaySettings.devices[device.id] = checked;

    try {
        Homey.set('settings', gatewaySettings);
    } catch (e) {
        Homey.alert('Failed to save settings: ' + e);
    }
}

function deviceEnabled(device) {
    if (typeof device !== 'object' || !device.id)
        return false;
    
    return !gatewaySettings.devices || gatewaySettings.devices[device.id] !== false;
}