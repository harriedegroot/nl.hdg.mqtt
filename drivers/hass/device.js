'use strict';

const Homey = require('homey');

class MQTTHomeAssistantDiscoveryDevice extends Homey.Device {

	onInit() {
        this.log('MQTT Home Assistant Discovery...');

        // NOTE: This device is never initialized.
        // The Home Assistant Discovery driver adds a pre-configured MQTT Device
        // see driver.onMapDeviceClass(device)
    }
}

module.exports = MQTTHomeAssistantDiscoveryDevice;