'use strict';

const Homey = require('homey');

class MQTTHomieDiscoveryDevice extends Homey.Device {

	onInit() {
        this.log('MQTT Homie Discovery Device...');

        // NOTE: This device is never initialized.
        // The Homie Discovery driver adds a pre-configured MQTT Device
        // see driver.onMapDeviceClass(device)
    }
}

module.exports = MQTTHomieDiscoveryDevice;