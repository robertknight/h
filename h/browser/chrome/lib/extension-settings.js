/**
 * Provides functions to read extension-specific settings
 * and display the settings dialog.
 */

var assign = require('core-js/modules/$.object-assign');

var util = require('./util');

/**
 * A dictionary mapping extension settings to their current values.
 * The settings must be initialized by calling init()
 */
var values = {
  keepActiveOnPageChange: false,
  showAnnotationCounts: false,
};

var keys = Object.keys(values).reduce(function (keys, key) {
  keys[key] = key;
  return keys;
}, {});

var requestFn = util.promisify(chrome.permissions.request);
var revokeFn = util.promisify(chrome.permissions.remove);

function permissionsForSettings(settings) {
  var permissions = [];
  var origins = [];
  if (settings.keepActiveOnPageChange || settings.showAnnotationCounts) {
    permissions.push('tabs', 'webNavigation');
  }
  if (settings.keepActiveOnPageChange) {
    origins.push('<all_urls>');
  }
  return {
    permissions: permissions,
    origins: origins,
  }
}

function requestPermissions(settings) {
  console.log('requesting permissions', permissionsForSettings(settings));
  return requestFn(permissionsForSettings(settings));
}

function removePermissions(oldSettings, newSettings) {
  var oldPermissions = permissionsForSettings(oldSettings);
  var newPermissions = permissionsForSettings(newSettings);

  function removedItems(a, b) {
    return a.filter(function (item) {
      return b.indexOf(item) == -1;
    });
  }

  var removed = {
    permissions: removedItems(oldPermissions.permissions,
      newPermissions.permissions),
    origins: removedItems(oldPermissions.origins,
      newPermissions.origins),
  };

  console.log('removing permissions', removed);

  return revokeFn(removed);
}

function notifySettingChanged(setting, value) {
  values[setting] = value;
  chrome.runtime.sendMessage({
    type: 'SETTING_CHANGED',
    setting: setting,
    value: value,
  });
}

/**
 * Returns a Promise for an object mapping settings keys
 * to their current values.
 */
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
      var newSettings = assign({}, values);
      newSettings[request.setting] = request.value;

      // request any new permissions needed for this setting
      requestPermissions(newSettings).then(function (granted) {
        window.localStorage.setItem("settings", JSON.stringify(values));
        notifySettingChanged(request.setting, request.value);
      }).catch(function (err) {
        console.error('Error requesting permissions for new settings', err);
      });

      // remove any permissions that are no longer required
      removePermissions(values, newSettings).catch(function (err) {
        console.error('Error revoking permissions', err);
      });
    } else if (request.type === 'GET_SETTINGS') {
      sendResponse({values: values});
    }
  });
}

/** Show the extension settings dialog in a popup window.
 *
 * Returns a promise which resolves once the popup window has
 * been dismissed.
 */
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

  try {
    // TODO - Verify here that the saved settings are consistent with
    // the extension's current permissions and reset any settings
    // for which we do not have sufficient permissions
    var savedSettings = JSON.parse(window.localStorage.getItem("settings"));
    assign(values, savedSettings);
  } catch (err) {
    console.error('Error loading settings', err);
  }
}

module.exports = {
  init: init,
  showSettingsDialog: showSettingsDialog,
  values: values,
  getAll: getAll,
};
