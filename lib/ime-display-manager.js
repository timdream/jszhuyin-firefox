'use strict';

var debug = require('./debug').debug;
var data = require('sdk/self').data;
var Panel = require('sdk/panel').Panel;

exports.IMEDisplayManager = {
  panel: null,

  panelReady: false,

  messageQueue: [],

  kWidth: 600,
  kHeight: 44,

  hidden: false,

  frontend: null,

  init: function idm_init(frontend) {
    this.frontend = frontend;
  },

  start: function idm_start() {
    if (this.panel) {
      this.sendMessage('reset');
      return;
    }

    this.panel = Panel({
      width: this.kWidth,
      height: this.kHeight,
      contentURL: data.url('panel.html'),
      contentScriptFile: data.url('message_proxy.js'),
      contentScriptWhen: 'start',
      focus: false,
      onMessage: this.handleMessage.bind(this),
      onHide: this.handleHide.bind(this)
    });
  },

  stop: function idm_stop() {
    if (!this.panel)
      return;

    this.panel.destroy();
    this.panel = null;
    this.panelReady = false;
    messageQueue = [];
  },

  isShowing: function idm_isShowing() {
    return (this.panel && this.panel.isShowing);
  },

  show: function idm_show(anchor) {
    if (this.panel.isShowing)
      return;

    this.panel.show(anchor);
    this.hidden = false;
  },

  hide: function idm_hide() {
    if (!this.panel.isShowing)
      return;

    this.sendMessage('reset');
    this.hidden = true;
    this.panel.hide();
  },

  handleHide: function idm_handleHide() {
    // Don't do anything if panel is hidden with IMEDisplayManager.hide();
    if (this.hidden)
      return;

    this.frontend.stopInput();
  },

  handleMessage: function idm_handleMessage(msg) {
    debug('[main/idm/handleMessage]', msg.name);

    switch (msg.name) {
      case 'init':
        this.panelReady = true;
        while (this.messageQueue.length) {
          var message = this.messageQueue.shift();
          this.panel.postMessage.apply(worker, message);
        }
        break;

      case 'dimensionchange':
        var width = msg.data.width || this.kWidth;
        var height = msg.data.height || this.kHeight;

        // Prevent unnecessary reflow
        if (width === this.panel.width && height === this.panel.height)
          return;

        this.panel.resize(width, height);
        break;

      case 'select':
        this.frontend.handleDisplayMessage(msg.name, msg.data);
        break;
    }
  },

  sendMessage: function idm_sendMessage(name, data) {
    if (!this.panel) {
      throw 'IMEDisplayManager.init() needs to be run first.';
    }

    if (!this.panelReady) {
      this.messageQueue.push([name, data]);
      return;
    }

    this.panel.postMessage({name: name, data: data, to: 'page'});
  }
};
