angular.module('gsApp.workspaces.workspace', [
  'gsApp.workspaces.workspace.maps',
  'gsApp.workspaces.workspace.data',
  'ngGrid',
  'ngSanitize',
  'ui.router'
])
.config(['$stateProvider', '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
      $urlRouterProvider.otherwise('/home/maps');

      $stateProvider
        .state('workspace.home', {
          url: '',
          templateUrl: '/workspaces/detail/workspace-home.tpl.html',
          controller: 'WorkspaceHomeCtrl'
        })
        .state('workspace.home.maps', {
          url: '/maps',
          templateUrl: '/workspaces/detail/workspace-maps/workspace-maps.tpl.html',
          controller: 'WorkspaceMapsCtrl'
        })
        .state('workspace.home.data', {
          url: '/data',
          templateUrl: '/workspaces/detail/workspace-data/workspace-data.tpl.html',
          controller: 'WorkspaceDataCtrl'
        });
    }])
.controller('WorkspaceHomeCtrl', ['$scope', '$stateParams',
  'GeoServer', '$log', '$state', '$timeout',
    function($scope, $stateParams, GeoServer, $log, $state,
      $timeout) {

      var wsName = $stateParams.workspace;
      $scope.title = wsName;

      // Allow tabs in url
      $scope.tabs = [
        { heading: 'Maps', route:'workspace.home.maps', active:false },
        { heading: 'Data', route:'workspace.home.data', active:false }
      ];
      $scope.go = function(route) {
        if ($scope.timer) {
          $timeout.cancel($scope.timer);
        }
        $scope.timer = $timeout((function() {
            $state.go(route);
        }), 200);
      };
      $scope.active = function(route) {
        return $state.is(route);
      };
      $scope.$on('$stateChangeSuccess', function() {
        $scope.tabs.forEach(function(tab) {
            tab.active = $scope.active(tab.route);
        });
      });

    }]);

