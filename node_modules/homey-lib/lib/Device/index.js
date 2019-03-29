'use strict';

const Capability = require('../Capability');

let classesCache;

class Device {
	
	static getClasses() {
  	if( classesCache ) return classesCache;
  
    const deviceClasses = require('../../assets/device/classes.json');
  	classesCache = deviceClasses.reduce((obj, classId) => {
      obj[classId] = require(`../../assets/device/classes/${classId}.json`);
      return obj;
  	}, {});
  	return classesCache;
	}
	
	static getClass(id) {
  	const deviceClasses = Device.getClasses();
  	const deviceClass = deviceClasses[id];
  	if( !deviceClass )
  	  throw new Error('invalid_class');
    return deviceClass;
	}
	
  // legacy
	static getCapabilities() {
  	return Capability.getCapabilities();
	}
	
}

module.exports = Device;