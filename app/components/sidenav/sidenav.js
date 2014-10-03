angular.module('gsApp.sidenav', [
  'ui.bootstrap'
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
  'AppEvent','$state', '$log',
  function($scope, $rootScope, GeoServer, AppEvent, $state, $log) {

    GeoServer.workspaces.get().$promise.then(function(workspaces) {
      workspaces.filter(function(ws) {
        return ws['default'];
      });

      $scope.workspaces = workspaces;
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

    $rootScope.$on(AppEvent.WorkspaceNameChanged, function(scope, names) {
      $scope.workspaces.forEach(function(workspace) {
        if (workspace.name ===  names.original) {
          workspace.name = names.new;
          return;
        }
      });
    });
  }]);

