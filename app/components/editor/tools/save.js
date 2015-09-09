/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 * License: BSD
 */
angular.module('gsApp.editor.tools.save', [])
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
              ed.on('change', function(cm, change) { });
              ed.on('keydown', function(cm, change) {
                if (change.keyCode == 83 && (navigator.platform.match(/(Mac|iPhone|iPod|iPad)/i) ? change.metaKey : change.ctrlKey)) {
                  change.preventDefault();
                  $scope.click();
                }
              }); 
            }
          });
        }
      };
    }]);
