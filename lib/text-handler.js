'use strict';
/*
 * TextHandler is a mini module explicitly created in order
 * to miniumize the exposure of the chrome authority.
 */

var debug = require('./debug').debug;

// Add-on SDK require Ci to be established with destructuring syntax.
var { Ci } = require('chrome');

// Return the nsDOMWindowUtils for the given element.
function getWindowUtils(element) {
    var win = element.ownerDocument.defaultView;
    return win.QueryInterface(Ci.nsIInterfaceRequestor)
                              .getInterface(Ci.nsIDOMWindowUtils);
}

// sendKeyEvent will send keyboard events into the element,
// for the keypress event, it comes with a side effect of
// inserting the actual character (and the 'input' event).
exports.sendKeyEvent =
  function th_sendKeyEvent(element, type, keyCode, charCode) {
    debug('[th/sendKeyEvent]', type, keyCode, charCode);
    var utils = getWindowUtils(element);

    utils.sendKeyEvent(type, keyCode, charCode, null);
  };

// sendCompositionEvent will send composition events into the element.
// it only works on the element if the element has the focus.
// additionally, composition data will be inserted when the focus being taken
// away.
exports.sendCompositionEvent =
  function th_sendKeyEvent(element, type, text, locale) {
    debug('[th/sendCompositionEvent]', type, text, locale);

    var utils = getWindowUtils(element);
    switch (type) {
      case 'compositionstart':
        utils.sendCompositionEvent(type, text, locale);

        break;

      case 'compositionupdate':
        utils.sendCompositionEvent(type, text, locale);
        utils.sendTextEvent(text, text.length, utils.COMPOSITION_ATTR_RAWINPUT,
          0, 0, 0, 0, text.length, 0);

        break;

      case 'compositionend':
        utils.sendTextEvent(text, 0, utils.COMPOSITION_ATTR_RAWINPUT,
          0, 0, 0, 0, text.length, 0);
        utils.sendCompositionEvent(type, text, locale);

        break;
    }
  };
