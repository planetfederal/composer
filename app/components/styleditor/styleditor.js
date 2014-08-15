angular.module('gsApp.styleditor', ['ui.codemirror'])
.directive('styleEditor', ['$log',
    function($log) {
      return {
        restrict: 'EA',
        scope: {
          style: '=?',
          onSave: '=?'
        },
        templateUrl: '/components/styleditor/styleditor.tpl.html',
        controller: function($scope, $element) {
          $scope.onCodeMirrorLoad = function(editor) {
            editor.setOption('lineNumbers', true);
            $scope.editor = editor;
          };
          $scope.save = function() {
            $scope.onSave($scope.editor.getValue());
          };

          $scope.$watch('style', function(newVal) {
            $scope.style = newVal;
          });
        }
      };
    }]);
