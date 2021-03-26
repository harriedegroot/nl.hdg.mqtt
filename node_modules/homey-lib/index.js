'use strict';

module.exports.App = require('./lib/App');
module.exports.Device = require('./lib/Device');
module.exports.Capability = require('./lib/Capability');
module.exports.Signal = require('./lib/Signal');
module.exports.Media = require('./lib/Media');
module.exports.Energy = require('./lib/Energy');

module.exports.getDeviceClasses = module.exports.Device.getClasses.bind(module.exports.Device);
module.exports.getDeviceClass = module.exports.Device.getClass.bind(module.exports.Device);

module.exports.getCapabilities = module.exports.Capability.getCapabilities.bind(module.exports.Capability);
module.exports.getCapability = module.exports.Capability.getCapability.bind(module.exports.Capability);
module.exports.hasCapability = module.exports.Capability.hasCapability.bind(module.exports.Capability);

module.exports.getAppLocales = module.exports.App.getLocales.bind(module.exports.App);
module.exports.getAppCategories = module.exports.App.getCategories.bind(module.exports.App);
module.exports.getAppPermissions = module.exports.App.getPermissions.bind(module.exports.App);
module.exports.getAppBrandColor = module.exports.App.getBrandColor.bind(module.exports.App);

module.exports.getMediaCodecs = module.exports.Media.getCodecs.bind(module.exports.Media);

module.exports.getCurrencies = module.exports.Energy.getCurrencies.bind(module.exports.Energy);;
module.exports.getBatteries = module.exports.Energy.getBatteries.bind(module.exports.Energy);;
