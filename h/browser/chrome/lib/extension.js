if (location.pathname === '/content/settings.html') {
  require('./settings-ui');
} else {
  require('./hypothesis-chrome-extension');
  require('./install');
}
