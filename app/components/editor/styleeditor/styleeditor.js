/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 *
 * styleeditor.js, styleeditor.less, styleeditor.tpl.html
 * 
 * YSLD editor for composer. Included a complete CodeMirror editor, plus Save/Undo/Discard functions, 
 * error markers, and keyboard shortcuts.
 * YSLD Hinter functionality in ysldhinter.js
 */
/*global CodeMirror */
angular.module('gsApp.editor.styleeditor', [
  'ui.codemirror',
  'gsApp.editor.styleeditor.ysldhinter',
  'gsApp.editor.tools.save',
  'gsApp.editor.tools.undo',
  'gsApp.editor.tools.layers',
  'gsApp.editor.tools.color',
  'gsApp.editor.tools.icons',
  'gsApp.editor.tools.attributes',
  'gsApp.editor.tools.display',
  'gsApp.editor.tools.sld',
  'gsApp.editor.tools.fullscreen'
])
.directive('styleEditor', ['$compile', '$document', '$log', '$modal', '$rootScope', '$sanitize', '$sce', '$state', '$timeout', 
    'GeoServer', 'YsldColors', 'YsldHinter',
    function($compile, $document, $log, $modal, $rootScope, $sanitize, $sce, $state, $timeout,
      GeoServer, YsldColors, YsldHinter) {
      return {
        restrict: 'EA',
        templateUrl: '/components/editor/styleeditor/styleeditor.tpl.html',
        controller: function($scope, $element) {

          /** Editor scope variables **/
          /* The $scope of the editor pages is shared between editor.map / editor.layer, 
           * olmap, layerlist, and styleeditor. As such, care must be taken when adding
           * or modifying these scope variables.
           * The following scope variables are used among these modules:
           */

          /* Initialized in editor.layer.js or editor.map.js
          $scope.olMapOpts    //OL Map parameters, used by olmap.js to construct $scope.olMap
          $scope.map          //map object obtained from GeoServer. null for editor.layer.js
          $scope.map.layers   //list of layers for the map object
          $scope.layer        //layer object obtained from geoserver. Represents the current layer for editor.map.js
          $scope.workspace    //name of the current workspace
          $scope.isRendering  //boolean indicating if the map is currently rendering. Used to show the "Rendering map" spinner
          $scope.ysldstyle    //text content of the current style. Used by styleeditor.js when constructing $scope.editor
          */

          /* Initialized in olmap.js
          $scope.olMap      //OL3 Map object. Generated from $scope.olMapOpts
          $scope.hideCtrl   //List of map controls to hide. Set by tools/display.js and used by editor.*.tpl.html
          */

          /* Initialized in styleeditor.js
          $scope.editor           //Codemirror editor object
          $scope.generation       //editor generation; used to handle undo
          $scope.markers          //List of errors, displayed as line markers in the editor
          $scope.popoverElement   //Popover element for error markers
          */

          /* Initialized in layerlist.js
          $scope.showLayerList  //boolean indicating wheter to display the layer list
          */
          $scope.editor = null;
          $scope.generation = null;
          $scope.markers = null;
          $scope.popoverElement = null;

          //Make this available to palette.js (external to angular)
          window.YsldColors = YsldColors;

          $scope.saveStyle = function() {
            var content = $scope.editor.getValue();
            var wsName = $scope.workspace;
            var layerName = $scope.layer.name;
            GeoServer.style.put(wsName, layerName, content).then(function(result) {
              if (result.success == true) {
                $scope.markers = null;
                $rootScope.alerts = [{
                  type: 'success',
                  message: 'Style saved for layer: '+layerName,
                  fadeout: true
                }];
                $scope.refreshMap();
                return GeoServer.layer.get(wsName, layerName)
                    .then(function(result) {
                      if (result.success) {
                        $scope.layer.style = result.data.style;
                      } else {
                        $rootScope.alerts = [{
                          type: 'warning',
                          message: 'Error getting layer details: '+$l.name,
                          fadeout: true
                        }];
                      }
                    });
              } else if (result.status == 400) {
                  // validation error
                  $scope.markers = result.data.errors;
                  $rootScope.alerts = [{
                    type: 'danger',
                    message: 'Style not saved due to validation error'
                  }];
              } else {
                $rootScope.alerts = [{
                  type: 'danger',
                  message: 'Error occurred saving style: ' + result.data.message,
                  details: result.data.trace
                }];
              }
            });
          };

          $scope.discardChanges = function() {
            //Undo all of the changes made to the editor.
            //TODO: Make sure this doesn't revert saves
            for (var i = $scope.generation; i >= 0; i--) {
              $scope.editor.undo();
            }
            //If you don't explicitly set the value of the editor to the
            //current value, the content reverts back to the last typed
            //entry rather than discarding all of the changes.
            $scope.editor.setValue($scope.editor.getValue());

            $rootScope.alerts = [{
              type: 'success',
              message: 'Editor changes have been discarded.',
              fadeout: true
            }];
          }

          $scope.editorSave = function(nextWindowType, state, args) {
            $modal.open({
              templateUrl: '/components/editor/editorsave.modal.tpl.html',
              controller: ['linterIsvalid', '$scope', '$modalInstance',
                function(linterIsvalid, $scope, $modalInstance) {
                  $scope.linterIsvalid = linterIsvalid;

                  $scope.cancel = function() {
                    $modalInstance.dismiss('cancel');
                  };

                  $scope.saveChanges = function() {
                    $modalInstance.close('save');
                  };

                  $scope.discardChanges = function() {
                    $modalInstance.close('discard');
                  };
              }],
              backdrop: 'static',
              size: 'med',
              resolve: {
                linterIsvalid: function() {
                  return $scope.editor.getStateAfter().pair;
                }
              }
            }).result.then(function(result) {
              var nextWindow = function() {
                if (nextWindowType == 'layer') {
                  $scope.selectLayer($scope.goToLayer);
                } else {
                  $state.go(state, args);
                }
              };
              if (result == 'save') {
                $scope.saveStyle().then(nextWindow);
              } else {
                $scope.discardChanges();
                nextWindow();
              }
            });
          };

          $scope.$on('$stateChangeStart', function(event, state, args){
            if (!$scope.editor.isClean($scope.generation)){
              event.preventDefault();
              $scope.editorSave('state', state, args);
            }
          });


          $scope.onCodeMirrorLoad = function(editor) {
            $scope.editor = editor;

            editor.on('change', function(cm, change) {
              if (change.origin == 'setValue') {
                $timeout(function() {
                  cm.clearHistory();
                }, 0);
                $scope.generation = cm.changeGeneration();
              }
            });
            //Use custom events for all Cmd/Ctrl key events to override default functionality and enable OS X compatibility
            editor.on('keydown', function(cm, change) {
              if (navigator.platform.match(/(Mac|iPhone|iPod|iPad)/i) ? change.metaKey : change.ctrlKey) {
                //Hint: Ctrl/Cmd Enter
                if (change.keyCode == 13) {
                  change.preventDefault();
                  cm.showHint({
                    hint: function(cm, options) {
                      return YsldHinter.hints(cm, angular.extend(options, {
                        layer: $scope.layer
                      }));
                    }
                  });

                //Fold: Ctrl/Cmd <
                } else if (change.keyCode == 188) {
                  change.preventDefault();
                  var pos = {line: cm.getCursor().line, ch:cm.getLine(cm.getCursor().line).length};
                  //get end of first unfolded line
                  while(pos.line > 0 && cm.isFolded(pos)) {
                    pos = {line: pos.line-1, ch:cm.getLine(pos.line-1).length};
                  }
                  cm.foldCode(pos, {
                    rangeFinder: CodeMirror.fold.indent,
                    scanUp: true
                  }, "fold");

                //Unfold: Ctrl/Cmd >
                } else if (change.keyCode == 190) {
                  change.preventDefault();
                  var pos = {line: cm.getCursor().line, ch:0};
                  //get beginning of first unfolded line
                  while(pos.line > 0 && cm.isFolded(pos)) {
                    pos = {line: pos.line-1, ch:0};
                  }
                  
                  cm.foldCode(pos, {
                    rangeFinder: CodeMirror.fold.indent,
                    scanUp: true
                  }, "unfold");
                //Comment: 3/#
                } else if (change.keyCode == 51) {
                  change.preventDefault();

                  var cur = cm.getCursor();
                  var line = cm.getLine(cur.line);

                  //Comment lines; otherwise uncomment lines
                  if (line.search(/^\s*#/) == -1) {
                    var comment = true;
                  }

                  var ranges = cm.listSelections();
                  for (var i = 0; i < ranges.length; i++) {
                    var range = ranges[i];
                    var start = range.head.line > range.anchor.line ? range.anchor.line : range.head.line;
                    var end = range.head.line > range.anchor.line ? range.head.line : range.anchor.line;
                    for (var j = start; j <= end; j++) {
                      line = cm.getLine(j);
                      var length = line.length;
                      line = line.replace(/^(\s*)(#)/, "$1");
                      if (comment) {
                        line = "#" + line;
                      }
                      cm.replaceRange(line, {ch:0, line:j}, {ch:length, line:j});

                    }
                  }
                }
              }
            });
          };

          $scope.codeMirrorOpts = {
            lineWrapping : true,
            lineNumbers: true,
            styleActiveLine: true,
            mode: 'yaml',
            paletteHints: true,
            foldGutter: true,
            gutters: ['markers', 'CodeMirror-foldgutter'],
            extraKeys: {
              // tab remapping taken from:
              //   https://gist.github.com/danieleds/326903084a196055a7c3
              'Tab': function (cm) {
                if (cm.somethingSelected()) {
                  var sel = cm.getSelection('\n');
                  var cur = cm.getCursor();

                  // Indent only if there are multiple lines selected,
                  // or if the selection spans a full line
                  if (sel.length > 0 && (sel.indexOf('\n') > -1 ||
                    sel.length === cm.getLine(cur.line).length)) {
                    cm.indentSelection('add');
                    return;
                  }
                }

                if (cm.options.indentWithTabs) {
                  cm.execCommand('insertTab');
                }
                else {
                  cm.execCommand('insertSoftTab');
                }
              },
              'Shift-Tab': function (cm) {
                cm.indentSelection('subtract');
              }
              // 'Tab': function(cm) {
              //   // replace tabs with spaces
              //   var spaces =
              //     new Array(cm.getOption('indentUnit') + 1).join(' ');
              //   cm.replaceSelection(spaces);
              // }
            },
            tabMode: 'spaces'
          };

          $scope.setPopup = function(){
            //Wait a little bit before setting the popover element. We need to
            //ensure that it exists so we can remove it later on if necessary.
            //If we don't explicitly remove it then the popover will remain on
            //the new code mirror window.
            $timeout(function() {
              $scope.popoverElement = angular.element(
                $document[0].querySelectorAll('.popover'));
              //Put the popovers below any modals:
              for (var i = 0; i < $scope.popoverElement.length; i++) {
                $scope.popoverElement[i].style['z-index'] = 1040;
              }
            }, 250);
          };

          $scope.$watch('markers', function(newVal) {
            //Clear popovers
            if ($scope.popoverElement) {
              $scope.popoverElement.remove();
            }
            $scope.editor.clearGutter('markers');
            if (newVal != null) {
              newVal.forEach(function(mark) {

                var html = '<a class="icon-warning" ' +
                  'popover="' +
                  $sce.trustAsHtml($sanitize(mark.problem)) +
                  '" ' + 'popover-placement="left" ' +
                  'popover-append-to-body="true"' +
                  'title="Click to toggle the error message on/off." ' +
                  'alt="Click to toggle the error message on/off."' +
                  'ng-click="setPopup()"></a>';

                var marker = $compile(html)($scope)[0];
                $scope.editor.setGutterMarker(mark.line, 'markers', marker);
              });
            }
          });
        }
      };
    }])
.run(['$log',
    function($log) {
      CodeMirror.prototype.insertOrReplace = function(value) {
        if (this.somethingSelected()) {
          // replace the selection
          this.replaceSelection(value, 'around');
        }
        else {
          // insert
          this.replaceRange(value, this.getCursor());
        }
      };
    }]);
