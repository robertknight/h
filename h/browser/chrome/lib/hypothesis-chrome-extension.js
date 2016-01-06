'use strict';

var TabState = require('./tab-state');
var BrowserAction = require('./browser-action');
var HelpPage = require('./help-page');
var settings = require('./settings');
var SidebarInjector = require('./sidebar-injector');
var TabErrorCache = require('./tab-error-cache');
var TabStore = require('./tab-store');

var extensionSettings = require('./extension-settings');
var messageTypes = require('./message-types');

var TAB_STATUS_LOADING = 'loading';
var TAB_STATUS_COMPLETE = 'complete';


// Set up listeners for tab navigation events and update
// annotation counts in response.
// 'webNavigation' - The chrome.webNavigation implementation
// 'state' - The TabState instance storing extension tab state
function listenForNavigation(webNavigation, apiUrl, state) {

  // check if a tab with a given ID is actually a visible in
  // a Chrome Window and invoke a callback if so.
  //
  // The chrome.webNavigation API reports events for hidden
  // pre-rendered tabs which are not accessible via other APIs
  // (eg. chrome.tabs). Such tabs will eventually either be discarded
  // or made visible with a chrome.tabs.onReplaced event, in which
  // annotation counts and other tab state will be updated at that point
  function ifTabVisible(tabId, cb) {
    chrome.tabs.get(tabId, function (tab) {
      if (chrome.runtime.lastError) {
        // tab is hidden
        console.log('ignoring navigation in hidden tab');
        return;
      }
      cb();
    });
  }

  // listen for tab navigation events, which are emitted in the following
  // order:
  //
  // onBeforeNavigate - A navigation was initiated
  // {onErrorOccurred} - Emitted if the navigation was interrupted.
  // onCommitted - The first chunk of data for the new URL was received
  // onDOMContentLoaded - The content of the main URL was fully received
  // onCompleted

  // invoked when navigation to a new URL is successful.
  function onCommitted(details) {
    if (details.frameId !== 0) {
      // navigation occurred in a sub-frame
      return;
    }
    ifTabVisible(details.tabId, function () {
      state.updateAnnotationCount(details.tabId, details.url, apiUrl);
    });
  }

  // invoked when navigation to a new URL in a tab is interrupted
  // before it completes. The documentation isn't completely clear on this,
  // but it appears that details.url returns the _current_ URL of the tab,
  //
  function onErrorOccurred(details) {
    if (details.frameId !== 0) {
      // navigation occurred in a sub-frame
      return;
    }
    ifTabVisible(details.tabId, function () {
      state.setState(details.tabId, {
        ready: true,
      });
      state.updateAnnotationCount(details.tabId, details.url, apiUrl);
    });
  }

  function onDOMContentLoaded(details) {
    if (details.frameId !== 0) {
      // navigation occurred in a sub-frame
      return;
    }
    ifTabVisible(details.tabId, function () {
      state.setState(details.tabId, {
        ready: true,
      });
    });
  }

  webNavigation.onCommitted.addListener(onCommitted);
  webNavigation.onErrorOccurred.addListener(onErrorOccurred);
  webNavigation.onDOMContentLoaded.addListener(onDOMContentLoaded);
}


/* The main extension application. This wires together all the smaller
 * modules. The app listens to all new created/updated/removed tab events
 * and uses the TabState object to keep track of whether the sidebar is
 * active or inactive in the tab. The app also listens to click events on
 * the browser action and toggles the state and uses the BrowserAction module
 * to update the visual style of the button.
 *
 * The SidebarInjector handles the insertion of the Hypothesis code. If it
 * runs into errors the tab is put into an errored state and when the
 * browser action is clicked again the HelpPage module displays more
 * information to the user.
 *
 * Lastly the TabStore listens to changes to the TabState module and persists
 * the current settings to localStorage. This is then loaded into the
 * application on startup.
 *
 * Relevant Chrome Extension documentation:
 * - https://developer.chrome.com/extensions/browserAction
 * - https://developer.chrome.com/extensions/tabs
 * - https://developer.chrome.com/extensions/extension
 *
 * dependencies - An object to set up the application.
 *   chromeTabs: An instance of chrome.tabs.
 *   chromeBrowserAction: An instance of chrome.browserAction.
 *   extensionURL: chrome.extension.getURL.
 *   isAllowedFileSchemeAccess: chrome.extension.isAllowedFileSchemeAccess.
 */
