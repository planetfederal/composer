angular.module('gsApp.workspaces.data.delete', [])
.controller('WorkspaceDeleteDataCtrl', ['workspace', 'store',
  'storeRemoved', '$scope', '$rootScope', '$modalInstance',
  'GeoServer',
    function (workspace, store, storeRemoved, $scope, $rootScope,
      $modalInstance, GeoServer) {

      $scope.title = 'Delete Data Store';
      $scope.storeUndefined = false;

      $scope.workspace = workspace;
      $scope.store = store;
      $scope.storeRemoved = storeRemoved;
      
      if (!store) {
        $scope.storeUndefined = true;
      }

      $scope.cancel = function() {
        $modalInstance.dismiss('close');
      };

      $scope.delete = function() {
        GeoServer.datastores.delete($scope.workspace, $scope.store.name)
        .then(
          function(result) {
            if (result.success || result) {
              $scope.storeRemoved($scope.store);
              $rootScope.alerts = [{
                type: 'success',
                message: 'Store '+ $scope.store.name +
                  ' successfully deleted.',
                fadeout: true
              }];

            } else {
              $rootScope.alerts = [{
                type: 'warning',
                message: 'Store deletion failed.',
                fadeout: true
              }];
            }
          });
        $modalInstance.dismiss('delete');
      };

    }]);
