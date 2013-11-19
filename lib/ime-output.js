'use strict';

var TextHandler = require('./text-handler');

/*
 * IMEOutput is poor man's solution for inserting characters into
 * the nsIDOMElement.
 * It does not handle cursor position nor file key/composition
 * events. To do this right we will have to re-implement/copy
 * half of mozKeyboard API in B2G instead. Not something worth doing, yet.
 */
var IMEOutput = function IMEOutput() {
  this.focusedElement = null;
  this.compositionData = '';
};

IMEOutput.prototype = {
  // XXX: allow more types.
  inputTagNames: ['html:input', 'INPUT', 'html:textarea', 'TEXTAREA'],

  // See http://developers.whatwg.org/the-input-element.html#attr-input-type
  inputTagTypeNames: ['text', 'search', 'tel', 'url', 'email'],

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

  sendKey: function io_sendKey(charCode) {
    if (!this.focusedElement) {
      throw 'IMEOutput has no focused element.';
    }

    // XXX: Block JSZhuyin from sending any non-printable keyCode.
    // This is not a problem since we have filtered them out in IMEFrontEnd.
    // However we would not be able to deal with them asynchronously with
    // other keys in sequence.
    // (i.e. type a Zhuyin symbol and hit enter really fast before the display
    //  come out will send the enter, not confirming the symbol.)
    if (charCode < 0x20) {
      throw 'IMEOutput.sendKey does not support non-printable characters ' +
      'specified by the keyCode ' + charCode.toString() + '.';
    }

    this.finishComposition(String.fromCharCode(charCode));
  },

  setComposition: function io_setComposition(text) {
    if (!this.focusedElement) {
      throw 'IMEOutput has no focused element.';
    }

    // If composition is not started and there is no text to set,
    // do nothing.
    if (!this.compositionData && !text)
      return;

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
  },

  finishComposition: function io_finishComposition(text) {
    if (!this.focusedElement) {
      throw 'IMEOutput has no focused element.';
    }

    // If composition has never started we will not need to finish it.
    if (!this.compositionData && !text)
      return;

    // If there is no composition data and we need to
    // start the composition.
    if (!this.compositionData) {
      TextHandler.sendCompositionEvent(this.focusedElement,
                                       'compositionstart', '');
    }

    // Finish the composition and commit the text
    TextHandler.sendCompositionEvent(this.focusedElement,
                                     'compositionend', text);
    this.compositionData = '';
  }
};

exports.IMEOutput = IMEOutput;
