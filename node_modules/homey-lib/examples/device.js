'use strict';

const HomeyLib = require('..');

console.log('Device Classes:', Object.keys(HomeyLib.getDeviceClasses()));
console.log('Capabilities:', Object.keys(HomeyLib.getCapabilities()));