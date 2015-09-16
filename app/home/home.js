/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.home', ['gsApp.editor.map'])
.config(['$stateProvider', '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
      $urlRouterProvider.otherwise('/');
      $stateProvider.state('home', {
        url: '/',
        templateUrl: '/home/home.tpl.html',
        controller: 'HomeCtrl'
      });
    }])
.controller('HomeCtrl', ['$scope', '$rootScope', 'GeoServer', '$state',
    function($scope, $rootScope, GeoServer, $state) {

      $scope.title = 'Recent';

      GeoServer.workspaces.get(true).then(function(result) {
        $scope.workspaces = result.data;
      });

      GeoServer.workspaces.recent().then(function(result) {
        if (result.success) {
          $scope.recentWorkspaces = result.data;
          if ($scope.recentWorkspaces.length > 0) {
            $scope.isCollapsed = true;
          }
        } else {
          $rootScope.alerts = [{
            type: 'warning',
            message: 'Could not get recent workspaces',
            fadeout: true
          }];
        }
      });

      GeoServer.maps.recent().then(function(result) {
        if (result.success) {
          $scope.recentMaps = result.data;
          if ($scope.recentMaps.length > 0) {
            $scope.isCollapsed = true;
          }
        } else {
          $rootScope.alerts = [{
            type: 'warning',
            message: 'Could not get recent maps',
            fadeout: true
          }];
        }
      });

      GeoServer.layers.recent().then(function(result) {
        if (result.success) {
          $scope.recentLayers = result.data;
          if ($scope.recentLayers.length > 0) {
            $scope.isCollapsed = true;
          }
        } else {
          $rootScope.alerts = [{
            type: 'warning',
            message: 'Could not get recent layers',
            fadeout: true
          }];
        }
      });

    }]);
