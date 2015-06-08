/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.home', [])
.config(['$stateProvider', '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
      $urlRouterProvider.otherwise('/');
      $stateProvider.state('home', {
        url: '/',
        templateUrl: '/home/home.tpl.html',
        controller: 'HomeCtrl'
      });
    }])
.controller('HomeCtrl', ['$scope', 'GeoServer', '$state',
    function($scope, GeoServer, $state) {

      $scope.title = 'Recent';

      GeoServer.workspaces.get(true).then(function(result) {
        $scope.workspaces = result.data;
      });

      GeoServer.workspaces.recent().then(function(result) {
        $scope.recentWorkspaces = result.data;
        if ($scope.recentWorkspaces.length > 0) {
          $scope.isCollapsed = true;
        }
      });

      GeoServer.maps.recent().then(function(result) {
        $scope.recentMaps = result.data;
        if ($scope.recentMaps.length > 0) {
          $scope.isCollapsed = true;
        }
      });

      GeoServer.layers.recent().then(function(result) {
        $scope.recentLayers = result.data;
        if ($scope.recentLayers.length > 0) {
          $scope.isCollapsed = true;
        }
      });

    }]);
