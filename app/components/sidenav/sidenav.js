angular.module('gsApp.sidenav', [
  'gsApp.workspaces.workspace',
  'ui.bootstrap',
  'gsApp.olmap'
])
.directive('sidenav', function() {
    return {
      restrict: 'EA',
      templateUrl: '/components/sidenav/sidenav.tpl.html',
      controller: 'SideNavCtrl',
      replace: true
    };
  })
.controller('SideNavCtrl', ['$scope', '$rootScope', 'GeoServer',
  'AppEvent', '$state', '$log',
  function($scope, $rootScope, GeoServer, AppEvent, $state, $log) {

    GeoServer.workspaces.get().then(
      function(result) {
        if (result.success) {
          $scope.workspaces = result.data;
        } else {
          $scope.alerts = [{
              type: 'warning',
              message: 'Could not get workspaces.',
              fadeout: true
            }];
        }
      });

    $scope.onResize = function() {
      $rootScope.$broadcast(AppEvent.SidenavResized);
    };

    $scope.onWorkspaceClick = function(workspace, detail) {
      if (detail) {
        $state.go('workspace.home.' + detail, {
          workspace: workspace.name
        });
      } else {
        $state.go('workspace.home', {
          workspace: workspace.name
        });
      }
    };

    $scope.newWorkspace = function() {
      $state.go('workspace.new');
    };

    $rootScope.$on(AppEvent.WorkspaceNameChanged,
      function(scope, names) {
        $scope.workspaces.forEach(function(workspace) {
          if (workspace.name ===  names.original) {
            workspace.name = names.new;
            return;
          }
        });
      });

    $rootScope.$on(AppEvent.WorkspaceDeleted,
      function(scope, deletedSpaceName) {
        for (var p=0; p < $scope.workspaces.length; p++) {
          if ($scope.workspaces[p].name === deletedSpaceName) {
            $scope.workspaces.splice(p,1);
          }
        }
      });
  }]);

