/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/*global window, document, ZeroClipboard, $ */
angular.module('gsApp.editor.tools.sld', [
  'gsApp.core.utilities'
])
.directive('styleEditorSld', ['$modal', '$log', 'GeoServer', '$rootScope',
    function($modal, $log, GeoServer, $rootScope) {
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
              $rootScope.alerts = [{
                type: 'warning',
                message: 'No attributes.',
                fadeout: true
              }];
              return;
            }
            $modal.open({
              templateUrl:
                '/components/editor/tools/sld.modal.tpl.html',
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

      GeoServer.style.getSLD(layer.style.workspace, layer.style.name, true).then(
        function(result) {
          if (result.success) {
            $scope.sld = result.data;
          } else {
            $scope.sld = 'Could not load SLD';
          }
        });

    }]);
