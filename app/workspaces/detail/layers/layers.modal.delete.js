/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.layers.delete', [])
.controller('LayerDeleteCtrl',
    ['workspace', 'layer', 'layersListModel', '$scope', '$rootScope', '$state', '$log', '$modalInstance',
    'GeoServer', 'AppEvent',
    function(workspace, layer, layersListModel, $scope, $rootScope, $state, $log, $modalInstance,
      GeoServer, AppEvent) {

      $scope.workspace = workspace;
      $scope.layer = layer;
      $scope.layerDeleted = false;

      $scope.deleteForever = function () {
        GeoServer.layer.delete($scope.workspace, $scope.layer.name).then(
          function(result) {
            if (result && result.success) {
              $scope.layerDeleted = true;
              $rootScope.alerts = [{
                type: 'success',
                message: 'Layer '+ layer.name +' deleted.',
                fadeout: true
              }];
              layersListModel.removeLayer(layer);
              $rootScope.$broadcast(AppEvent.LayersAllUpdated, layersListModel.getLayers());
            } else {
              $rootScope.alerts = [{
                type: 'warning',
                message: 'Layer deletion failed: '+result.data.message,
                details: result.data.trace,
                fadeout: true
              }];
            }
          });
        $modalInstance.close($scope.map);
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }]);
