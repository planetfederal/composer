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
.controller('HomeCtrl', ['$scope', 'GeoServer',
    function($scope, GeoServer) {

      $scope.title = 'Recent';

      GeoServer.workspaces.get(true).then(function(result) {
        $scope.workspaces = result.data;
      });

      GeoServer.workspaces.recent().then(function(result) {
        $scope.recentWorkspaces = result.data;
      });

      GeoServer.maps.recent().then(function(result) {
        $scope.recentMaps = result.data;
      });

      GeoServer.layers.recent().then(function(result) {
        $scope.recentLayers = result.data;
      });


    }]);
