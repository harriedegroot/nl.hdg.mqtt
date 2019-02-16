"use strict";

const _guid = new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'i');

/**
 * @deprecated [DEPRECATED] Was used by deprecated DescribeCommandHandler
 * */
class DeviceInfo {

    static parseCapabilities(device) {
        let capabilities = (device.capabilitiesObj || device.capabilities);
        if (Array.isArray(capabilities)) {
            capabilities = capabilities.map(c => typeof c === 'string' ? { name: c } : c);
        }
        return capabilities;
    }

    constructor(device) {
        
        if (typeof device === 'string') {
            device = _guid.test(device) ? { id: device } : { name: device };
        }

        this.type = 'Device';
        this.id = device.id;
        this.class = device.class;
        this.zone = device.zone;
        this.name = device.name;
        this.state = device.state;
        this.capabilities = DeviceInfo.parseCapabilities(device);
    }
}

module.exports = DeviceInfo;
