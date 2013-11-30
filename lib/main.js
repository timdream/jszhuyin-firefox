'use strict';

/* Workarounds to include dependencies in the manifest
require('sdk/l10n')
require('sdk/hotkeys')
require('sdk/widget')
require('sdk/hotkeys')
require('window/utils')
require('./debug')
require('./key-monitor')
require('./ime-output')
require('./ime-worker-manager')
require('./ime-display-manager')
*/

/* With strict mode lazilyRequire() would need a variable to gain access to
   the global object. */
var global = this;
/**
 * lazilyRequire returns a wrapper function of the original module.
 * The module will only be loaded when the function is actually
 * called.
 * @param  {string}   moduleId     moduleId passed to real require().
 * @param  {string}   functionName function name of the module to mimic.
 * @param  {string}   propName     property name to replace when the real module
 *                                 is loaded.
 * @return {function}              A lazilyRequireLoader function mimics the
 *                                 function specified.
 */
var lazilyRequire = function lazilyRequire(moduleId, functionName, propName) {
  var self = this || global;
  propName = propName || functionName;

  return function lazilyRequireLoader() {
    // replace the lazilyRequireLoader with real function.
    self[propName] = require(moduleId)[functionName];

    if (this && this.constructor === lazilyRequireLoader) {
      // We are called with the 'new' operator.
      // We manually create an instance with given prototype, and send it to
      // the constuctor function w/o the 'new' operator.
      // If what returned is an object, return it,
      // otherwise return the instance.
      //
      // This should be equal to what the 'new' operator do as specified in
      // ECMA-262 3rd. Ediion, sec 13.2.2.
      var instance = Object.create(self[propName].prototype);
      var constuctorReturnValue = self[propName].apply(instance, arguments);

      return (typeof constuctorReturnValue === 'object') ?
              constuctorReturnValue : instance;
    } else {
      return self[propName].apply(self, arguments);
    }
  }
};

// "require" the following modules with laszilyRequire.
var _ = lazilyRequire('sdk/l10n', 'get', '_');

var Widget = lazilyRequire('sdk/widget', 'Widget');
var Hotkey = lazilyRequire('sdk/hotkeys', 'Hotkey');
var getFocusedElement = lazilyRequire('window/utils', 'getFocusedElement');

var debug = lazilyRequire('./debug', 'debug');

var KeyMonitor = lazilyRequire('./key-monitor', 'KeyMonitor');
var IMEOutput = lazilyRequire('./ime-output', 'IMEOutput');
var IMEWorkerManager =
  lazilyRequire('./ime-worker-manager', 'IMEWorkerManager');
var IMEDisplayManager =
  lazilyRequire('./ime-display-manager', 'IMEDisplayManager');

var IMEFrontend = function IMEFrontend() {
  this.active = false;
  this.inputActive = false;

  this.candidateSelectionMode = false;

  this.pendingsymbols = '';
  this.candidates = [];
  this.candidatePage = 0;

  // Show an widget
  this.widget = Widget({
    id: 'jszhuyin-indicator',
    label: _('JSZhuyin IME'),
    content: _('A')
  });

  // Register a hot key for toggling
  Hotkey({
    combo: this.hotkeyCombo,
    onPress: this.toggle.bind(this)
  });
};

