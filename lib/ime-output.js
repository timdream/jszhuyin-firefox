'use strict';

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

  setFocusedElement: function io_setFocusedElement(focusedElement) {
    this.focusedElement = focusedElement;
  },

  canHandle: function io_canHandle(element) {
    if (!element)
      return false;

    if (this.inputTagNames.indexOf(element.tagName) === -1)
      return false;

    if (/input/i.test(element.tagName.toLowerCase()) &&
        this.inputTagTypeNames.indexOf(element.type) === -1)
      return false;

    // XXX: handle inputmode?

    return true;
  },

  regainFocus: function io_regainFocus() {
    if (!this.focusedElement)
      return;

    this.focusedElement.focus();
    var pos = this.focusedElement.value.length;
    this.focusedElement.setSelectionRange(pos, pos);
  },

  appendKey: function io_appendKey(code) {
    if (!this.focusedElement) {
      throw 'IMEOutput has no focused element.';
    }

    if (code === 8) {
      var val = this.focusedElement.value;
      return (this.focusedElement.value =
        (val.substr(0, val.length - 1)));
    }
    return this.appendText(String.fromCharCode(code));
  },

  appendText: function io_appendText(text) {
    if (!this.focusedElement) {
      throw 'IMEOutput has no focused element.';
    }

    return this.focusedElement.value += text;
  }
};
