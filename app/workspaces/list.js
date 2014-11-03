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

      $scope.onWorkspaceClick = function(ws) {
        $state.go('workspace', {
          workspace: ws
        });
      };

      $scope.onWorkspaceClick = function(workspace) {
        var params = {workspace: workspace.name};
        var state = 'workspace';
        $state.go(state, params);
      };

      $scope.defaultDesc = 'If no project is specified in a GeoServer request,'+
        'the DEFAULT is used. In map or layer requests, for example.';
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

    }]);
