angular.module('gsApp.alertlist', [
  'ui.bootstrap'
])
.controller('AlertListCtrl', ['$modal', '$interval', '$log', '$timeout', '$scope', '$rootScope', '$modalInstance',
    function($modal, $interval, $log, $timeout, $scope, $rootScope, $modalInstance) {
      $scope.alertList = $rootScope.alertList;

      $scope.scrollToBottom = function() {
        var listElement = document.getElementById('alert-list');
        listElement.scrollTop = listElement.offsetHeight;
      }

      $timeout(function () {
        //DOM has finished rendering
        $scope.scrollToBottom();
      });

      $scope.close = function () {
        $modalInstance.dismiss('close');
      };
    }]);
