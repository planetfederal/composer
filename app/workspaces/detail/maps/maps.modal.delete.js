/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.maps.delete', [])
.controller('MapDeleteCtrl',
    ['workspace', 'map', '$scope', '$rootScope', '$state', '$log', '$modalInstance',
    'GeoServer', 'AppEvent',
    function(workspace, map, $scope, $rootScope, $state, $log, $modalInstance,
      GeoServer, AppEvent) {

      $scope.workspace = workspace;
      $scope.map = map;
      $scope.mapDeleted = false;

      $scope.deleteForever = function () {
        GeoServer.map.delete($scope.workspace, $scope.map.name).then(
          function(result) {
            if (result && result.success) {
              $scope.mapDeleted = true;
              $rootScope.alerts = [{
                type: 'success',
                message: 'Map '+ map.name +' deleted.',
                fadeout: true
              }];
              $rootScope.$broadcast(AppEvent.MapRemoved, $scope.map);
              mapsListModel.removeMap(map);
              $rootScope.$broadcast(AppEvent.MapsAllUpdated, mapsListModel.getMaps());
            } else {
              $rootScope.alerts = [{
                type: 'warning',
                message: 'Map deletion failed: '+result.data.message,
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
