/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 * License: BSD
 */
angular.module('gsApp.inlineErrors', [
  'ui.bootstrap'
])
.directive('inlineErrors', ['$modal', '$interval', '$log', '$window', '_',
    function($modal, $interval, $log, $window, _) {
      return {
        restrict: 'EA',
        scope: {
          errors: '=?'
        },
        templateUrl: '/components/errorpanel/inlineErrors.tpl.html',
        controller: function($scope, $element, $window) {
          $scope.$watch('errors', function(newVal) {
            if (newVal != null) {
              if (_.isArray(newVal)) {
                $scope.inlineErrors = newVal.map(function(val) {
                  return {type: 'danger', msg: val.message};
                });
              } else {
                $scope.inlineErrors = [({type: 'danger', msg: newVal.message})];
              }
            }
          });
        }
      };
    }]);
