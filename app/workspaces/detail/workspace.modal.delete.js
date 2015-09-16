/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.delete', [])
.controller('WorkspaceDeleteCtrl',
    ['workspace', '$scope', '$rootScope', '$state', '$log', '$modalInstance',
    'GeoServer', 'AppEvent',
    function(workspace, $scope, $rootScope, $state, $log, $modalInstance,
      GeoServer, AppEvent) {

      $scope.workspace = workspace;
      $scope.workspaceDeleted = false;

      $scope.deleteForever = function () {
        GeoServer.workspace.delete($scope.workspace).then(
          function(result) {
            if (result.success || result) {
              $scope.workspaceDeleted = true;
              $rootScope.alerts = [{
                type: 'success',
                message: 'Workspace '+ workspace +' deleted.',
                fadeout: true
              }];
              $rootScope.$broadcast(AppEvent.WorkspaceDeleted,
                $scope.workspace);
              $state.go('workspaces.list');
            } else {
              $rootScope.alerts = [{
                type: 'warning',
                message: 'Workspace deletion failed: '+result.data.message,
                details: result.data.trace,
                fadeout: true
              }];
            }
          });
        $modalInstance.close($scope.workspace);
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }]);
