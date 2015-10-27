'use strict';

var Spinner = require('../util/spinner');

var colors = {
  DOVE_GRAY: '#626262',
};

module.exports = function () {
  return {
    link: function(scope, elem) {
      var canvas = elem.find('canvas')[0];

      if (!scope.size) {
        scope.size = 20;
      }

      scope.$watch('size', function (size) {
        canvas.width = scope.size;
        canvas.height = scope.size;
        canvas.style.width = scope.size + 'px';
        canvas.style.height = scope.size + 'px';
      });

      var spinner = new Spinner(canvas, {
        lineWidth: 1.5,
        strokeStyle: colors.DOVE_GRAY,
      });
      scope.$watch('active', function (isActive) {
        if (isActive) {
          spinner.start();
        } else {
          spinner.stop();
        }
      });
    },
    scope: {
      active: '=',
      size: '=',
    },
    restrict: 'E',
    template: '<canvas></canvas>'
  };
};
