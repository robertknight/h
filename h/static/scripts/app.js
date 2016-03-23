'use strict';

require('./polyfills');
var queryString = require('query-string');

// Initialize Raven. This is required at the top of this file
// so that it happens early in the app's startup flow
var settings = require('./settings')(document);
Object.assign(settings, queryString.parse(window.location.search));
if (settings.raven) {
  var raven = require('./raven');
  raven.init(settings.raven);
}

var angular = require('angular');

// autofill-event relies on the existence of window.angular so
// it must be require'd after angular is first require'd
require('autofill-event');

// Setup Angular integration for Raven
if (settings.raven) {
  raven.angularModule(angular);
} else {
  angular.module('ngRaven', []);
}

var mail = require('./vendor/jwz');
var streamer = require('./streamer');

var resolve =
  // Ensure that we have available a) the current authenticated userid, and b)
  // the list of user groups.
  {
    sessionState: ['session', function (session) { return session.load(); }],
    store: ['store', function (store) { return store.$promise; }],
    streamer: streamer.connect,
    threading: [
      'annotationMapper', 'drafts', 'threading',
      function (annotationMapper, drafts, threading) {
        // Unload all the annotations
        annotationMapper.unloadAnnotations(threading.annotationList());

        // Reset the threading root
        threading.createIdTable([]);
        threading.root = mail.messageContainer();

        // Reload all new, unsaved annotations
        threading.thread(drafts.unsaved());

        return threading;
      }
    ]
  };

// @ngInject
function configureLocation($locationProvider) {
  // Use HTML5 history
  return $locationProvider.html5Mode(true);
}

// @ngInject
function configureRoutes($routeProvider) {
  $routeProvider.when('/a/:id',
    {
      controller: 'AnnotationViewerController',
      templateUrl: 'viewer.html',
      reloadOnSearch: false,
      resolve: resolve
    });
  $routeProvider.when('/viewer',
    {
      controller: 'WidgetController',
      templateUrl: 'viewer.html',
      reloadOnSearch: false,
      resolve: resolve
    });
  $routeProvider.when('/stream',
    {
      controller: 'StreamController',
      templateUrl: 'viewer.html',
      reloadOnSearch: false,
      resolve: resolve
    });
  return $routeProvider.otherwise({
    redirectTo: '/viewer'
  });
}

// @ngInject
function setupCrossFrame(crossframe) {
  return crossframe.connect();
}

// @ngInject
function configureHttp($httpProvider, jwtInterceptorProvider) {
  // Use the Pyramid XSRF header name
  $httpProvider.defaults.xsrfHeaderName = 'X-CSRF-Token';
  // Setup JWT tokens for API requests
  $httpProvider.interceptors.push('jwtInterceptor');
  jwtInterceptorProvider.tokenGetter = require('./auth').tokenGetter;
}

// @ngInject
function setupHttp($http) {
  $http.defaults.headers.common['X-Client-Id'] = streamer.clientId;
}

module.exports = angular.module('h', [
  // Angular addons which export the Angular module name
  // via module.exports
  require('angular-jwt'),
  require('angular-resource'),
  require('angular-route'),
  require('angular-sanitize'),
  require('angular-toastr'),

  // Angular addons which do not export the Angular module
  // name via module.exports
  ['angulartics', require('angulartics')][0],
  ['angulartics.google.analytics', require('angulartics/src/angulartics-ga')][0],
  ['ngTagsInput', require('ng-tags-input')][0],
  ['ui.bootstrap', require('./vendor/ui-bootstrap-custom-tpls-0.13.4')][0],

  // Local addons
  'ngRaven'
])

  .controller('AppController', require('./app-controller'))
  .controller('AnnotationUIController', require('./annotation-ui-controller'))
  .controller('AnnotationViewerController', require('./annotation-viewer-controller'))
  .controller('StreamController', require('./stream-controller'))
  .controller('WidgetController', require('./widget-controller'))

  .directive('annotation', require('./directive/annotation').directive)
  .directive('annotationThread', require('./directive/annotation-thread'))
  .directive('deepCount', require('./directive/deep-count'))
  .directive('excerpt', require('./directive/excerpt').directive)
  .directive('formInput', require('./directive/form-input'))
  .directive('formValidate', require('./directive/form-validate'))
  .directive('groupList', require('./directive/group-list').directive)
  .directive('hAutofocus', require('./directive/h-autofocus'))
  .directive('loginForm', require('./directive/login-form').directive)
  .directive('markdown', require('./directive/markdown'))
  .directive('simpleSearch', require('./directive/simple-search'))
  .directive('statusButton', require('./directive/status-button'))
  .directive('thread', require('./directive/thread'))
  .directive('threadFilter', require('./directive/thread-filter'))
  .directive('spinner', require('./directive/spinner'))
  .directive('shareDialog', require('./directive/share-dialog'))
  .directive('windowScroll', require('./directive/window-scroll'))
  .directive('dropdownMenuBtn', require('./directive/dropdown-menu-btn'))
  .directive('publishAnnotationBtn', require('./directive/publish-annotation-btn'))
  .directive('searchStatusBar', require('./directive/search-status-bar'))
  .directive('sidebarTutorial', require('./directive/sidebar-tutorial').directive)
  .directive('signinControl', require('./directive/signin-control'))
  .directive('sortDropdown', require('./directive/sort-dropdown'))
  .directive('topBar', require('./directive/top-bar'))

  .filter('converter', require('./filter/converter'))

  .service('annotationMapper', require('./annotation-mapper'))
  .service('annotationUI', require('./annotation-ui'))
  .service('auth', require('./auth').service)
  .service('bridge', require('./bridge'))
  .service('crossframe', require('./cross-frame'))
  .service('drafts', require('./drafts'))
  .service('features', require('./features'))
  .service('flash', require('./flash'))
  .service('formRespond', require('./form-respond'))
  .service('groups', require('./groups'))
  .service('host', require('./host'))
  .service('localStorage', require('./local-storage'))
  .service('permissions', require('./permissions'))
  .service('queryParser', require('./query-parser'))
  .service('render', require('./render'))
  .service('rootThread', require('./root-thread'))
  .service('searchFilter', require('./search-filter'))
  .service('session', require('./session'))
  .service('streamFilter', require('./stream-filter'))
  .service('tags', require('./tags'))
  .service('threading', require('./threading'))
  .service('unicode', require('./unicode'))
  .service('viewFilter', require('./view-filter'))

  .factory('store', require('./store'))

  .value('AnnotationSync', require('./annotation-sync'))
  .value('AnnotationUISync', require('./annotation-ui-sync'))
  .value('Discovery', require('./discovery'))
  .value('raven', require('./raven'))
  .value('settings', settings)
  .value('time', require('./time'))

  .config(configureHttp)
  .config(configureLocation)
  .config(configureRoutes)

  .run(setupCrossFrame)
  .run(setupHttp);
