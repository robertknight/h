// Defines a set of vendor bundles which are
// libraries of 3rd-party code referenced by
// one or more bundles of Hypothesis client/frontend
// code
module.exports = {
  jquery: ['jquery'],
  bootstrap: ['bootstrap'],
  polyfills: ['./h/static/scripts/polyfills'],
  angular: [
    'angular',
    'angular-animate',
    'angular-jwt',
    'angular-resource',
    'angular-route',
    'angular-sanitize',
    'ng-tags-input',
    'angular-toastr',
    'angulartics/src/angulartics',
    'angulartics/src/angulartics-ga'
  ],
  katex: ['./h/static/scripts/vendor/katex'],
  showdown: ['showdown'],
  unorm: ['unorm'],
  raven: ['raven-js'],
};
