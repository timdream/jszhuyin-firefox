'use strict';

var testUtil = require('./util');

var TextHandler = require('text-handler');

exports['test TextHandler sendKeyEvent'] = function(assert, done) {
  testUtil.setupTest('', function(tab) {
    var el = testUtil.getFocusedElement();

    var code = ('A').charCodeAt(0);

    var expectedEvents = [
      { type: 'keydown', keyCode: code, charCode: 0 },
      { type: 'keypress', keyCode: 0, charCode: code },
      { type: 'input', _value: 'A', _selectionStart: 1, _selectionEnd: 1 },
      { type: 'keyup', keyCode: code, charCode: 0 }
    ];

    var check = function check(evt) {
      var expectedEvent = expectedEvents.shift();
      if (!expectedEvent) {
        assert.fail('Unexpected event.');
      }

      for (var prop in expectedEvent) {
        if (prop[0] !== '_') {
          if (expectedEvent[prop] === evt[prop]) {
            assert.pass('Expected property ' + prop);
          } else {
            assert.fail('Expect event property ' + prop + ' to be "' +
              expectedEvent[prop] + '" but received "' + evt[prop] + '".');
          }

          continue;
        }

        if (expectedEvent[prop] === el[prop.substr(1)]) {
          assert.pass('Expected element property ' + prop.substr(1));
        } else {
          assert.fail('Expect element property ' + prop.substr(1) +
            ' to be "' + expectedEvent[prop] + '" but received "' +
            el[prop.substr(1)] + '".');
        }
      }

      if (expectedEvents.length === 0) {
        done();
      }
    }

    el.addEventListener('keydown', check, true);
    el.addEventListener('keypress', check, true);
    el.addEventListener('keyup', check, true);
    el.addEventListener('input', check, true);

    TextHandler.sendKeyEvent(el, 'keydown', code, 0);
    TextHandler.sendKeyEvent(el, 'keypress', 0, code);
    TextHandler.sendKeyEvent(el, 'keyup', code, 0);
  });
};

exports['test TextHandler sendCompositionEvent'] = function(assert, done) {
  testUtil.setupTest('', function(tab) {
    var el = testUtil.getFocusedElement();

    var code = ('A').charCodeAt(0);

    var expectedEvents = [
      { type: 'compositionstart' },

      { type: 'compositionupdate', data: 'ㄊ' },
      { type: 'input', _value: 'ㄊ', _selectionStart: 1, _selectionEnd: 1 },

      { type: 'compositionupdate', data: 'ㄊㄞ' },
      { type: 'input', _value: 'ㄊㄞ', _selectionStart: 2, _selectionEnd: 2 },

      { type: 'compositionupdate', data: 'ㄊㄞˊ' },
      { type: 'input', _value: 'ㄊㄞˊ', _selectionStart: 3, _selectionEnd: 3 },

      { type: 'compositionend', data: '臺' },
      { type: 'input', _value: '臺', _selectionStart: 1, _selectionEnd: 1 }
    ];

    var check = function check(evt) {
      var expectedEvent = expectedEvents.shift();
      if (!expectedEvent) {
        assert.fail('Unexpected event ' + evt.type);
      }

      for (var prop in expectedEvent) {
        if (prop[0] !== '_') {
          if (expectedEvent[prop] === evt[prop]) {
            assert.pass('Expected event property ' + prop);
          } else {
            assert.fail('Expect event property ' + prop + ' to be "' +
              expectedEvent[prop] + '" but received "' + evt[prop] + '".');
          }

          continue;
        }


        if (expectedEvent[prop] === el[prop.substr(1)]) {
          assert.pass('Expected element property ' + prop.substr(1));
        } else {
          assert.fail('Expect element property ' + prop.substr(1) +
            ' to be "' + expectedEvent[prop] + '" but received "' +
            el[prop.substr(1)] + '".');
        }
      }

      if (expectedEvents.length === 0) {
        done();
      }
    }

    el.addEventListener('compositionstart', check, true);
    el.addEventListener('compositionupdate', check, true);
    el.addEventListener('compositionend', check, true);
    el.addEventListener('input', check, true);

    TextHandler.sendCompositionEvent(el, 'compositionstart', 'ㄊ');
    TextHandler.sendCompositionEvent(el, 'compositionupdate', 'ㄊ');
    TextHandler.sendCompositionEvent(el, 'compositionupdate', 'ㄊㄞ');
    TextHandler.sendCompositionEvent(el, 'compositionupdate', 'ㄊㄞˊ');
    TextHandler.sendCompositionEvent(el, 'compositionend', '臺');
  });
};

require('test').run(exports);
