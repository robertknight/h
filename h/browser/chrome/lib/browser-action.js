(function (h) {
  'use strict';

  // returns a promise for a variant of the square icon image at 'url'
  // of size 'size', tinted with the CSS color 'tint'
  function generateTintedIcon(url, size, tint) {
  	var canvas = document.createElement('canvas');
  	canvas.width = size;
  	canvas.height = size;
  	var img = new Image(size, size);

  	return new Promise(function (resolve, reject) {
  		img.addEventListener('load', function () {
  			var ctx = canvas.getContext('2d');
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, size, size);
        ctx.globalCompositeOperation = 'destination-in';
  			ctx.drawImage(img, 0, 0);
  			resolve(ctx.getImageData(0, 0, size, size));
  		});
  		img.addEventListener('error', function (err) {
  			reject(err);
  		});
  		img.src = url;
  	});
  }

  // Cache the tab state constants.
  var states = h.TabState.states;

  // Each button state has two icons one for normal resolution (19) and one
  // for hi-res screens (38).
  var icons = {};
  icons[states.ACTIVE] = {
    19: 'images/browser-icon-active.png',
    38: 'images/browser-icon-active@2x.png'
  };
  icons[states.INACTIVE] = {
    19: 'images/browser-icon-inactive.png',
    38: 'images/browser-icon-inactive@2x.png'
  };

  // generates tinted badge images for staging and development
  // builds
  function generateBadgeImages() {
    var buildType;
    h.settings.then(function (settings) {
      var tintStyles = {
        'staging': 'goldenrod',
        'dev': 'tomato',
      };
      var tintStyle = tintStyles[settings.buildType];

      if (tintStyle) {
        [states.ACTIVE, states.INACTIVE].forEach(function (state) {
          Object.keys(icons[state]).map(function (key) {
            var size = parseInt(key);
            generateTintedIcon(icons[state][size], size, tintStyle)
              .then(function (imageData) {
              icons[state][size] = imageData;
            }).catch(function (err) {
              console.error(err);
            });
          });
        });
      }
    });
  }
  generateBadgeImages();

  // Fake localization function.
  function _(str) {
    return str;
  }

  /* Controls the display of the browser action button setting the icon, title
   * and badges depending on the current state of the tab. This is a stateless
   * module and does not store the current state. A TabState instance should
   * be used to manage which tabs are active/inactive.
   */
  function BrowserAction(chromeBrowserAction) {
    this.setState = function (tabId, state) {
      switch (state) {
        case states.ACTIVE:   this.activate(tabId); break;
        case states.INACTIVE: this.deactivate(tabId); break;
        case states.ERRORED:  this.error(tabId); break;
        default: throw new TypeError('State ' + state + ' is invalid');
      }
    };

    /**
     * Set the "title" (tooltip) of the browser action _if_ no badge is
     * currently displayed on the browser action.
     * @param {integer} tabId The id of the tab to set the badge title for.
     * @param {string} title The value to set the title to.
     */
    function setTitleIfNoBadge(tabId, title) {
      chromeBrowserAction.getBadgeText({tabId: tabId}, function(text) {
        if (!text) {
          chromeBrowserAction.setTitle({tabId: tabId, title: title});
        }
      });
    }

    /**
     * Set the "title" (tooltip) and badge text of the browser action.
     * @param {integer} tabId The id of the tab to set the badge title for.
     * @param {string} title The text to show in the tooltip.
     * @param {string} badgeText The text to show on the badge.
     */
    function setTitleAndBadgeText(tabId, title, badgeText) {
      chromeBrowserAction.setTitle({tabId: tabId, title: title});
      chromeBrowserAction.setBadgeText({tabId: tabId, text: badgeText});
    }

    /**
     * Sets the icon for a browser tab.
     */
    function setIcon(tabId, iconDict) {
      if (typeof iconDict['19'] === 'string') {
        chromeBrowserAction.setIcon({tabId: tabId, path: iconDict})
      } else {
        chromeBrowserAction.setIcon({tabId: tabId, imageData: iconDict});
      }
    }

    /* Sets the active browser action appearance for the provided tab id. */
    this.activate = function(tabId) {
      setIcon(tabId, icons[states.ACTIVE]);
      setTitleIfNoBadge(tabId, _('Hypothesis is active'));
    };

    /* Sets the inactive browser action appearance for the provided tab id. */
    this.deactivate = function(tabId) {
      setIcon(tabId, icons[states.INACTIVE]);
      setTitleIfNoBadge(tabId, _('Hypothesis is inactive'));
    };

    /* Sets the errored browser action appearance for the provided tab id. */
    this.error = function(tabId) {
      setIcon(tabId, icons[states.INACTIVE]);
      setTitleAndBadgeText(tabId,  _('Hypothesis has failed to load'), '!');
    };

    /**
     * Show the number of annotations of the current page in the badge.
     *
     * @method
     * @param {integer} tabId The id of the current tab.
     * @param {string} tabUrl The URL of the current tab.
     * @param {string} serviceUrl The URL of the Hypothesis API.
     */
    this.updateBadge = function(tabId, tabUrl, serviceUrl) {
      // Fetch the number of annotations of the current page from the server,
      // and display it as a badge on the browser action button.
      var xhr = new XMLHttpRequest();
      xhr.onload = function() {
        var total;

        try {
          total = JSON.parse(this.response).total;
        } catch (e) {
          console.error(
            'updateBadge() received invalid JSON from the server: ' + e);
          return;
        }

        if (typeof total !== 'number') {
          console.error(
            'updateBadge() received invalid total from the server: ' + total);
          return;
        }

        if (total > 0) {
          var totalString = total.toString();
          if (total > 999) {
            totalString = '999+';
          }
          chromeBrowserAction.getBadgeText({tabId: tabId}, function(text) {
            // The num. annotations badge is low priority - we only set it if
            // there's no other badge currently showing.
            if (!text) {
              var title;
              if (total === 1) {
                title = _("There's 1 annotation on this page");
              } else {
                title = _('There are ' + totalString + ' annotations on ' +
                          'this page');
              }
              setTitleAndBadgeText(tabId, title, totalString);
            }
          });
        }
      };

      xhr.open('GET', serviceUrl + '/badge?uri=' + tabUrl);
      xhr.send();
    };
  }

  BrowserAction.icons = icons;

  h.BrowserAction = BrowserAction;
})(window.h || (window.h = {}));
