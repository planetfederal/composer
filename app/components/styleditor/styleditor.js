angular.module('gsApp.styleditor', ['ui.codemirror'])
.directive('styleEditor', ['$log',
    function($log) {
      return {
        restrict: 'EA',
        scope: {
          style: '=?'
        },
        templateUrl: '/components/styleditor/styleditor.tpl.html',
        controller: function($scope, $element) {
          $scope.onCodeMirrorLoad = function(editor) {
            editor.setOption('lineNumbers', true);
          };

          $scope.$watch('style', function(newVal) {
            $scope.style = newVal;
          });
        }
      };
    }]);
