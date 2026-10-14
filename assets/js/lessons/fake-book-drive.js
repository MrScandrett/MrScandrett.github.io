(function () {
  'use strict';
  var button = document.querySelector('[data-fb-drive-btn]');
  var feedback = document.querySelector('[data-fb-import-feedback]');
  if (!button || !feedback) return;
  var config = window.FakeBookDriveConfig || {};
  var client = null, loading = null, picker = null;
  var label = 'Open from Google Drive';
  function status(message, error) {
    feedback.hidden = false;
    feedback.textContent = message;
    feedback.className = 'fb-import-feedback' + (error ? ' is-error' : '');
  }
  function reset() {
    button.disabled = false;
    button.textContent = label;
    button.removeAttribute('aria-busy');
  }
  function busy(message) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    status(message, false);
  }
  function script(url) {
    return new Promise(function (resolve, reject) {
      var node = document.createElement('script');
      var timer = setTimeout(function () { node.remove(); reject(new Error('Google Drive took too long to load. Try again.')); }, 20000);
      node.src = url;
      node.async = true;
      node.onload = function () { clearTimeout(timer); resolve(); };
      node.onerror = function () { clearTimeout(timer); node.remove(); reject(new Error('Could not connect to Google Drive. Check your connection and try again.')); };
      document.head.appendChild(node);
    });
  }
  function prepare() {
    if (loading) return loading;
    loading = Promise.all([
      window.google && window.google.accounts ? Promise.resolve() : script('https://accounts.google.com/gsi/client'),
      window.gapi ? Promise.resolve() : script('https://apis.google.com/js/api.js')
    ]).then(function () {
      return new Promise(function (resolve, reject) {
        window.gapi.load('picker', { callback: resolve, onerror: function () { reject(new Error('Google Drive picker could not load. Try again.')); }, timeout: 20000,
          ontimeout: function () { reject(new Error('Google Drive picker took too long to load. Try again.')); } });
      });
    }).then(function () {
      client = window.google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        include_granted_scopes: false,
        callback: authorized,
        error_callback: function (error) {
          reset();
          status(error.type === 'popup_closed' ? 'Google sign-in was cancelled. You can try again or choose a file from your device.' : 'Google sign-in could not open. Allow pop-ups for this site, then try again.', true);
        }
      });
    }).catch(function (error) { loading = null; throw error; });
    return loading;
  }
  function authorized(response) {
    if (response.error || !response.access_token) {
      reset();
      status('Google Drive access was not granted. Try again or choose a file from your device.', true);
      return;
    }
    // Kept only in this callback closure, never written to browser storage.
    var token = response.access_token;
    try {
      var gp = window.google.picker;
      var view = new gp.DocsView(gp.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false).setMode(gp.DocsViewMode.LIST);
      picker = new gp.PickerBuilder().addView(view).setOAuthToken(token)
        .setDeveloperKey(config.apiKey).setAppId(config.appId).setOrigin(window.location.origin)
        .setTitle('Choose a score for Fake Book')
        .setSize(Math.max(280, Math.min(900, window.innerWidth - 16)), Math.max(300, Math.min(650, window.innerHeight - 32)))
        .setCallback(function (data) {
          if (data.action === gp.Action.CANCEL) {
            token = null;
            picker.dispose(); picker = null;
            reset(); status('No file selected.'); button.focus();
          } else if (data.action === gp.Action.PICKED) {
            var doc = data.docs && data.docs[0];
            picker.dispose(); picker = null;
            download(doc, token);
            token = null;
          }
        }).build();
      status('Choose a MusicXML, Guitar Pro or iReal chart from Google Drive.');
      picker.setVisible(true);
    } catch (error) {
      token = null;
      reset(); status('Google Drive picker could not open. Try again or choose a file from your device.', true);
    }
  }
  async function download(doc, token) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 30000);
    try {
      if (!doc || !doc.id) throw new Error('No file was selected. Try again.');
      if (!/\.(musicxml|mxl|xml|gtp|gp3|gp4|gp5|gpx|gp|gp7|gp8|html?|txt|mscx|mscz)$/i.test(doc.name || '')) {
        throw new Error('Choose a MusicXML, Guitar Pro 1–8 or iReal chart file. PDFs and Google Docs cannot be played as scores.');
      }
      busy('Reading ' + doc.name + ' from Google Drive…');
      var response = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(doc.id) + '?alt=media', {
        headers: { Authorization: 'Bearer ' + token }, signal: controller.signal
      });
      if (!response.ok) throw new Error(response.status === 401 ? 'Google sign-in expired. Open Google Drive again to sign in.' : 'Could not download this file. Check that your account can download it, then try again.');
      var blob = await response.blob();
      if (blob.size > 8 * 1024 * 1024) throw new Error('Choose a score smaller than 8 MB.');
      window.FakeBook.importFile(new File([blob], doc.name, { type: blob.type }));
    } catch (error) {
      status(error.name === 'AbortError' ? 'The download took too long. Check your connection and try again.' : error.message, true);
    } finally {
      clearTimeout(timer); reset(); button.focus();
    }
  }
  button.addEventListener('click', function () {
    if (!config.clientId || !config.apiKey || !config.appId) {
      status('Google Drive is not connected to this class site yet. Please use Choose file for now.', true);
      return;
    }
    if (!client) {
      busy('Connecting to Google Drive…');
      prepare().then(function () {
        reset(); button.textContent = 'Continue to Google Drive';
        status('Google Drive is ready. Tap Continue to Google Drive to sign in.');
        button.focus();
      }).catch(function (error) { reset(); status(error.message, true); });
      return;
    }
    // Request synchronously from the tap so mobile browsers can open sign-in.
    busy('Opening Google sign-in…');
    try { client.requestAccessToken({ prompt: 'select_account' }); }
    catch (error) { reset(); status('Google sign-in could not open. Try again.', true); }
  });
})();