function HypothesisChromeExtension(dependencies) {
  var chromeTabs = dependencies.chromeTabs;
  var chromeBrowserAction = dependencies.chromeBrowserAction;
  var chromeRuntime = dependencies.chromeRuntime;
  var chromeWebNavigation = dependencies.chromeWebNavigation;

  var help  = new HelpPage(chromeTabs, dependencies.extensionURL);
  var store = new TabStore(localStorage);
  var state = new TabState(store.all(), onTabStateChange);
  var browserAction = new BrowserAction(chromeBrowserAction);
  var sidebar = new SidebarInjector(chromeTabs, {
    extensionURL: dependencies.extensionURL,
    isAllowedFileSchemeAccess: dependencies.isAllowedFileSchemeAccess,
  });
  var tabErrors = new TabErrorCache();

  restoreSavedTabState();
  initTabNavigationHandler();

  /* Sets up the extension and binds event listeners. Requires a window
   * object to be passed so that it can listen for localStorage events.
   */
  this.listen = function (window) {
    chromeBrowserAction.onClicked.addListener(onBrowserActionClicked);
    chromeTabs.onCreated.addListener(onTabCreated);
    chromeTabs.onRemoved.addListener(onTabRemoved);
    chromeTabs.onReplaced.addListener(onTabReplaced);
    chromeRuntime.onMessage.addListener(onMessage);
  };

  /* A method that can be used to setup the extension on existing tabs
   * when the extension is re-installed.
   */
  this.install = function () {
    restoreSavedTabState();
  };

  /* Opens the onboarding page */
  this.firstRun = function () {
    chromeTabs.create({url: 'https://hypothes.is/welcome'}, function (tab) {
      state.activateTab(tab.id);
    });
  };

  /** Returns the internal H state of all tabs */
  this.tabStates = function () {
    return state.getAllStates();
  };

  function initTabNavigationHandler() {
    settings.then(function (settings) {
      var webNavigation = chromeWebNavigation();
      if (webNavigation) {
        listenForNavigation(webNavigation, settings.apiUrl, state);
      }
    });
  }

  function restoreSavedTabState() {
    store.reload();
    state.load(store.all());
    chromeTabs.query({}, function (tabs) {
      tabs.forEach(function (tab) {
        onTabStateChange(tab.id, state.getState(tab.id));
      });
    });
  }

  function onMessage(message, sender) {
    switch (message.type) {
    case messageTypes.TAB_DOCUMENT_UNLOADED:
      resetTabState(sender.tab.id, null);
      break;
    case 'SETTING_CHANGED':
      if (message.setting === 'showAnnotationCounts' &&
          message.value) {
        initTabNavigationHandler();
      }
      break;
    }
  }

  function onTabStateChange(tabId, current) {
    if (current) {
      browserAction.update(tabId, current);

      if (!state.isTabErrored(tabId)) {
        store.set(tabId, current);
        tabErrors.unsetTabError(tabId);
        chromeTabs.get(tabId, updateTabDocument);
      }
    } else {
      store.unset(tabId);
      tabErrors.unsetTabError(tabId);
    }
  }

  // exposed for use by tests
  this._onTabStateChange = onTabStateChange;

  function onBrowserActionClicked(tab) {
    var tabError = tabErrors.getTabError(tab.id);
    if (state.isTabErrored(tab.id) && tabError) {
      help.showHelpForError(tab, tabError);
    }
    else if (state.isTabActive(tab.id)) {
      state.deactivateTab(tab.id);
    }
    else {
      state.activateTab(tab.id);
    }
  }

  // reset the extension's state for a tab after
  // the current document is unloaded
  function resetTabState(tabId) {
    var activeState = state.getState(tabId).state;
    if (activeState === TabState.states.ERRORED) {
      activeState = TabState.states.ACTIVE;
    }

    if (!extensionSettings.values.keepActiveOnPageChange) {
      activeState = TabState.states.INACTIVE;
    }

    state.setState(tabId, {
      state: activeState,
      ready: false,
      annotationCount: 0,
      extensionSidebarInstalled: false,
      hasActiveTabPermission: false,
    });
  }

  function onTabReplaced(addedTabId, removedTabId) {
    var activeState = state.getState(removedTabId).state;
    state.clearTab(removedTabId);
    state.setState(addedTabId, {
      state: activeState,
      ready: true,
    });

    settings.then(function (settings) {
      chromeTabs.get(addedTabId, function (tab) {
        state.updateAnnotationCount(addedTabId, tab.url, settings.apiUrl);
      });
    });
  }

  function onTabCreated(tab) {
    // Clear the state in case there is old, conflicting data in storage.
    state.clearTab(tab.id);
  }

  function onTabRemoved(tabId) {
    state.clearTab(tabId);
  }

  // checks that we have permission to install the Hypothesis sidebar into
  // the current tab and requests it otherwise
  function getInstallPermission(tab) {
    var tabState = state.getState(tab.id);
    if (extensionSettings.values.keepActiveOnPageChange ||
        tabState.hasActiveTabPermission) {
      return Promise.resolve(true);
    } else {
      return extensionSettings.showSettingsDialog().then(function () {
        return extensionSettings.values.keepActiveOnPageChange;
      });
    }
  }

  // installs or uninstalls the sidebar from a tab when the H
  // state for a tab changes
  function updateTabDocument(tab) {
    // If the tab has not yet finished loading then just quietly return.
    if (!state.getState(tab.id).ready) {
      return Promise.resolve();
    }

    var isInstalled = state.getState(tab.id).extensionSidebarInstalled;
    if (state.isTabActive(tab.id) && !isInstalled) {
      // optimistically set the state flag indicating that the sidebar
      // has been installed
      state.setState(tab.id, {
        extensionSidebarInstalled: true,
      });
      return getInstallPermission(tab)
        .then(function (hasPermission) {
          if (hasPermission) {
            return sidebar.injectIntoTab(tab)
          } else {
            state.deactivateTab(tab.id);
          }
        })
        .catch(function (err) {
          console.error('Failed to inject Hypothesis sidebar:', err);
          tabErrors.setTabError(tab.id, err);
          state.errorTab(tab.id);
        });
    }
    else if (state.isTabInactive(tab.id) && isInstalled) {
      return sidebar.removeFromTab(tab).then(function () {
        state.setState(tab.id, {
          extensionSidebarInstalled: false,
        });
      });
    }
  }
}

module.exports = HypothesisChromeExtension;
