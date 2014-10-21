angular.module('gsApp.workspaces.data.update', [])
.controller('UpdateStoreCtrl', ['store', 'workspace',
  '$scope', '$rootScope', '$state', '$log', '$modalInstance',
  'GeoServer', 'AppEvent',
    function(store, workspace, $scope, $rootScope, $state, $log,
      $modalInstance, GeoServer) {

      $scope.store = store;
      $scope.workspace = workspace;
      $scope.storeDisabled = false;

      var enabled = !$scope.store.enabled;
      $scope.desiredState = enabled? ' enabled' : ' disabled';
      $scope.desiredStateTitle = enabled? 'Enable ' : 'Disable ';

      $scope.disableStore = function () {
        GeoServer.datastores.getDetails(
          $scope.workspace, store.name, { 'enabled': enabled })
        .then(function(result) {

          if (result.success && result.data.enabled===enabled) {
            $scope.store.enabled = !$scope.store.enabled;
            $scope.store.resource = {};
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
