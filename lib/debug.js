'use strict';

var DEBUG = false;
exports.debug = function debug() {
  if (!DEBUG)
    return;

  console.log.apply(console, arguments);
};
