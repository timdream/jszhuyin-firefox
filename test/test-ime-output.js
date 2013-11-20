'use strict';

var testUtil = require('./util');

var IMEOutput = require('ime-output').IMEOutput;

exports['test IMEOutput (set|finish)Composition'] = function(assert, done) {
  testUtil.setupTest('', function(tab) {
    var el = testUtil.getFocusedElement();

    var imeOutput = new IMEOutput();
    imeOutput.setFocusedElement(el);

    var expectedEvents = [
      { type: 'compositionstart' },

      { type: 'compositionupdate', data: 'ㄊ' },
      { type: 'input', _value: 'ㄊ', _selectionStart: 1, _selectionEnd: 1 },

      { type: 'compositionupdate', data: 'ㄊㄞ' },
      { type: 'input', _value: 'ㄊㄞ', _selectionStart: 2, _selectionEnd: 2 },

      { type: 'compositionupdate', data: 'ㄊㄞˊ' },
      { type: 'input', _value: 'ㄊㄞˊ', _selectionStart: 3, _selectionEnd: 3 },

      { type: 'compositionupdate', data: '臺' },
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
          assert.strictEqual(
            evt[prop], expectedEvent[prop],
            'Unexpected event property ' + prop + '.');

          continue;
        }

        assert.strictEqual(
          el[prop.substr(1)], expectedEvent[prop],
          'Unexpected element property ' + prop.substr(1) + '.');
      }

      if (expectedEvents.length === 0) {
        done();
      }
    }

    el.addEventListener('compositionstart', check, true);
    el.addEventListener('compositionupdate', check, true);
    el.addEventListener('compositionend', check, true);
    el.addEventListener('input', check, true);

    imeOutput.setComposition('ㄊ');
    imeOutput.setComposition('ㄊ');
    imeOutput.setComposition('ㄊㄞ');
    imeOutput.setComposition('ㄊㄞˊ');
    imeOutput.finishComposition('臺');
  });
};

require('test').run(exports);
