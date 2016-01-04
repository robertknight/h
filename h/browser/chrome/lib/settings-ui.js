var extensionSettings = require('./extension-settings');

function changeSetting(setting, value) {
  chrome.runtime.sendMessage({
    type: 'SETTING_CHANGE_REQUEST',
    setting: setting,
    value: value,
  });
}

function init() {
  var keepActiveOnPageChangeInput = document.querySelector('#keepActiveOnPageChange');

  extensionSettings.getAll().then(function (settings) {
    keepActiveOnPageChangeInput.checked = settings.keepActiveOnPageChange;
  }).catch(function (err) {
    console.error('Failed to read extension settings', err);
  });

  chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === 'SETTING_CHANGED') {
      switch (message.setting) {
        case 'keepActiveOnPageChange':
          keepActiveOnPageChangeInput.checked = message.value;
      }
    }
  });

  keepActiveOnPageChangeInput.addEventListener('change', function () {
    changeSetting('keepActiveOnPageChange', keepActiveOnPageChangeInput.checked);
  });
}

init();
