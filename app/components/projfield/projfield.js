angular.module('gsApp.projfield', [
  'ui.bootstrap',
  'gsApp.core.backend'
])
.directive('projField', ['$log', '$timeout', '$modal', 'GeoServer', '_',
    function($log, $timeout, $modal, GeoServer, _) {
      return {
        restrict: 'EA',
        scope: {
          proj: '='
        },
        templateUrl: '/components/projfield/projfield.tpl.html',
        controller: function($scope, $element) {
          GeoServer.proj.recent().then(function(result) {
            $scope.projList = result.data;
            var index = _.findIndex($scope.projList, function(proj) {
              return proj.srs === 'EPSG:4326';
            });
            $scope.proj = $scope.projList[index];
          });

          $scope.validateProj = function() {
            GeoServer.proj.get($scope.proj.srs).then(function(result) {
              $scope.valid = result.success;
              if (result.success) {
                $scope.proj.wkt = result.data.wkt;
              }
            });
          };

          $scope.showProjWKT = function() {
            $scope.popup = $modal.open({
              templateUrl: 'projfield.modal.html',
              controller: function($scope, $modalInstance, proj) {
                $scope.wkt = proj.wkt;
                $scope.ok = function() {
                  $modalInstance.close();
                };
              },
              resolve: {
                proj: function() {
                  return $scope.proj;
                }
              }
            });
          };

          $scope.ok = function() {

          };

          $scope.$watch('proj.srs', function(newVal) {
            if (newVal != null) {
              if ($scope.t != null) {
                $timeout.cancel($scope.t);
              }
              $scope.t = $timeout(function() {
                $scope.validateProj();
              }, 1000);
            }
          });
        }
      };
    }]);
