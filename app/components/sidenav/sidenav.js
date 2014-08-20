angular.module('gsApp.sidenav', [
  'gsApp.workspaces.workspace', 'ui.bootstrap',
])
.directive('sidenav', function() {
    return {
      restrict: 'EA',
      templateUrl: '/components/sidenav/sidenav.tpl.html',
      controller: 'SideNavCtrl',
      replace: true
    };
  })
.controller('SideNavCtrl', ['$scope', '$rootScope', 'GeoServer', 'AppEvent', '$state',
  '$log', function($scope, $rootScope, GeoServer, AppEvent, $state, $log) {

    GeoServer.workspaces.get().$promise.then(function(workspaces) {
      workspaces.filter(function(ws) {
        return ws['default'];
      });

      $scope.workspaces = workspaces;
    });

    $scope.onWorkspaceClick = function(workspace) {
      $state.go('workspace.home', {
        workspace: workspace.name
      });
    };

  }]);

