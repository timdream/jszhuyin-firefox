// This serves as a proxy between page script (script embedded in <script>)
// and main script (main.js).
// See https://addons.mozilla.org/en-US/developers/docs/sdk/latest/dev-guide/
// guides/content-scripts/communicating-with-other-scripts.html for detail.

'use strict';

var pageWindow = document.defaultView;
var debug = false;

// main scirpt -> content script -> page script
self.on('message', function proxy_toPage(msg) {
  if (debug)
    console.log('[proxy m->p]', msg.name || msg.type);

  pageWindow.postMessage(msg, '*');
});

// page script -> content script -> main script
pageWindow.addEventListener('message', function proxy_toMain(evt) {
  var msg = evt.data;
  if (msg.to && msg.to == 'page')
    return; // drop the message sent by ourselves

  if (debug)
    console.log('[proxy p->m]', msg.name || msg.type);

  self.postMessage(msg);
}, false);
