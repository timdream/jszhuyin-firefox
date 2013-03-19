'use strict';

var TextHandler = require('./text-handler');

/*
 * IMEOutput is poor man's solution for inserting characters into
 * the nsIDOMElement.
 * It does not handle cursor position nor file key/composition
 * events. To do this right we will have to re-implement/copy
 * half of mozKeyboard API in B2G instead. Not something worth doing, yet.
 */
exports.IMEOutput = {
  // XXX: allow more types.
  inputTagNames: ['html:input', 'INPUT', 'html:textarea', 'TEXTAREA'],

  // See http://developers.whatwg.org/the-input-element.html#attr-input-type
  inputTagTypeNames: ['text', 'search', 'tel', 'url', 'email'],

  focusedElement: null,

  compositionData: '',

  setFocusedElement: function io_setFocusedElement(focusedElement) {
    if (this.compositionData &&
        this.focusedElement !== focusedElement) {
      // Reset composition before setting the focused element.
      this.setComposition('');
    }

    this.focusedElement = focusedElement;

  },

  canHandle: function io_canHandle(element) {
    if (!element)
      return false;

    if (element.contentEditable === 'true')
      return true;

    if (this.inputTagNames.indexOf(element.tagName) === -1)
      return false;

    if (/input/i.test(element.tagName.toLowerCase()) &&
        this.inputTagTypeNames.indexOf(element.type) === -1)
      return false;

    // XXX: handle inputmode?

    return true;
  },

  sendKey: function io_sendKey(code) {
    if (!this.focusedElement) {
      throw 'IMEOutput has no focused element.';
    }

    var keyCode = code;
    var charCode = code;

    // Because of
    // https://mxr.mozilla.org/mozilla-central/source/dom/base/
    // nsDOMWindowUtils.cpp#896, we will need to set charCode of
    // non-printable charcaters to 0. This is a non-exhaust list of that,
    // but covers what will be sent by JSZhuyin.
    if ([8, 13].indexOf(code) !== -1)
      charCode = 0;

    // XXX: send the three events at once without giving others the means
    // to control it.
    // Note that even though we send the same keyCode and charCode to
    // the function, the real code in the key events may be set to 0.
    ['keydown', 'keypress', 'keyup'].forEach((function sendKey(type) {
      TextHandler.sendKeyEvent(this.focusedElement, type, keyCode, charCode);
    }).bind(this));
  },

  setComposition: function io_setComposition(text) {
    // XXX: This function is working if the focus is kept on the element
    // during the composition process. Disabling because it currently doesn't.

    /*
    if (!this.focusedElement) {
      throw 'IMEOutput has no focused element.';
    }

    // If composition is not started and there is no text to set,
    // do nothing.
    if (!this.compositionData && !text)
      return;

    // If composition is started and no text to set,
    // that concludes the composition process (w/o inserting any text)
    if (!text) {
      TextHandler.sendCompositionEvent(this.focusedElement,
                                       'compositionend', this.compositionData);
      this.compositionData = '';

      return;
    }

    // If there is no composition data and we need to set something
    // start the composition.
    if (!this.compositionData) {
      TextHandler.sendCompositionEvent(this.focusedElement,
                                       'compositionstart', '');
    }

    // If the text changed,
    // send the compositionupdate event with the updated text.
    if (this.compositionData !== text) {
      TextHandler.sendCompositionEvent(this.focusedElement,
                                       'compositionupdate', text);
    }

    this.compositionData = text;
    */
  },

  finishComposition: function io_finishComposition(text) {
    if (!this.focusedElement) {
      throw 'IMEOutput has no focused element.';
    }

    // Do the final update ...
    this.setComposition(text);

    // ... and finish the composition
    // ('compositionend' event generates 'input' event),
    this.setComposition('');

    // and, insert the text for real.
    // XXX: this too generates the 'input' event.
    TextHandler.insertText(this.focusedElement, text);
  }
};
