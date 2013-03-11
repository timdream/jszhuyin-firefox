'use strict';

var selfModule = require('sdk/self');
var windowUtils = require('window/utils');

var panelModule = require('sdk/panel');
var pageWorkerModule = require('sdk/page-worker');
var hotkeysModule = require('sdk/hotkeys');
var widgetModule = require('sdk/widget');

var DEBUG = false;
var debug = function debug() {
  if (!DEBUG)
    return;

  console.log.apply(console, arguments);
};

var IMEFrontend = {
  active: false,
  inputActive: false,

  focusedElement: null,

  candidateSelectionMode: false,

  pendingsymbols: '',
  candidates: [],
  candidatePage: 0,

  // XXX: make this configable
  hotkeyCombo: 'accel-alt-1',

  init: function if_init() {
    debug('[if/init]');
    // Show an widget
    this.widget = widgetModule.Widget({
      id: 'jszhuyin-indicator',
      label: 'JSZhuyin IME',
      content: 'A'
    });

    // Register a hot key for toggling
    hotkeysModule.Hotkey({
      combo: this.hotkeyCombo,
      onPress: this.toggle.bind(this)
    });
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
    KeyMonitor.stop();
  },

  updateInput: function if_updateInput() {
    // Don't update focusedElement if panel is present
    if (IMEDisplayManager.panel.isShowing)
      return;

    debug('[if/updateInput]');
    var focusedElement = windowUtils.getFocusedElement();
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
    // IMEWorkerManager.stop();
  },

  setCandidateSelectionMode: function if_setCandidateSelectionMode(mode) {
    IMEDisplayManager.sendMessage('candidateselectionmode', mode);
    this.candidateSelectionMode = mode;
  },

  toggleIMEDisplay: function if_toggleIMEDisplay() {
    if (this.pendingsymbols || this.candidates.length) {
      IMEDisplayManager.start(this.focusedElement);
    } else {
      IMEDisplayManager.stop();
      IMEOutput.regainFocus();
    }
  },

  handleWorkerMessage: function if_handleWorkerResult(name, data) {
    switch (name) {
      case 'pendingsymbols':
        if (!this.active)
          return; // Panel not displayed, nothing to show.

        this.pendingsymbols = data;
        IMEDisplayManager.sendMessage(name, data);
        this.toggleIMEDisplay();
        break;

      case 'candidates':
        if (!this.active)
          return; // Panel not displayed, nothing to show.

        this.candidates = data;
        this.candidatePage = 0;
        IMEDisplayManager.sendMessage(name, data);
        this.toggleIMEDisplay();
        if (!this.candidates.length && this.candidateSelectionMode) {
          this.setCandidateSelectionMode(false);
        }
        break;

      case 'key':
        IMEOutput.appendKey(data);
        break;

      case 'string':
        IMEOutput.appendText(data);
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

var KeyMonitor = {
  focusedWindow: null,

  start: function km_start() {
    this.focusedWindow = windowUtils.getMostRecentBrowserWindow();
    this.focusedWindow.addEventListener('keypress', this, true);
  },

  stop: function km_stop() {
    this.focusedWindow.removeEventListener('keypress', this, true);
    this.focusedWindow = null;
  },

  handleEvent: function km_handleEvent(evt) {
    if (evt.metaKey || evt.ctrlKey || evt.altKey)
      return;

    var symbolCode =
      KeyMapper.getSymbolCodeFromCode(evt.charCode, evt.shiftKey);

    debug('[main/km/handleEvent]', evt.keyCode, evt.charCode, symbolCode);

    var handled =
      IMEFrontend.handleKeyEvent(evt.keyCode, evt.charCode, symbolCode);
    if (handled) {
      evt.stopImmediatePropagation();
      evt.preventDefault();
    }
  }
};

var KeyMapper = {
  shiftMapping: {
    '<': '，', // XXX: Not available: ．《〈【〖〔
    '>': '。', // XXX: Not available: 》〉】〗〕
    '?': '？',
    '"': '、', // XXX: Not available: ＂
    ':': '：',
    '{': '『',
    '}': '』',
    '!': '！',
    '@': '＠',
    '#': '＃',
    '$': '＄',
    '%': '％',
    '^': '︿',
    '&': '＆',
    '*': '＊',
    '(': '（',
    ')': '）',
    '_': '—',
    '+': '＋',
    '~': '～',
    '|': '｜'
  },

  zhuyinMapping: {
    ',': 'ㄝ',
    '-': 'ㄦ',
    '.': 'ㄡ',
    '/': 'ㄥ',
    '0': 'ㄢ',
    '1': 'ㄅ',
    '2': 'ㄉ',
    '3': 'ˇ',
    '4': 'ˋ',
    '5': 'ㄓ',
    '6': 'ˊ',
    '7': '˙',
    '8': 'ㄚ',
    '9': 'ㄞ',
    ';': 'ㄤ',
    'a': 'ㄇ',
    'b': 'ㄖ',
    'c': 'ㄏ',
    'd': 'ㄎ',
    'e': 'ㄍ',
    'f': 'ㄑ',
    'g': 'ㄕ',
    'h': 'ㄘ',
    'i': 'ㄛ',
    'j': 'ㄨ',
    'k': 'ㄜ',
    'l': 'ㄠ',
    'm': 'ㄩ',
    'n': 'ㄙ',
    'o': 'ㄟ',
    'p': 'ㄣ',
    'q': 'ㄆ',
    'r': 'ㄐ',
    's': 'ㄋ',
    't': 'ㄔ',
    'u': 'ㄧ',
    'v': 'ㄒ',
    'w': 'ㄊ',
    'x': 'ㄌ',
    'y': 'ㄗ',
    'z': 'ㄈ',

    // in MS Photonic IME, '`' is the dead-key for all full-width punctuation.
    // such functionality is not available here yet.
    '`': '，', // XXX: Not available: ｀

    '=': '＝',
    '[': '「',
    ']': '」',
    '\\': '＼', // XXX: Not available: ／
    '\'': '＇'
  },

  getSymbolCodeFromCode: function km_getSymbolCodeFromCode(code, shiftKey) {
    var chr = String.fromCharCode(code);

    if (shiftKey) {
      if (this.shiftMapping[chr]) {
        return this.shiftMapping[chr].charCodeAt(0);
      } else {
        return chr.toLowerCase().charCodeAt(0);
      }
    }

    if (this.zhuyinMapping[chr]) {
      return this.zhuyinMapping[chr].charCodeAt(0);
    } else {
      return code;
    }
  }
};

/*
 * IMEOutput is poor man's solution for inserting characters into
 * the nsIDOMElement.
 * It does not handle cursor position nor file key/composition
 * events. To do this right we will have to re-implement/copy
 * half of mozKeyboard API in B2G instead. Not something worth doing, yet.
 */
var IMEOutput = {
  // XXX: allow more types.
  inputTagNames: ['html:input', 'INPUT'],

  focusedElement: null,

  setFocusedElement: function io_setFocusedElement(focusedElement) {
    this.focusedElement = focusedElement;
  },

  canHandle: function io_canHandle(element) {
    if (!element)
      return false;

    if (this.inputTagNames.indexOf(element.tagName) === -1)
      return false;

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

var IMEDisplayManager = {
  panel: null,

  panelReady: false,

  init: function idm_init() {
    this.panel = panelModule.Panel({
      width: 600,
      height: 74,
      contentURL: selfModule.data.url('panel.html'),
      contentScriptFile: selfModule.data.url('message_proxy.js'),
      contentScriptWhen: 'start',
      onMessage: this.handleMessage.bind(this)
    });
  },

  start: function idm_start(anchor) {
    if (this.panel.isShowing)
      return;

    this.panel.show(anchor);
  },

  stop: function idm_stop() {
    if (!this.panel.isShowing)
      return;

    this.sendMessage('reset');
    this.panel.hide();
  },

  handleMessage: function idm_handleMessage(msg) {
    debug('[main/idm/handleMessage]', msg.name);

    switch (msg.name) {
      case 'init':
        this.panelReady = true;
        break;

      case 'select':
        IMEFrontend.handleDisplayMessage(msg.name, msg.data);
        break;
    }
  },

  sendMessage: function idm_sendMessage(name, data) {
    if (!this.panel) {
      throw 'IMEDisplayManager.init() needs to be run first.';
    }

    if (!this.panelReady) {
      throw 'IMEDisplayManager have not ready yet.';
    }

    this.panel.postMessage({name: name, data: data, to: 'page'});
  }
};
// Init the panel when Firefox starts.
// XXX: this would slow down Firefox start-up and memory usage.
IMEDisplayManager.init();

var IMEWorkerManager = {
  worker: null,
  workerReady: false,
  start: function iwm_start() {
    if (this.worker) {
      if (this.workerReady) {
        this.sendMessage('empty');
      }
      return;
    }

    this.worker = pageWorkerModule.Page({
      contentURL: selfModule.data.url('worker.html'),
      contentScriptFile: selfModule.data.url('message_proxy.js'),
      contentScriptWhen: 'start',
      onMessage: this.handleMessage.bind(this)
    });
  },
  stop: function iwm_stop() {
    if (!this.worker)
      return;

    this.worker.destroy();
    this.worker = null;
    this.workerReady = false;
  },
  handleMessage: function iwm_handleMessage(msg) {

    debug('[main/iwm/handleMessage]', msg.name);

    switch (msg.name) {
      case 'init':
        this.workerReady = true;
        break;

      case 'pendingsymbols':
      case 'candidates':
      case 'key':
      case 'string':
        IMEFrontend.handleWorkerMessage(msg.name, msg.data);
        break;
    }
  },
  sendMessage: function iwm_sendMessage(name, data) {
    if (!this.worker) {
      throw 'IMEWorkerManager.start() needs to be run first.';
    }

    if (!this.workerReady) {
      throw 'IMEWorker have not ready yet.';
    }

    this.worker.postMessage({name: name, data: data, to: 'page'});
  }
};

// Start the walker when Firefox starts.
// XXX: this would slow down Firefox start-up and memory usage.
IMEWorkerManager.start();
