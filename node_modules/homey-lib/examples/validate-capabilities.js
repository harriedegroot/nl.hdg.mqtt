'use strict';

const { getCapability, Capability } = require('..');
const capabilities = require('..').getCapabilities();

Promise.resolve().then(async () => {  
  for( const capabilityId in capabilities ) {
    const capabilityObj = getCapability(capabilityId);
    
    const capability = new Capability( capabilityObj );
    await capability.validate();
    
   	console.log(`Capability ${capabilityId} validated successfully`);
  }
}).catch(console.error)