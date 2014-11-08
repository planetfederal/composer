angular.module('gsApp.featureinfopanel', [
  'ui.bootstrap'
])
.directive('featureinfoPanel', ['$modal',
    function($modal) {
      return {
        restrict: 'EA',
        scope: {
          featureinfo: '=?'
        },
        templateUrl: '/components/featureinfopanel/featureinfopanel.tpl.html',
        controller: function($scope, $element) {
          $scope.$on('featureinfo', function(evt, featureInfo) {
            var modal = $modal.open({
              templateUrl: 'featureinfo-modal',
              size: 'lg',
              resolve: {
                features: function() {
                  return featureInfo;
                }
              },
              controller: function($scope, $modalInstance, features) {
                $scope.features = features;
                $scope.close = function() {
                  $modalInstance.close();
                };
              }
            });
          });
        }
      };
    }]);
