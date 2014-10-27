angular.module('gsApp.errorpanel', [
  'ui.bootstrap'
])
.directive('errorPanel', ['$modal', '$interval', '$log', '$window',
    function($modal, $interval, $log, $window) {
      return {
        restrict: 'ACME',
        scope: {
          errors: '=?'
        },
        templateUrl: '/components/errorpanel/errorpanel.tpl.html',
        controller: function($scope, $element) {
          $scope.type = 'warning';
          $scope.message.details = 'Critical error.';
          $scope.msg.message = 'Test message...';
          $scope.groups = [
            {
              title: 'Error Heading - 1',
              content: 'Error Body - 1'
            },
            {
              title: 'Errror Heading - 2',
              content: 'Error Body - 2'
            }
          ];

          $scope.items = ['Item 1', 'Item 2', 'Item 3'];

          $scope.$watch('errors', function(newVal) {
            if (newVal != null) {
              $scope.messages = newVal.map(function(val) {
                var msg = angular.extend({show:true}, val);
                if (msg.fadeout == true) {
                  $interval(function() {
                    msg.show = false;
                  }, 5000, 1);
                }
                return msg;
              });
            }
          });
          $scope.close = function(i) {
            $scope.messages.splice(i, 1);
          };
          $scope.showDetails = function(message) {
            var modal = $modal.open({
              templateUrl: '/components/errorpanel/errorpaneldetails.tpl.html',
              size: 'lg',
              resolve: {
                message: function() {
                  return message;
                }
              },
              controller: function($scope, $modalInstance, message) {
                $scope.message = message;
                
                $scope.copy = function(message) {
                  $modalInstance.close();
                };
                $scope.close = function() {
                  $modalInstance.close();
                };
              }
            });
          };
        }
      };
    }]);
