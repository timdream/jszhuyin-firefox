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
      contentURL: data.url('worker.html'),
      contentScriptFile: data.url('message_proxy.js'),
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
    this.messageQueue = [];
  },

  handleMessage: function iwm_handleMessage(msg) {

    debug('[main/iwm/handleMessage]', msg.name);

    switch (msg.name) {
      case 'init':
        this.workerReady = true;
        while (this.messageQueue.length) {
          var message = this.messageQueue.shift();
          this.worker.postMessage.apply(worker, message);
        }
        break;

      case 'pendingsymbols':
      case 'candidates':
      case 'key':
      case 'string':
        this.frontend.handleWorkerMessage(msg.name, msg.data);
        break;
    }
  },

  sendMessage: function iwm_sendMessage(name, data) {
    if (!this.worker) {
      throw 'IMEWorkerManager.start() needs to be run first.';
    }

    if (!this.workerReady) {
      this.messageQueue.push([name, data]);
      return;
    }

    this.worker.postMessage({name: name, data: data, to: 'page'});
  }
};
