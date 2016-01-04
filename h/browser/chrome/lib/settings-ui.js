var extensionSettings = require('./extension-settings');

function changeSetting(setting, value) {
  chrome.runtime.sendMessage({
    type: 'SETTING_CHANGE_REQUEST',
    setting: setting,
    value: value,
  });
}

function init() {
  extensionSettings.getAll().then(function (settings) {
    Object.keys(settings).forEach(function (key) {
      var input = document.querySelector('#' + key);
      if (input) {
        input.checked = settings[key];

        input.addEventListener('change', function () {
          changeSetting(key, input.checked);
        });
      }
    });
  }).catch(function (err) {
    console.error('Failed to read extension settings', err);
  });
}

init();
