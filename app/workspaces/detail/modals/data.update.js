/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.data.update', [])
.controller('UpdateStoreCtrl', ['store', 'workspace',
  '$scope', '$rootScope', '$state', '$log', '$modalInstance',
  'GeoServer', 'AppEvent',
    function(store, workspace, $scope, $rootScope, $state, $log,
      $modalInstance, GeoServer, AppEvent) {

      $scope.store = store;
      $scope.workspace = workspace;
      $scope.storeDisabled = false;

      var enabled = !$scope.store.enabled;
      $scope.desiredState = enabled? ' enabled' : ' disabled';
      $scope.desiredStateTitle = enabled? 'Enable ' : 'Disable ';

      $scope.toggleStore = function () {
        GeoServer.datastores.update(
          $scope.workspace, store.name, { 'enabled': enabled })
        .then(function(result) {

          if (result.success && result.data.enabled===enabled) {
            $scope.store.enabled = !$scope.store.enabled;
            $scope.store.resource = {};
            $rootScope.$broadcast(AppEvent.StoreUpdated, 
              {original: $scope.store, updated: result.data});
            $rootScope.alerts = [{
              type: 'danger',
              message: 'Store ' + $scope.store.name + $scope.desiredState,
              fadeout: true
            }];
          } else {
            $rootScope.alerts = [{
              type: 'danger',
              message: 'Store ' + $scope.store.name +
                ' could not be' + $scope.desiredState,
              fadeout: true
            }];
          }
        });
        $modalInstance.close($scope.store);
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }]);
