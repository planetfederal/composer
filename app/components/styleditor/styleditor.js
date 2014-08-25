/*global CodeMirror */
angular.module('gsApp.styleditor', [
  'ui.codemirror',
  'gsApp.styleditor.ysldhinter'
])
.directive('styleEditor', ['$compile', '$sanitize', '$log',
    function($compile, $sanitize, $log) {
      return {
        restrict: 'EA',
        scope: {
          style: '=?',
          markers: '=?',
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
            gutters: ['markers'],
            extraKeys: {
              'Ctrl-Space': 'autocomplete',
              'Ctrl-S': function(cm) {
                $scope.save();
              },
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
          $scope.$watch('markers', function(newVal) {
            if (newVal != null) {
              newVal.forEach(function(mark) {
                var html = '<i class="icon-warning" ' +
                  'popover="' + $sanitize(mark.problem) + '" ' +
                  'popover-trigger="mouseenter" ' +
                  'popover-append-to-body="true"></i>';

                var marker = $compile(html)($scope)[0];
                $scope.editor.setGutterMarker(mark.line, 'markers', marker);
              });
            }
            else {
              $scope.editor.clearGutter('markers');
            }
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
