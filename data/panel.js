// This is a page script run in panel.html to handle the input and UIs.

'use strict';

var CandidatesDisplay = function CandidatesDisplay(candidatesElement) {
  this.candidates = [];
  this.candidatePage = 0;

  this.candidatesElement =
    candidatesElement || document.getElementById('candidates');

  this.candidatesElement.addEventListener('click', this);
};

CandidatesDisplay.prototype = {
  handleEvent: function cd_handleEvent(evt) {
    var item = evt.target;
    IMEDisplay.sendMessage('select', [item.textContent, item.dataset.type]);
  },

  updateCandidates: function cd_updateCandidates(candidates) {
    this.candidates = candidates;
    this.candidatePage = 0;

    this.showCurrentCandidates();
  },

  showCurrentCandidates: function cd_showCurrentCandidates() {
    var candidatesElement = this.candidatesElement;
    candidatesElement.innerHTML = '';

    this.candidates.slice(
      this.candidatePage * 9, this.candidatePage * 9 + 9
    ).forEach(function candidate_forEach(candidate) {
      var item = document.createElement('li');
      item.textContent = candidate[0];
      item.dataset.type = candidate[1];
      candidatesElement.appendChild(item);
    });
  },

  setSelectionMode: function cd_setSelectionMode(mode) {
    if (mode)
      this.candidatesElement.classList.add('expanded');
    else
      this.candidatesElement.classList.remove('expanded');
  },

  setCandidatePage: function cd_setCandidatePage(page) {
    this.candidatePage = page;
    this.showCurrentCandidates();
  }
};

var IMEDisplay = function IMEDisplay() {
  this.candidateSelectionMode = false;

  this.candidatesDisplay = new CandidatesDisplay();

  // register message event
  window.addEventListener('message', this, true);

  this.sendMessage('init');
};

IMEDisplay.prototype = {
  setCandidateSelectionMode: function id_setCandidateSelectionMode(mode) {
    if (mode) {
      document.body.classList.add('candidateselectionmode');
    } else {
      document.body.classList.remove('candidateselectionmode');
    }

    this.candidatesDisplay.setSelectionMode(mode);
  },

  updateHeight: function id_updateHeight() {
    this.sendMessage(
      'dimensionchange', { height: document.documentElement.offsetHeight });
  },

  handleEvent: function id_handleEvent(evt) {
    switch (evt.type) {
      case 'message':
        this.handleMessage(evt.data);
        break;
    }
  },

  handleMessage: function id_handleMessage(msg) {
    if (!msg.to || msg.to !== 'page')
      return;

    switch (msg.name) {
      case 'reset':
        this.candidatesDisplay.updateCandidates([]);
        this.setCandidateSelectionMode(false);
        break;

      case 'candidates':
        this.candidatesDisplay.updateCandidates(msg.data);
        break;

      case 'candidateselectionmode':
        this.setCandidateSelectionMode(msg.data);
        break;

      case 'candidateselectionpage':
        this.candidatesDisplay.setCandidatePage(msg.data);
        break;
    }

    this.updateHeight();
  },

  sendMessage: function id_sendMessage(name, data) {
    window.postMessage({
      name: name,
      data: data
    }, '*');
  }
};

new IMEDisplay();
