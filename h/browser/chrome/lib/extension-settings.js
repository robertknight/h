var util = require('./util');

var values = {
  keepActiveOnPageChange: false,
};

var keys = Object.keys(values).reduce(function (keys, key) {
  keys[key] = key;
  return keys;
}, {});

function requestAllUrlsPermission() {
  var requestFn = util.promisify(chrome.permissions.request);
  return requestFn({origins: ['<all_urls>']});
}

function revokeAllUrlsPermission() {
  var revokeFn = util.promisify(chrome.permissions.remove);
  return revokeFn({origins: ['<all_urls>']});
}

function notifySettingChanged(setting, value) {
  values[setting] = value;
  chrome.runtime.sendMessage({
    type: 'SETTING_CHANGED',
    setting: setting,
    value: value,
  });
}

function getAll() {
  return new Promise(function (resolve, reject) {
    chrome.runtime.sendMessage({
      type: 'GET_SETTINGS'
    }, function (response) {
      resolve(response.values);
    });
  });
}

function installChangeHandler() {
  chrome.runtime.onMessage.addListener(function (request, _, sendResponse) {
    if (request.type === 'SETTING_CHANGE_REQUEST') {
      switch (request.setting) {
        case keys.keepActiveOnPageChange:
          if (request.value) {
            requestAllUrlsPermission().then(function (granted) {
              notifySettingChanged(keys.keepActiveOnPageChange, granted);
            }).catch(function (err) {
              console.error('Error changing permissions', err);
            });
          } else {
            revokeAllUrlsPermission().then(function (revoked) {
              notifySettingChanged(keys.keepActiveOnPageChange, false);
            }).catch(function (err) {
              console.error('Error changing permissions', err);
            });
          }
          break;
      }
    } else if (request.type === 'GET_SETTINGS') {
      sendResponse({values: values});
    }
  });
}

function showSettingsDialog() {
  var settingsWindowId;

  chrome.windows.create({
    url: '/content/settings.html',
    type: 'popup',
    width: 600,
    height: 400,
  }, function (window) {
    settingsWindowId = window.id;
  });

  return new Promise(function (resolve, reject) {
    var closedListener = function (windowId) {
      if (windowId === settingsWindowId) {
        chrome.windows.onRemoved.removeListener(closedListener);
        resolve();
      }
    };
    chrome.windows.onRemoved.addListener(closedListener);
  });
}

function init() {
  installChangeHandler();

  var getAllPermissionsFn = util.promisify(chrome.permissions.getAll);
  getAllPermissionsFn().then(function (perms) {
    notifySettingChanged(keys.keepActiveOnPageChange,
      perms.origins.indexOf('<all_urls>') !== -1);
  }).catch(function (err) {
    console.error('Unable to check permissions');
  });
}

module.exports = {
  init: init,
  showSettingsDialog: showSettingsDialog,
  values: values,
  getAll: getAll,
};
