/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/*global window, document, ZeroClipboard, $ */
angular.module('gsApp.styleditor.sld', [
  'gsApp.core.utilities'
])
.directive('styleEditorSld', ['$modal', '$log', 'GeoServer',
    function($modal, $log, GeoServer) {
      return {
        restrict: 'EA',
        scope: {
          editor: '=',
          layer: '='
        },
        template:
          '<li class="sld" ng-click="showAttributes();">'+
            '<i class="icon-code"></i>'+
            '<span>SLD</span>'+
          '</li>',
        replace: true,
        controller: function($scope, $element, $modal) {

          $scope.showAttributes = function() {
            $scope.attributes = $scope.layer.schema.attributes;

            if ($scope.attributes.length===0) {
              $scope.$parent.alerts = [{
                type: 'warning',
                message: 'No attributes.',
                fadeout: true
              }];
              return;
            }
            $modal.open({
              templateUrl:
                '/components/styleditor/tools/sld.modal.tpl.html',
              controller: 'SldModalCtrl',
              size: 'lg',
              resolve: {
                layer: function() {
                  return $scope.layer;
                }
              }
            });
          };
        }
      };
    }])
.controller('SldModalCtrl', ['$scope', '$modalInstance', 'layer',
  'GeoServer', '$timeout',
  function($scope, $modalInstance, layer, GeoServer, $timeout) {

      $scope.layer = layer;

      $scope.close = function () {
        $modalInstance.close('close');
      };

      $scope.codeMirrorOpts = {
        mode: 'xml',
        htmlMode: true,
        lineWrapping : true,
        lineNumbers: true
      };

      $scope.onCodeMirrorLoad = function(editor) {
        $scope.editor = editor;
      };

      function autoFormatSelection() {
        var e = $scope.editor;
        if(typeof e.autoFormatRange !== 'function') {
          return;
        }
        var lastLine = e.lineCount();
        if (lastLine > 0) {
          var str = e.getLine(lastLine-1);
          if (str) {
            var totalChars = str.length;
            e.autoFormatRange({line:0, ch:0}, {line:lastLine, ch:totalChars});
            e.execCommand('goDocStart');
          }
        }
      }

      GeoServer.style.getSLD(layer.workspace, layer.style.name).then(
        function(result) {
          if (result.success) {
            $scope.sld = result.data;
            $timeout(function() {
              autoFormatSelection();
            }, 800);
          } else {
            $scope.sld = 'Could not load SLD';
          }
        });

    }]);
