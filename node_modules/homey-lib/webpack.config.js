'use strict';

const path = require('path');

module.exports = {
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'webpack'),
    filename: 'index.js',
    library: 'HomeyLib',
    libraryTarget: 'umd',
  },
  node: {
    fs: 'empty',
    util: 'empty'
  },
  mode: 'production',
};