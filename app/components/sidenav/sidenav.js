/*global $, window*/
angular.module('gsApp.sidenav', [
  'gsApp.workspaces.home',
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
  'AppEvent', '$state', '$log', '$timeout', '$window', 'AppSession',
  function($scope, $rootScope, GeoServer, AppEvent, $state, $log,
    $timeout, $window, AppSession) {

    // Hug partial menu to sidebar bottom if height's enough
    $scope.onWindowResize = function() {
      var windowHeight = $window.innerHeight - 150;
      if (windowHeight < 300) {
        $scope.sideStyle = {'position': 'relative'};
        $scope.sideBottom = {'position': 'relative'};
      } else {
        $scope.sideStyle = {'position': 'absolute'};
        $scope.sideBottom = {'top': (windowHeight-40) + 'px'};
      }
    };
    $scope.onWindowResize();
    var timer = null;
    $(window).resize(function() { // angular $window checked too often
      if (timer===null) {
        timer = $timeout(function() {
          $scope.onWindowResize();
          timer = null;
        }, 700);
      }
    });

    $scope.openWorkspaces = function() {
      if (!$scope.workspaces) {
        GeoServer.workspaces.get().then(
        function(result) {
          if (result.success) {
            $scope.workspaceData = result.data;
            $rootScope.$broadcast(AppEvent.WorkspacesFetched,
              $scope.workspaceData);
          } else {
            // special case, check for 401 Unauthorized, if so be quiet
            if (result.status != 401) {
              $scope.alerts = [{
                type: 'warning',
                message: 'Could not get workspaces.',
                fadeout: true
              }];
            }
          }
        });
      }
    };

    $scope.onResize = function() {
      $rootScope.$broadcast(AppEvent.SidenavResized);
    };

    $scope.onWorkspaceClick = function(workspace, detail) {
      var params = {workspace: workspace.name};
      var state = 'workspace';
      if (detail) {
        state += '.' + detail;
      }
      $state.go(state, params);
    };

    $scope.newWorkspace = function() {
      $state.go('workspaces.new');
    };

    $rootScope.$on(AppEvent.WorkspacesFetched,
      function(scope, workspaces) {
        $scope.workspaces = workspaces;
      });

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

    $rootScope.$on(AppEvent.ToggleSidenav,
      function(scope) {
        if (!$scope.toggleSide) {
          $scope.toggleSide = true;
          $timeout(function() {
            $scope.onResize();
          },450);
        }
      });

    $rootScope.$on(AppEvent.ServerError,
      function(scope, error) {
        $scope.alerts.push({
          type: 'error',
          message: 'Server not responding ' + error.status + ': ' +
           error.data,
          fadeout: true
        });
      });
  }]);
