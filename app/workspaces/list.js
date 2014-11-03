angular.module('gsApp.workspaces.list', [
  'ngGrid',
  'gsApp.core.utilities'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('workspaces.list', {
          url: '/list',
          templateUrl: '/workspaces/list.tpl.html',
          controller: 'WorkspacesListCtrl'
        });
    }])
.controller('WorkspacesListCtrl', ['$scope', 'GeoServer', '$state', '$log',
  '$rootScope', 'AppEvent',
    function($scope, GeoServer, $state, $log, $rootScope, AppEvent) {
      $scope.title = 'All Projects';

      $scope.onWorkspaceClick = function(workspace) {
        var params = {workspace: workspace.name};
        var state = 'workspace';
        $state.go(state, params);
        $rootScope.$broadcast(AppEvent.WorkspaceSelected,
          workspace.name);
      };

      $scope.defaultDesc = 'If a project is not specified ' +
        'in a GeoServer request, the DEFAULT project is used.';
      $scope.showDefaultDesc = false;

      GeoServer.workspaces.get().then(
        function(result) {
          if (result.success) {
            $scope.workspaces = result.data;
            $rootScope.$broadcast(AppEvent.WorkspacesFetched,
              $scope.workspaces);
          } else {
            $scope.alerts = [{
                type: 'warning',
                message: 'Could not get workspaces.',
                fadeout: true
              }];
          }
        });

      $scope.onWorkspaceInfo = function(workspace) {
        $scope.selected = workspace;
        GeoServer.workspace.get(workspace.name).then(
          function(result) {
            if (result.success) {
              $scope.selected.workspaceInfo = result.data;
              $scope.selected.showInfo = true;
            } else {
              $scope.alerts = [{
                  type: 'warning',
                  message: 'Could not get workspace ' + workspace.name + '.',
                  fadeout: true
                }];
            }
          });
      };

    }]);
