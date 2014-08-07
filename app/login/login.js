angular.module('gsApp.login', [])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('login', {
        url: '/login',
        templateUrl: '/login/login.tpl.html',
        controller: 'LoginCtrl'
      });
    }])
.controller(
    'LoginCtrl', ['$scope', '$rootScope', '$state', 'GeoServer', 'AppEvent',
    function($scope, $rootScope, $state, GeoServer, AppEvent) {
      $scope.title = 'Login';
      $scope.creds = {};
      $scope.loginFailed = false;

      $scope.login = function() {
        GeoServer.login($scope.creds.username, $scope.creds.password)
          .then(function(result) {
            // update form failed flag 
            $scope.loginFailed = !result.success;
            return result;
          })
          .then(function(result) {
            // broadcast login info
            if (result.success) {
              $rootScope.$broadcast(AppEvent.Login, result.data);
            }
            return result;
          })
          .then(function(result) {
            if (result.success) {
              // redirect to the previous state
              var prev = $scope.state.prev;
              if (prev.name === '') {
                $state.go('home');
              }
              else {
                $state.go(prev.name);
              }
            }
            return result;
          })
          .catch(function(result) {});
      };
    }]);