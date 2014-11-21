/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 * License: BSD
 */
angular.module('gsApp.styleditor.save', [])
.directive('styleEditorSave', ['$log',
    function($log) {
      return {
        restrict: 'EA',
        scope: {
          editor: '=',
          click: '='
        },
        template:
          '<li ng-click="click()">' +
            '<i class="icon-disk"></i>' +
            '<span>Save</span>' +
          '</li>',
        replace: true,
        controller: function($scope, $element) {
          $scope.$watch('editor', function(newVal) {
            if (newVal != null) {
              var ed = newVal;
              ed.addKeyMap({
                'Ctrl-S': function(cm) {
                  $scope.click();
                },
              });
              ed.on('change', function(cm, change) {
              });
            }
          });
        }
      };
    }]);
