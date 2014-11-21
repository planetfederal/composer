/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 * License: BSD
 */
angular.module('gsApp.featureinfopanel', [
  'ui.bootstrap'
])
.directive('featureinfoPanel', ['$modal',
    function($modal) {
      return {
        restrict: 'EA',
        scope: {
          featureinfo: '=?',
          activeLayer: '='
        },
        templateUrl: '/components/featureinfopanel/featureinfopanel.tpl.html',
        controller: function($scope, $element) {
          $scope.$on('featureinfo', function(evt, featureInfo) {
            var modal = $modal.open({
              templateUrl: 'featureinfo-modal',
              size: 'lg',
              backdrop: 'static',
              resolve: {
                features: function() {
                  return featureInfo;
                },
                layer: function() {
                  return $scope.activeLayer;
                }
              },
              controller: function($scope, $modalInstance, features, layer) {
                $scope.features = features;
                $scope.layer = layer;
                $scope.close = function() {
                  $modalInstance.close();
                };
              }
            });
          });
        }
      };
    }]);
