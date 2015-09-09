/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/*global window, document, ZeroClipboard, $ */
angular.module('gsApp.styleditor.attributes', [
  'gsApp.core.utilities'
])
.directive('styleEditorAttrs', ['$modal', '$log', 'GeoServer', '$rootScope',
    function($modal, $log, GeoServer, $rootScope) {
      return {
        restrict: 'EA',
        scope: {
          editor: '=',
          layer: '='
        },
        template:
          '<li class="attributes" ng-click="showAttributes();">'+
            '<i class="icon-table"></i>'+
            '<span>Attributes</span>'+
          '</li>',
        replace: true,
        controller: function($scope, $element, $modal) {

          $scope.showAttributes = function() {
            GeoServer.datastores.getAttributes($scope.layer.resource.workspace, $scope.layer.resource.store, $scope.layer.resource.name).then(
              function(result) {
                if (result.success) {
                  $scope.attributes = result.data;

                  if (!$scope.attributes || !$scope.attributes.schema || $scope.attributes.schema.attributes.length===0) {
                    $rootScope.alerts = [{
                      type: 'warning',
                      message: 'No attributes for resource '+$scope.layer.resource.name,
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
                }
              });
          }
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
