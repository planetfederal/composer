/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.login.modal', [])
.controller(
    'LoginModalCtrl', ['$scope', '$rootScope', '$state', '$modalInstance', '$interval', 'GeoServer', 'AppEvent', 'countdown',
    function($scope, $rootScope, $state, $modalInstance, $interval, GeoServer, AppEvent, countdown) {
      $scope.title = 'Login';
      $scope.creds = {};
      $scope.loginFailed = false;
      $rootScope.enableAlerts = true;

      if (countdown) {
        $scope.countdown = countdown;
        var countdownMessage = function(){
          $scope.countdown--;
            if ($scope.countdown > 0) {
              $scope.message = "Your session will expire in " + $scope.countdown + " second" + ($scope.countdown != 1 ? 's' : '') 
                  + ", please login again.";
            } else {
              $interval.cancel(interval);
              $scope.message = "Your session has expired due to inactivity. Please login again."
            }
          };
        countdownMessage();
        interval = $interval(countdownMessage, 1000);
      } else {
        //Default message if no countdown
        $scope.message = "You are not logged in. Please login."
      }

      $scope.alertsOff = function() {
        $rootScope.enableAlerts = false;
      };

      $scope.login = function() {
        GeoServer.login($scope.creds.username, $scope.creds.password)
          .then(function(result) {
            // update form failed flag
            $scope.loginFailed = !result.success;
            if ($scope.loginFailed) {
              $scope.message = null;
              if (interval) {
                $interval.cancel(interval);
              }
            }
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
