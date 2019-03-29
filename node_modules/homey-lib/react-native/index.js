'use strict';

if( typeof global !== 'undefined' ) {
  global.window = global.window || {};
  var wp = require('../webpack');
  if( wp ) {
    module.exports = wp;
  } else {
    module.exports = global.window.HomeyLib;
  }
} else {
  module.exports = undefined;
}