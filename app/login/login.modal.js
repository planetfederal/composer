/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.login.modal', [])
.controller(
    'LoginModalCtrl', ['$scope', '$rootScope', '$state', '$modalInstance', 'GeoServer', 'AppEvent',
    function($scope, $rootScope, $state, $modalInstance, GeoServer, AppEvent) {
      $scope.title = 'Login';
      $scope.creds = {};
      $scope.loginFailed = false;
      $rootScope.enableAlerts = true;

      $scope.alertsOff = function() {
        $rootScope.enableAlerts = false;
      };

      $scope.login = function() {
        GeoServer.login($scope.creds.username, $scope.creds.password)
          .then(function(result) {
            // update form failed flag
            $scope.loginFailed = !result.success;
            return result;
          })
          .then(function(result) {
            // Dismis the modal and go back to whatever we were doing
            if (result.success) {
              $modalInstance.close('login');
              $rootScope.enableAlerts = true;
              $scope.$parent.modal = false;
              $rootScope.$broadcast(AppEvent.Login, result.data);
            }
            return result;
          })
          .catch (function(result) {});          
      };

      $scope.cancel = function() {
        //Stay logged out; go to the logout page.
        $modalInstance.dismiss('logout');
        $scope.$parent.modal = false;
        $rootScope.$broadcast(AppEvent.Logout);

      };
    }]);
