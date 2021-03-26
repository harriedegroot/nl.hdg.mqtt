'use strict';

module.exports.App = require('./lib/App');
module.exports.Device = require('./lib/Device');
module.exports.Capability = require('./lib/Capability');
module.exports.Signal = require('./lib/Signal');
module.exports.Media = require('./lib/Media');

module.exports.getDeviceClasses = module.exports.Device.getClasses;
module.exports.getDeviceClass = module.exports.Device.getClass;

module.exports.getCapabilities = module.exports.Capability.getCapabilities;
module.exports.getCapability = module.exports.Capability.getCapability;

module.exports.getAppLocales = module.exports.App.getLocales;
module.exports.getAppCategories = module.exports.App.getCategories;
module.exports.getAppPermissions = module.exports.App.getPermissions;

module.exports.getMediaCodecs = module.exports.Media.getCodecs;