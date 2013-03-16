'use strict';

var debug = require('./debug').debug;
var getMostRecentBrowserWindow =
  require('window/utils').getMostRecentBrowserWindow;
var KeyMapper = require('./key-mapper').KeyMapper;

exports.KeyMonitor = {
  focusedWindow: null,

  frontend: null,

  init: function idm_init(frontend) {
    this.frontend = frontend;
  },

  start: function km_start() {
    this.focusedWindow = getMostRecentBrowserWindow();
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
      this.frontend.handleKeyEvent(evt.keyCode, evt.charCode, symbolCode);
    if (handled) {
      evt.stopImmediatePropagation();
      evt.preventDefault();
    }
  }
};
