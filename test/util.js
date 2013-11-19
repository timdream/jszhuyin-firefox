'use strict';

var tabs = require('sdk/tabs');
exports.getFocusedElement =
  require('window/utils').getFocusedElement;

exports.defaultURL = 'data:text/html,<input%20autofocus%20/>';

exports.setupTest = function setupTest(url, callback) {
  // Close all tabs
  for each (var tab in tabs) {
    tab.close();
  }

  if (!url) {
    url = exports.defaultURL;
  }

  tabs.open({
    url: url,
    inNewWindow: true,
    onReady: function() {
      callback(this);
    }
  });
};

exports.getActive
