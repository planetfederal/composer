angular.module('gsApp.workspaces.data.update', [])
.controller('WorkspaceUpdateDataCtrl', ['workspace', 'store', '$scope',
    '$rootScope', '$modalInstance',
    function (workspace, store, $scope, $rootScope, $modalInstance) {

      $scope.title = 'Update Data Store';
      $scope.storeUndefined = false;

      $scope.workspace = workspace;
      $scope.store = store;

      if (!store) {
        $scope.storeUndefined = true;
      }

      $scope.cancel = function() {
        $modalInstance.dismiss('close');
      };

      $scope.save = function() {
        $modalInstance.dismiss('save');
        $rootScope.alerts = [{
          type: 'warning',
          message: 'Store update API is still in progress...',
          fadeout: true
        }];
      };
    }]);
