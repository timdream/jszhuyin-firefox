// This is a page script, hosts IMEWorker, which interfaces with
// JSZhuyin (another page script.)

'use strict';

var LAYOUT_PAGE_DEFAULT = '';

// minimal AMD define callback for loading JSZhuyin
window.define = function define(moduleName, requiredModule, getter) {
  if (moduleName !== 'jszhuyin') {
    console.error('define() is only for jszhuyin in this project.');
    return;
  }

  window.IMEngine = getter();
  IMEWorker.initEngine(window.IMEngine);
};
window.define.amd = true;

// IMEWorker inits JSZhuyin, and provide a postMessage interface for main.js to
// talk to JSZhuyin with it's customized API.
var IMEWorker = {
  engine: null,
  init: function w_init() {
    window.addEventListener('message', this);
  },
  initEngine: function w_initEngine(engine) {
    this.engine = engine;

    var self = this;
    engine.init({
      path: './jszhuyin/lib',
      sendPendingSymbols: function w_sendPendingSymbols(symbols) {
        self.sendMessage('pendingsymbols', symbols);
      },
      sendCandidates: function w_sendCandidates(candidates) {
        self.sendMessage('candidates', candidates);
      },
      sendKey: function w_sendKey(keyCode) {
        self.sendMessage('key', keyCode);
      },
      sendString: function w_sendString(str) {
        self.sendMessage('string', str);
      }
    });

    window.addEventListener('unload', function w_unload() {
      engine.uninit();
    });

    this.sendMessage('init');
    engine.empty();
  },
  handleEvent: function w_handleEvent(evt) {
    var msg = evt.data;
    if (!msg.to || msg.to !== 'page')
      return;

    if (!this.engine) {
      this.sendMessage('error', 'notready');
      return;
    }

    switch (msg.name) {
      case 'click':
      case 'empty':
        this.engine[msg.name].call(this.engine, msg.data);
        break;

      case 'select':
        this.engine[msg.name].apply(this.engine, msg.data);
        break;
    }
  },
  sendMessage: function w_sendMessage(name, data) {
    window.postMessage({
      name: name,
      data: data
    }, '*');
  }
};

IMEWorker.init();
