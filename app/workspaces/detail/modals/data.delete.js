angular.module('gsApp.workspaces.data.delete', [])
.controller('WorkspaceDeleteDataCtrl', ['workspace', 'store', '$scope',
    '$rootScope', '$modalInstance',
    function (workspace, store, $scope, $rootScope, $modalInstance) {

      $scope.title = 'Delete Data Store';
      $scope.storeUndefined = false;

      $scope.workspace = workspace;
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
