/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.maps.settings', [])
.controller('EditMapSettingsCtrl', ['$controller', '$log', '$modalInstance', '$rootScope', '$scope', '$state', 
    'AppEvent', 'GeoServer', 'map', 'workspace', 
    function($controller, $log, $modalInstance, $rootScope, $scope, $state, 
    AppEvent, GeoServer, map, workspace) {

      angular.extend(this, $controller('ModalCtrl', {$scope: $scope}));

      $scope.workspace = workspace;
      $scope.map = angular.copy(map);
      $scope.mapname = map.name;

      $scope.form = {};
      $scope.form.mapSettings = {};
      var originalMap = angular.copy($scope.map);

      $scope.saveChanges = function() {
        if ($scope.form.mapSettings.$dirty) {
          var patch = { 'bbox': {}, 'center': [2] };
          if (originalMap.name !== $scope.map.name) {
            patch.name = $scope.map.name;
          }
          if (originalMap.title !== $scope.map.title) {
            patch.title = $scope.map.title;
          }

          //bbox and proj are interdependant for maps
          if (originalMap.bbox !== $scope.map.bbox || originalMap.proj.srs !== $scope.map.proj.srs) {
            patch.proj = $scope.map.proj.srs;
            patch.bbox.south = $scope.map.bbox.south;
            patch.bbox.west = $scope.map.bbox.west;
            patch.bbox.north = $scope.map.bbox.north;
            patch.bbox.east = $scope.map.bbox.east;
          }

          if (originalMap.description !== $scope.map.description) {
            patch.description = $scope.map.description;
          }

          if (originalMap.timeout !== $scope.map.timeout) {
            patch.timeout = $scope.map.timeout;
          }

          GeoServer.map.update($scope.workspace, originalMap.name, patch).then(
            function(result) {
              if (result.success) {
                $scope.form.mapSettings.alerts = null;
                $scope.form.mapSettings.saved = true;
                $scope.form.mapSettings.$setPristine();
                $rootScope.$broadcast(AppEvent.MapUpdated, {
                  'original': originalMap,
                  'new': result.data
                });
                $scope.map = result.data;
                originalMap = angular.copy($scope.map);
                $scope.form.mapSettings.alerts = null;
                $modalInstance.close($scope.map);
              } else {
                $rootScope.alerts = [{
                  type: 'danger',
                  message: 'Map update failed: ' + result.data.message,
                  details: result.data.trace,
                  fadeout: true
                }];
                $scope.form.mapSettings.saved = false;
                $scope.form.mapSettings.alerts =
                  'Error: ' + result.data.message;
              }
            });
        }
      };

      $scope.calculateBounds = function() {
        GeoServer.map.bounds($scope.workspace, originalMap.name, {"proj":$scope.map.proj.srs}).then(function(result) {
            if (result.success) {
              if ($scope.form.mapSettings && $scope.map.bbox != result.data.bbox.native) {
                $scope.form.mapSettings.$dirty = true;
              }
              $scope.map.bbox = result.data.bbox.native;
              $scope.form.mapSettings.alerts = null;
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Error calculating bounds: '+result.data.message,
                details: result.data.trace,
                fadeout: true
              }];
              $scope.form.mapSettings.alerts =
                  'Error calculating bounds: ' + result.data.message;
            }
          });
      }

      $scope.close = function () {
        $modalInstance.dismiss();
      };
    }]);
