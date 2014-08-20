/*global CodeMirror */
angular.module('gsApp.styleditor', [
  'ui.codemirror',
  'gsApp.styleditor.ysldhinter'
])
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
            lint: true,
            extraKeys: {
              'Ctrl-Space': 'autocomplete',
              'Tab': function(cm) {
                // replace tabs with spaces
                var spaces =
                  new Array(cm.getOption('indentUnit') + 1).join(' ');
                cm.replaceSelection(spaces);
              }
            },
            tabMode: 'spaces'
          };

          $scope.save = function() {
            $scope.onSave($scope.editor.getValue());
          };

          $scope.$watch('style', function(newVal) {
            $scope.style = newVal;
          });
        }
      };
    }])
.run(['YsldHinter', '$log',
    function(YsldHinter, $log) {
      CodeMirror.commands.autocomplete = function(cm) {
        cm.showHint({
          hint: function(cm, options) {
            return YsldHinter.hints(cm, options);
          }
        });
      };
    }]);
