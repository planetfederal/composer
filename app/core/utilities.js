/**
 * Module for reusable utitlies.
 */
 // http://stackoverflow.com/questions/19482000/angularjs-add-http-prefix-to-url-input-field
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
}]);

