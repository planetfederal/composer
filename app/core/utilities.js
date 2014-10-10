/**
 * Module for reusable utitlies.
 */
 // http://goo.gl/huaMt1
angular.module('gsApp.core.utilities', [])
.directive('httpPrefix', function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, controller) {
      function ensureHttpPrefix(value) {
        // Need to add prefix if we don't have http:// prefix already
        if (value && !/^(https?):\/\//i.test(value) &&
            'http://'.indexOf(value) === -1) {
          controller.$setViewValue('http://' + value);
          controller.$render();
          return 'http://' + value;
        } else {
          return value;
        }
      }
      controller.$formatters.push(ensureHttpPrefix);
      controller.$parsers.splice(0, 0, ensureHttpPrefix);
    }
  };
})
.directive('popoverHtmlUnsafePopup', function () {
  return {
    restrict: 'EA',
    replace: true,
    scope: { title: '@',
    content: '@',
    placement: '@',
    animation: '&',
    isOpen: '&' },
    templateUrl: '/core/modals/popover-html-unsafe.tpl.html',
  };
})
.directive('popoverHtmlUnsafe', [ '$tooltip', function ($tooltip) {
  return $tooltip('popoverHtmlUnsafe', 'popover', 'click');
}])
/*
 * Filter below trims a long line
 * Adapted from http://goo.gl/GHr4ZN
 */
.filter('truncate', function () {
  return function (value, byword, max, tailEnd, tail) {
    if (!value) {
      return '';
    }
    max = parseInt(max, 10);
    if (!max) {
      return value;
    }
    if (value.length <= max) {
      return value;
    }
    var newValue = value.substr(0, max);
    if (byword) {
      var lastspace = newValue.lastIndexOf(' ');
      if (lastspace != -1) {
        newValue = newValue.substr(0, lastspace);
      }
    }
    if (tailEnd) { // include tail end of string
      var lastSlash = value.lastIndexOf('/');
      if (lastSlash != -1) {
        tail = value.substring(lastSlash);
      }
    }
    return newValue + ' … ' + tail;
  };
})
.directive('popPopup', function () {
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      title: '@',
      content: '@',
      placement: '@',
      animation: '&',
      isOpen: '&'
    },
    templateUrl: 'template/popover/popover.html'
  };
})
.directive('pop', function($tooltip, $timeout) {
  var tooltip = $tooltip('pop', 'pop', 'event');
  var compile = angular.copy(tooltip.compile);
  tooltip.compile = function (element, attrs) {
    var parentCompile = compile(element, attrs);
    return function(scope, element, attrs ) {
      var first = true;
      attrs.$observe('popShow', function (val) {
        if (JSON.parse(!first || val || false)) {
          $timeout(function () {
            element.triggerHandler('event');
          });
        }
        first = false;
      });
      parentCompile(scope, element, attrs);
    };
  };
  return tooltip;
});

