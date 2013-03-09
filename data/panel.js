// This is a page script run in panel.html to handle the input and UIs.

'use strict';

var CandidatesDisplay = {
  candidatesElement: null,

  candidates: [],
  candidatePage: 0,

  init: function cd_init() {
    this.candidatesElement = document.getElementById('candidates');
    this.candidatesElement.addEventListener('click', this);
  },

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

var IMEDisplay = {
  candidateSelectionMode: false,

  pendingSymbolsElement: null,

  init: function id_init() {
    CandidatesDisplay.init();

    this.pendingSymbolsElement =
      document.getElementById('pending_symbols');

    // register message event
    window.addEventListener('message', this, true);

    this.sendMessage('init');
  },

  setCandidateSelectionMode: function id_setCandidateSelectionMode(mode) {
    if (mode) {
      document.body.classList.add('candidateselectionmode');
    } else {
      document.body.classList.remove('candidateselectionmode');
    }

    CandidatesDisplay.setSelectionMode(mode);
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
        this.pendingSymbolsElement.textContent = '';
        CandidatesDisplay.updateCandidates([]);
        this.setCandidateSelectionMode(false);
        break;

      case 'pendingsymbols':
        this.pendingSymbolsElement.textContent = msg.data;
        break;

      case 'candidates':
        CandidatesDisplay.updateCandidates(msg.data);
        break;

      case 'candidateselectionmode':
        this.setCandidateSelectionMode(msg.data);
        break;

      case 'candidateselectionpage':
        CandidatesDisplay.setCandidatePage(msg.data);
        break;
    }
  },

  sendMessage: function id_sendMessage(name, data) {
    window.postMessage({
      name: name,
      data: data
    }, '*');
  }
};

IMEDisplay.init();
