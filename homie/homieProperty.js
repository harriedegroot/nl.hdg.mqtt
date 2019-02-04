var _ = require('lodash');
var HomieProperty = module.exports = function (homieNode, name) {
  var t = this;
  t.name = name;
  t.friendlyName = null;
  t.setter = null;
  t.isSubscribedToSet = false;
  t.retained = true;
  t.homieNode = homieNode;
  t.mqttTopicProperty = t.homieNode.mqttTopic + '/' + t.name;
  t.format = null;
  t.datatype = null;
  t.unit = null;
  t.rangeIndex = null;
}
var proto = HomieProperty.prototype;

proto.onConnect = function () {
  var t = this;
  var mqttClient = t.homieNode.homieDevice.mqttClient;

  mqttClient.publish(t.mqttTopicProperty + '/$name', t.friendlyName, {retain: true});
  mqttClient.publish(t.mqttTopicProperty + '/$retained', t.retained ? 'true' : 'false', {retain: true});
  mqttClient.publish(t.mqttTopicProperty + '/$settable', t.setter ? 'true' : 'false', {retain: true});

  if (t.unit !== null) {
    mqttClient.publish(t.mqttTopicProperty + '/$unit', t.unit, {retain: true});
  }

  if (t.datatype !== null) {
    mqttClient.publish(t.mqttTopicProperty + '/$datatype', t.datatype, {retain: true});
  }

  if (t.format !== null) {
    mqttClient.publish(t.mqttTopicProperty + '/$format', t.format, {retain: true});
  }
}

proto.setName = function (friendlyName) {
  var t = this;
  t.friendlyName = friendlyName;
  return t;
}

proto.setUnit = function (unit) {
  var t = this;
  t.unit = unit;
  return t;
}

proto.setDatatype = function (datatype) {
  var t = this;
  t.datatype = datatype;
  return t;
}

proto.setFormat = function (format) {
  var t = this;
  t.format = format;
  return t;
}

proto.settable = function (setter) {
  var t = this;
  t.setter = setter;
  return t;
}

proto.setRetained = function (val) {
  var t = this;
  t.retained = val;
  return t;
}

proto.setRange = function (rangeIndex) {
  var t = this;
  t.rangeIndex = rangeIndex;
  return t;
}

proto.send = function (val) {
  var t = this;
  var mqttClient = t.homieNode.homieDevice.mqttClient;
  var topic = t.mqttTopicProperty;

  if (t.homieNode.isRange && t.rangeIndex !== null) {
    topic = t.homieNode.mqttTopic + '_' + t.rangeIndex + '/' + t.name;
  }

  mqttClient.publish(topic, val, {retain: t.retained});
  t.retained = false;
  t.rangeIndex = null;
  return t;
}
