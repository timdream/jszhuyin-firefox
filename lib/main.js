'use strict';

var _ = require('sdk/l10n').get;
var Widget = require('sdk/widget').Widget;
var Hotkey = require('sdk/hotkeys').Hotkey;
var getFocusedElement = require('window/utils').getFocusedElement;

var debug = require('./debug').debug;

var KeyMonitor = require('./key-monitor').KeyMonitor;
var IMEOutput = require('./ime-output').IMEOutput;
var IMEWorkerManager = require('./ime-worker-manager').IMEWorkerManager;
var IMEDisplayManager = require('./ime-display-manager').IMEDisplayManager;

var IMEFrontend = {
  active: false,
  inputActive: false,

  focusedElement: null,

  candidateSelectionMode: false,

  pendingsymbols: '',
  candidates: [],
  candidatePage: 0,

  keyEventsToIgnore: [],

  // XXX: make this configable
  hotkeyCombo: 'accel-alt-1',

  init: function if_init() {
    debug('[if/init]');
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

    KeyMonitor.init(this);
    IMEWorkerManager.init(this);
    IMEDisplayManager.init(this);
  },

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

    IMEDisplayManager.start();
    KeyMonitor.start();
    IMEWorkerManager.start();
  },

  stop: function if_stop() {
    if (!this.active)
      return;

    debug('[if/stop]');
    this.active = false;

    this.widget.content = 'A';
    this.stopInput();

    IMEDisplayManager.start();
    KeyMonitor.stop();
    IMEWorkerManager.stop();
  },

  updateInput: function if_updateInput() {
    // Don't update focusedElement if panel is present
    if (IMEDisplayManager.isShowing())
      return;

    debug('[if/updateInput]');
    var focusedElement = getFocusedElement();
    if (!IMEOutput.canHandle(focusedElement)) {
      if (this.inputActive) {
        this.stopInput();
      }

      return;
    }

    this.startInput(focusedElement);
  },

  startInput: function if_startInput(focusedElement) {
    debug('[if/startInput]');
    // XXX: We kept the reference of focused element even after
    // the focus is taken away. The reference will not get deleted/updated
    // until next keypress (by updateInput() call in handleKeyEvent().)
    this.focusedElement = focusedElement;
    this.inputActive = true;

    IMEOutput.setFocusedElement(focusedElement);
  },

  stopInput: function if_stopInput() {
    debug('[if/stopInput]');

    this.focusedElement = null;
    this.inputActive = false;

    this.candidateSelectionMode = false;

    this.pendingsymbols = '';
    this.candidates = [];
    this.candidatePage = 0;
    this.toggleIMEDisplay();

    IMEOutput.setFocusedElement(null);
    IMEWorkerManager.sendMessage('empty');
  },

  setCandidateSelectionMode: function if_setCandidateSelectionMode(mode) {
    IMEDisplayManager.sendMessage('candidateselectionmode', mode);
    this.candidateSelectionMode = mode;
  },

  toggleIMEDisplay: function if_toggleIMEDisplay() {
    if (this.pendingsymbols || this.candidates.length) {
      IMEDisplayManager.show(this.focusedElement);
    } else if (IMEDisplayManager.isShowing()) {
      IMEDisplayManager.hide();
    }
  },

  handleWorkerMessage: function if_handleWorkerResult(name, data) {
    switch (name) {
      case 'pendingsymbols':
        if (!this.inputActive)
          return;

        this.pendingsymbols = data;
        IMEOutput.setComposition(data);
        IMEDisplayManager.sendMessage(name, data);
        this.toggleIMEDisplay();
        break;

      case 'candidates':
        if (!this.inputActive)
          return;

        this.candidates = data;
        this.candidatePage = 0;
        IMEDisplayManager.sendMessage(name, data);
        this.toggleIMEDisplay();
        if (!this.candidates.length && this.candidateSelectionMode) {
          this.setCandidateSelectionMode(false);
        }
        break;

      case 'key':
        this.keyEventsToIgnore.push(data);
        IMEOutput.sendKey(data);
        break;

      case 'string':
        IMEOutput.finishComposition(data);
        break;
    }
  },

  handleDisplayMessage: function if_handleDisplayMessage(name, data) {
    switch (name) {
      case 'select':
        IMEWorkerManager.sendMessage(name, data);
        break;
    }
  },

  handleKeyEvent: function if_handleKeyEvent(keyCode, charCode, symbolCode) {
    // Need to check against both keyCode & charCode,
    // since one of them will be set to 0 for a given keypress event.
    if (this.keyEventsToIgnore[0] === keyCode ||
        this.keyEventsToIgnore[0] === charCode) {
      this.keyEventsToIgnore.shift();

      return false;
    }

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
            IMEWorkerManager.sendMessage('click', keyCode);
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

          IMEWorkerManager.sendMessage('select', this.candidates[page * 9]);
          break;

        case 37: // Left arrow key: flip candidate selection page
          if (page === 0)
            break;

          page = this.candidatePage -= 1;
          IMEDisplayManager.sendMessage('candidateselectionpage', page);
          break;

        case 38: // Up arrow key: leaving candidate selection mode
          this.setCandidateSelectionMode(false);
          break;

        case 39: // Right arrow key: flip candidate selection page
          if ((page + 1) * 9 >= this.candidates.length)
            break;

          page = this.candidatePage += 1;
          IMEDisplayManager.sendMessage('candidateselectionpage', page);
          break;

        default:
          // Number keys: select selection
          if (charKeyCode >= 49 && charKeyCode <= 57) {
            var n = charCode - 49;
            if (!this.candidates[page * 9 + n])
              break;

            IMEWorkerManager.sendMessage('select',
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

    IMEWorkerManager.sendMessage('click', code);

    return true;
  }
};
IMEFrontend.init();
