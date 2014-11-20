/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.maps.layerremove', [])
.controller('MapRemoveLayerCtrl', ['map', 'layer', '$scope', '$modalInstance',
    function (map, layer, $scope, $modalInstance) {

      $scope.layer = layer;
      $scope.map = map;

      $scope.cancel = function() {
        $modalInstance.close('close');
      };
      $scope.remove = function() {
        $modalInstance.close('remove');
      };

    }]);
