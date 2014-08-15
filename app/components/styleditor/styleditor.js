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
            $scope.editor = editor;
          };

          $scope.codeMirrorOpts = {
            lineWrapping : true,
            lineNumbers: true,
            mode: 'yaml',
            gutters: ['CodeMirror-lint-markers'],
            lint: true
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