IMEFrontend.prototype = {
  // XXX: make this configable
  hotkeyCombo: 'accel-alt-1',

  toggle: function if_toggle() {
    debug('[if/toggle]');
    if (!this.active) {
      this.start();
    } else {
      this.stop();
    }
  },

  start: function if_start() {
    if (this.active)
      return;

    debug('[if/start]');
    this.active = true;

    this.widget.content = 'ㄅ';

    if (!this.keyMonitor)
      this.keyMonitor = new KeyMonitor(this);
    if (!this.workerManager)
      this.workerManager = new IMEWorkerManager(this);
    if (!this.displayManager)
      this.displayManager = new IMEDisplayManager(this);
    if (!this.output)
      this.output = new IMEOutput();

    this.displayManager.start();
    this.keyMonitor.start();
    this.workerManager.start();
  },

  stop: function if_stop() {
    if (!this.active)
      return;

    debug('[if/stop]');
    this.active = false;

    this.widget.content = 'A';
    this.stopInput();

    this.displayManager.stop();
    this.keyMonitor.stop();
    this.workerManager.stop();
  },

  updateInput: function if_updateInput() {
    debug('[if/updateInput]');
    var focusedElement = getFocusedElement();
    if (this.output.canHandle(focusedElement)) {
      this.startInput(focusedElement);
    } else {
      this.stopInput();
    }
  },

  startInput: function if_startInput(focusedElement) {
    debug('[if/startInput]');
    this.inputActive = true;

    this.output.setFocusedElement(focusedElement);
  },

  stopInput: function if_stopInput() {
    debug('[if/stopInput]');
    if (!this.inputActive)
      return;

    this.inputActive = false;

    this.candidateSelectionMode = false;

    this.pendingsymbols = '';
    this.candidates = [];
    this.candidatePage = 0;
    this.toggleIMEDisplay();

    this.output.finishComposition('');
    this.output.setFocusedElement(null);
    this.workerManager.sendMessage('handleKeyEvent', 0x1b /* ESCAPE */);
  },

  setCandidateSelectionMode: function if_setCandidateSelectionMode(mode) {
    this.displayManager.sendMessage('candidateselectionmode', mode);
    this.candidateSelectionMode = mode;
  },

  toggleIMEDisplay: function if_toggleIMEDisplay() {
    if (this.pendingsymbols || this.candidates.length) {
      this.displayManager.show(getFocusedElement());
      this.keyMonitor.blockKeyUpDownEvent = true;
    } else if (this.displayManager.isShowing()) {
      this.displayManager.hide();
      this.keyMonitor.blockKeyUpDownEvent = false;
    }
  },

  handleWorkerMessage: function if_handleWorkerResult(name, data) {
    switch (name) {
      case 'compositionupdate':
        if (!this.inputActive)
          return;

        this.pendingsymbols = data;
        this.output.setComposition(data);
        this.toggleIMEDisplay();
        break;

      case 'candidateschange':
        if (!this.inputActive)
          return;

        this.candidates = data;
        this.candidatePage = 0;
        this.displayManager.sendMessage('candidates', data);
        this.toggleIMEDisplay();
        if (!this.candidates.length && this.candidateSelectionMode) {
          this.setCandidateSelectionMode(false);
        }
        break;

      case 'compositionend':
        this.output.finishComposition(data);
        break;
    }
  },

  handleDisplayMessage: function if_handleDisplayMessage(name, data) {
    switch (name) {
      case 'select':
        this.workerManager.sendMessage('selectCandidate', data);
        break;
    }
  },

  handleKeyEvent: function if_handleKeyEvent(keyCode, charCode, symbolCode) {
    this.updateInput();
    if (!this.inputActive)
      return false;

    // escape key: stop input mode immediately
    if (keyCode === 27) {
      this.stopInput();
      return true;
    }

    if (this.candidateSelectionMode) {
      // A non-printable character will come with charCode = 0,
      // let's squeeze these two code into one variable to simplify the logic.
      var charKeyCode = charCode || keyCode;

      var page = this.candidatePage;

      switch (charKeyCode) {
        case 8: // Backspace key: leave selection mode
          this.setCandidateSelectionMode(false);

          // IME engine will need to handle this bug too
          if (this.pendingsymbols) {
            // Let engine handles backspace
            this.workerManager.sendMessage('handleKeyEvent', keyCode);
          } else {
            // Let default handing to run instead.
            // return false;
            // ... or, remove the selection panel altogether w/o deleting
            // text that is sent?
            this.stopInput();
          }
          break;

        case 13: // Enter key: select 1st selection of the page
          if (!this.candidates[page * 9])
            break;

          this.workerManager.sendMessage('selectCandidate', this.candidates[page * 9]);
          break;

        case 37: // Left arrow key: flip candidate selection page
          if (page === 0)
            break;

          page = this.candidatePage -= 1;
          this.displayManager.sendMessage('candidateselectionpage', page);
          break;

        case 38: // Up arrow key: leaving candidate selection mode
          if (page !== 0) {
            page = 0;
            this.displayManager.sendMessage('candidateselectionpage', page);
          }

          this.setCandidateSelectionMode(false);
          break;

        case 39: // Right arrow key: flip candidate selection page
          if ((page + 1) * 9 >= this.candidates.length)
            break;

          page = this.candidatePage += 1;
          this.displayManager.sendMessage('candidateselectionpage', page);
          break;

        default:
          // Number keys: select selection
          if (charKeyCode >= 49 && charKeyCode <= 57) {
            var n = charCode - 49;
            if (!this.candidates[page * 9 + n])
              break;

            this.workerManager.sendMessage('selectCandidate',
                                         this.candidates[page * 9 + n]);
          }
          break;
      }

      // No key should be handled by others in this mode.
      return true;
    }

    // Entering candidate selection mode with down arrow
    if (keyCode === 40 && this.candidates.length) {
      this.setCandidateSelectionMode(true);
      return true;
    }

    // non-printable keys shouldn't be handled by IME engine
    // if nothing is displayed presently.
    if (!charCode && !this.candidates.length && !this.pendingsymbols)
      return false;

    var code = symbolCode || charCode;
    // IME engine is only responsive to backspace and enter keyCodes,
    if (keyCode === 8 || keyCode === 13) {
      code = keyCode;
    }

    // other non-printable keys (charCode = 0) is meaningless to IME engine.
    if (!code)
      return false;

    this.workerManager.sendMessage('handleKeyEvent', code);

    return true;
  }
};

exports.IMEFrontend = IMEFrontend;

// Bootstrap
exports.main = function main(options, callbacks) {
  new IMEFrontend();
};
