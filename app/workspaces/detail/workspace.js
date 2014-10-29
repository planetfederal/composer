angular.module('gsApp.workspaces.home', [
  'gsApp.workspaces.maps',
  'gsApp.workspaces.layers',
  'gsApp.workspaces.data',
  'gsApp.workspaces.settings',
  'gsApp.alertpanel',
  'ngSanitize'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('workspace', {
          url: '/workspace/:workspace',
          templateUrl: '/workspaces/detail/workspace.tpl.html',
          controller: 'WorkspaceHomeCtrl'
        });
    }])
.controller('WorkspaceHomeCtrl', ['$scope','$state', '$stateParams', '$log',
  '$modal', 'GeoServer', 'AppEvent', '$timeout', '$location',
    function($scope, $state, $stateParams, $log, $modal, GeoServer, AppEvent,
      $timeout, $location) {
      var wsName = $stateParams.workspace;

      $scope.workspace = wsName;

      var loc = $location.path();
      function isActive(tab) {
        if (loc.indexOf(tab) > -1) {
          return true;
        }
        return false;
      }

      GeoServer.workspace.get(wsName).then(function(result) {
        $scope.title = wsName;

        $scope.tabs = [
          { heading: 'Maps',
            routeCategory: 'workspace.maps',
            route: 'workspace.maps.main',
            active: isActive('maps')},
          { heading: 'Layers',
            routeCategory: 'workspace.layers',
            route: 'workspace.layers.main',
            active: isActive('layers')},
          { heading: 'Data',
            routeCategory: 'workspace.data',
            route: 'workspace.data.main',
            active: isActive('data')}
        ];

        $scope.go = function(route) {
          $state.go(route, {workspace:wsName});
        };

        // hack to deal with strange issue with tabs being selected
        // when they are destroyed
        // https://github.com/angular-ui/bootstrap/issues/2155
        var destroying = false;
        $scope.$on('$destroy', function() {
          destroying = true;
        });
        $scope.selectTab = function(t) {
          if (!destroying) {
            $scope.go(t.route);
          }
        };

        $scope.workspaceHome = function() {
          $scope.selectTab($scope.tabs[0]);
          $scope.tabs[0].active = true;
        };

        $scope.createMap = function() {
          $scope.selectTab($scope.tabs[0]);
          $scope.tabs[0].active = true;
          $timeout(function() {
            $scope.$broadcast(AppEvent.CreateNewMap);
          }, 200);
        };

        $scope.importData = function() {
          $scope.selectTab($scope.tabs[1]);
          $scope.tabs[2].active = true;
          $timeout(function() {
            $scope.$broadcast(AppEvent.ImportData);
          }, 100);
        };

        $scope.$on('$stateChangeSuccess',
          function(e, to, toParams, from, fromParams) {
            $scope.tabs.forEach(function(tab) {
              if ($state.is(tab.routeCategory)) {
                tab.active = $state.is(tab.routeCategory);
              }
            });
            if (to.name == 'workspace') {
              $scope.go($scope.tabs[0].route);
            }
            $scope.showSettings = $state.is('workspace.settings');
          });
      });

    }]);

