/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/*global window, document, ZeroClipboard, $ */
angular.module('gsApp.styleditor.attributes', [
  'gsApp.core.utilities'
])
.directive('styleEditorAttrs', ['$modal', '$log', 'GeoServer',
    function($modal, $log, GeoServer) {
      return {
        restrict: 'EA',
        scope: {
          editor: '=',
          layer: '='
        },
        template:
          '<li ng-click="showAttributes();">'+
            '<i class="icon-table"></i>'+
            '<span>Attributes</span>'+
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
                '/components/styleditor/tools/attributes.modal.tpl.html',
              controller: 'AttributesModalCtrl',
              size: 'lg',
              resolve: {
                layer: function() {
                  return $scope.layer;
                },
                attributes: function() {
                  return $scope.attributes;
                }
              }
            });
          };
        }
      };
    }])
.controller('AttributesModalCtrl', ['$scope', '$modalInstance', 'layer',
  'attributes', '$timeout',
  function($scope, $modalInstance, layer, attributes, $timeout) {

      $scope.layer = layer;
      $scope.attributes = attributes;
      $scope.selectedAttrName = null;

      $scope.close = function () {
        $modalInstance.close('close');
      };

      $scope.selectName = function(name) {
        $scope.selectedAttrName = name;
      };

      $timeout(function() {
        new ZeroClipboard($('#copyAttr')).on('copy',
          function(event) {
            var clipboard = event.clipboardData;
            if ($scope.selectedAttrName) {
              clipboard.setData('text/plain',
                $scope.selectedAttrName
              );
              $scope.close();
            }
          });
      }, 500);

    }]);
