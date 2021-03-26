'use strict';

const { Device } = require('..');
const classes = require('..').getDeviceClasses();

Promise.resolve().then(async () => {  
  for( const classId in classes ) {
    const classObj = Device.getClass(classId);
        
   	console.log(`DeviceClass ${classId} validated successfully`);
  }
}).catch(console.error)