'use strict';

var selfModule = require('sdk/self');
var windowUtils = require('window/utils');

var panelModule = require('sdk/panel');
var pageWorkerModule = require('sdk/page-worker');
var hotkeysModule = require('sdk/hotkeys');

var DEBUG = false;
var debug = function debug() {
  if (!DEBUG)
    return;

  console.log.apply(console, arguments);
};

var IMEFrontend = {
  active: false,

  focusedElement: null,

  candidateSelectionMode: false,

  pendingsymbols: '',
  candidates: [],
  candidatePage: 0,

  // XXX: make this configable
  hotkeyCombo: 'accel-alt-1',

  init: function if_init() {
    // Register a hot key for invocation
    hotkeysModule.Hotkey({
      combo: this.hotkeyCombo,
      onPress: this.start.bind(this)
    });
  },

  start: function if_start() {
    // Getting the focused element.
    // This will not likely to work when Firefox gets process-per-tab,
    // like what B2G do.
    var focusedElement = windowUtils.getFocusedElement();

    if (!IMEOutput.canHandle(focusedElement)) {
      return; // Not focused on a input element. Show an warning here maybe?
    }

    this.active = true;
    this.focusedElement = focusedElement;

    IMEDisplayManager.start(focusedElement);
    IMEOutput.start(focusedElement);
    KeyMonitor.start();
    IMEWorkerManager.start();
  },

  stop: function if_stop() {
    this.active = false;

    // Give the focus back to the focused element.
    this.focusedElement.focus();
    this.focusedElement = null;

    this.candidateSelectionMode = false;

    this.pendingsymbols = false;
    this.candidates = [];
    this.candidatePage = 0;

    IMEDisplayManager.stop();
    IMEOutput.stop();
    KeyMonitor.stop();
    IMEWorkerManager.sendMessage('empty');
    // IMEWorkerManager.stop();
  },

  setCandidateSelectionMode: function if_setCandidateSelectionMode(mode) {
    IMEDisplayManager.sendMessage('candidateselectionmode', mode);
    this.candidateSelectionMode = mode;
  },

  handleWorkerMessage: function if_handleWorkerResult(name, data) {
    switch (name) {
      case 'pendingsymbols':
        if (!this.active)
          return; // Panel not displayed, nothing to show.

        this.pendingsymbols = data;
        IMEDisplayManager.sendMessage(name, data);
        break;

      case 'candidates':
        if (!this.active)
          return; // Panel not displayed, nothing to show.

        this.candidates = data;
        this.candidatePage = 0;
        IMEDisplayManager.sendMessage(name, data);
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
    // Entering candidate selection mode with down arrow
    if (keyCode === 40 &&
        !this.candidateSelectionMode &&
        this.candidates.length) {
      this.setCandidateSelectionMode(true);
      return;
    }

    if (this.candidateSelectionMode) {
      var page = this.candidatePage;

      // number keys: select selection
      if (charCode >= 49 && charCode <= 57) {
        var n = charCode - 49;
        IMEWorkerManager.sendMessage('select', this.candidates[page * 9 + n]);
      }

      // right arrow
      if (keyCode === 39 && (page + 1) * 9 < this.candidates.length) {
        page = this.candidatePage += 1;
        IMEDisplayManager.sendMessage('candidateselectionpage', page);
      }

      // left arrow
      if (keyCode === 37 && page !== 0) {
        page = this.candidatePage -= 1;
        IMEDisplayManager.sendMessage('candidateselectionpage', page);
      }

      // up arrow
      if (keyCode === 38) {
        this.setCandidateSelectionMode(false);
      }

      return;
    }

    IMEWorkerManager.sendMessage('click', symbolCode || charCode || keyCode);
  }
};
IMEFrontend.init();

var KeyMonitor = {
  focusedWindow: null,

  start: function km_start() {
    this.focusedWindow = windowUtils.getFocusedWindow();
    this.focusedWindow.addEventListener('keypress', this, true);
  },

  stop: function km_stop() {
    this.focusedWindow.removeEventListener('keypress', this, true);
    this.focusedWindow = null;
  },

  handleEvent: function km_handleEvent(evt) {
    if (evt.metaKey || evt.ctrlKey || evt.altKey)
      return;

    // escape
    if (evt.keyCode === 27)
      return;

    var symbolCode =
      KeyMapper.getSymbolCodeFromCode(evt.charCode, evt.shiftKey);

    debug('[main/km]', evt.keyCode, evt.charCode, symbolCode);

    IMEFrontend.handleKeyEvent(evt.keyCode, evt.charCode, symbolCode);
    evt.stopImmediatePropagation();
    evt.preventDefault();
  }
};

var KeyMapper = {
  shiftMapping: {
    '<': '，',
    '>': '。',
    '?': '？',
    '"': '、'
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
    'z': 'ㄈ'
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

var IMEOutput = {
  // XXX: allow more types.
  inputTagNames: ['html:input'],

  focusedElement: null,

  start: function io_start(focusedElement) {
    this.focusedElement = focusedElement;
  },

  stop: function io_stop() {
    this.focusedElement = null;
  },

  canHandle: function io_canHandle(element) {
    if (!element)
      return false;

    if (this.inputTagNames.indexOf(element.tagName) === -1)
      return false;

    return true;
  },

  appendKey: function io_appendKey(code) {
    if (!this.focusedElement) {
      throw 'IMEOutput.start() needs to be run first.';
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
      throw 'IMEOutput.start() needs to be run first.';
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
      onMessage: this.handleMessage.bind(this),
      onHide: this.handleHide.bind(this)
    });
  },

  start: function idm_start(anchor) {
    this.panel.show(anchor);
  },

  stop: function idm_stop() {
    if (!this.panel.isShowing)
      return;

    this.sendMessage('reset');
    this.panel.hide();
  },

  handleHide: function idm_handleHide() {
    IMEFrontend.stop();
  },

  handleMessage: function idm_handleMessage(msg) {
    debug('[main/idm]', msg.name);

    switch (msg.name) {
      case 'init':
        this.panelReady = true;
        break;

      case 'select':
        IMEWorkerManager.sendMessage(msg.name, msg.data);
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

    debug('[main/iwm]', msg.name);

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
