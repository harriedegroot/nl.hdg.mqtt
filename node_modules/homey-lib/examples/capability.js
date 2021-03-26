'use strict';

const HomeyLib = require('..');

const capabilities = HomeyLib.getCapabilities();
const capabilityId = process.argv[2] || 'onoff';
console.log(JSON.stringify({ [capabilityId]: capabilities[capabilityId] }, false, 2))
console.log(`Has Capability ${capabilityId}:`, HomeyLib.hasCapability(capabilityId));