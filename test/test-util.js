'use strict';

var testUtil = require('./util');

exports['test testUtil setupTest'] = function(assert, done) {
  testUtil.setupTest('', function(tab) {
    assert.pass('testUtil setupTest running.');
    if (tab.url !== testUtil.defaultURL) {
      assert.fail('testUtil url unexpected.');
    } else {
      assert.pass('testUtil url expected.');
    }
    done();
  });
};

exports['test testUtil setupTest getFocusedElement'] = function(assert, done) {
  testUtil.setupTest('', function(tab) {
    var el = testUtil.getFocusedElement();
    if (!el || el.ownerDocument.location.href !== testUtil.defaultURL) {
      assert.fail('getFocusedElement url unexpected.');
    } else {
      assert.pass('getFocusedElement url expected.');
    }
    done();
  });
};

require('test').run(exports);
