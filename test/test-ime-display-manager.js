'use strict';

var testUtil = require('./util');

var IMEDisplayManager = require('ime-display-manager').IMEDisplayManager;
var getFocusedElement = require('window/utils').getFocusedElement;

exports['test IMEDisplayManager'] = function(assert, done) {
  testUtil.setupTest('', function(tab) {
    var mockFrontend = { stopInput: function() {} };
    var displayManager = new IMEDisplayManager(mockFrontend);

    var el = testUtil.getFocusedElement();

    displayManager.start();
    displayManager.show(el);
    displayManager.hide();
    displayManager.stop();

    assert.pass('Done.');

    done();
  });
};

require('test').run(exports);
