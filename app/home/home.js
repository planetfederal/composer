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
      $scope.title = 'Home';
      GeoServer.serverInfo.get().$promise.then(function(serverInfo) {
        $scope.serverInfo = serverInfo;
      });
    }]);
