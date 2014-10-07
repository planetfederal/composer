angular.module('gsApp.workspaces.datastores.delete', [])
.controller('DeleteStoreModalCtrl', ['$scope', '$modalInstance',
  'workspace', 'geoserver', 'store', '$rootScope',
  function ($scope, $modalInstance, workspace, geoserver, store,
    $rootScope) {

    $scope.title = 'Delete Data Store';
    $scope.storeUndefined = false;

    $scope.workspace = workspace;
    $scope.geoserver = geoserver;
    $scope.store = store;

    if (!store) {
      $scope.storeUndefined = true;
    }

    $scope.cancel = function() {
      $modalInstance.dismiss('close');
    };

    $scope.deleteForever = function() {
      $modalInstance.dismiss('delete');
      $rootScope.alerts = [{
        type: 'warning',
        message: 'Store update API is still in progress...',
        fadeout: true
      }];
    };

  }]);
