'use strict';

const { getCapability, Capability } = require('..');
const capabilityId = process.argv[2];
const capabilityObj = getCapability(capabilityId);

const capability = new Capability( capabilityObj );
capability.validate({
	debug: true,
}).then(() => {
	console.log(`Capability ${capabilityId} validated successfully`);
}).catch( err => {
	console.error(`Capability ${capabilityId} did not validate`);
	console.error( err );
})