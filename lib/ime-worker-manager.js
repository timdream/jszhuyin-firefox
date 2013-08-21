'use strict';

var debug = require('./debug').debug;
var data = require('sdk/self').data;
var Page = require('sdk/page-worker').Page;

exports.IMEWorkerManager = {
  worker: null,

  workerReady: false,

  messageQueue: [],

  frontend: null,

  init: function idm_init(frontend) {
    this.frontend = frontend;
  },

  start: function iwm_start() {
    if (this.worker) {
      this.sendMessage('empty');
      return;
    }

    this.worker = Page({
      contentURL: data.url('jszhuyin/lib/frame.html'),
      contentScriptFile: data.url('message_proxy.js'),
      contentScriptWhen: 'start',
      onMessage: this.handleMessage.bind(this)
    });
    this.worker.postMessage({ type: 'config', data: {
      'REORDER_SYMBOLS': true
    }, to: 'page'});
    this.worker.postMessage({ type: 'load', to: 'page' });
  },

  stop: function iwm_stop() {
    if (!this.worker)
      return;

    this.worker.destroy();
    this.worker = null;
    this.workerReady = false;
    this.messageQueue = [];
  },

  handleMessage: function iwm_handleMessage(msg) {

    debug('[main/iwm/handleMessage]', msg.type);

    switch (msg.type) {
      case 'partlyloaded':
      case 'loadend':
        this.workerReady = true;
        while (this.messageQueue.length) {
          var message = this.messageQueue.shift();
          this.worker.postMessage.apply(worker, message);
        }
        break;

      case 'compositionupdate':
      case 'candidateschange':
      case 'compositionend':
        this.frontend.handleWorkerMessage(msg.type, msg.data);
        break;
    }
  },

  sendMessage: function iwm_sendMessage(type, data) {
    if (!this.worker) {
      throw 'IMEWorkerManager.start() needs to be run first.';
    }

    if (!this.workerReady) {
      this.messageQueue.push([type, data]);
      return;
    }

    this.worker.postMessage({type: type, data: data, to: 'page'});
  }
};
