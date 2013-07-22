var debug = require("debug");

exports["test debug exist"] = function(assert) {
  assert.equal(typeof debug.debug, 'function', 'debug() function exists.');
};

exports["test debug runs"] = function(assert) {
  debug.debug('Hi!');
  assert.pass('debug() runs.');
};

require("test").run(exports);
