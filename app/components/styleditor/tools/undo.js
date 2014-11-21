/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 * License: BSD
 */
angular.module('gsApp.styleditor.undo', [])
.directive('styleEditorUndo', ['$timeout', '$log',
    function($timeout, $log) {
      return {
        restrict: 'EA',
        scope: {
          editor: '='
        },
        template:
          '<li ng-click="undo()">' +
            '<i class="icon-undo"></i>' +
            '<span>Undo</span>' +
          '</li>',
        replace: true,
        controller: function($scope, $element) {
          $scope.undo = function() {
            // use time out to run on next digest
            $timeout(function() {
              $scope.editor.execCommand('undo');
            }, 0);
          };
        }
      };
    }]);
