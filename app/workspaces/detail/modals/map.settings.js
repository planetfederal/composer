angular.module('gsApp.workspaces.maps.settings', [])
.controller('EditMapSettingsCtrl', ['workspace', 'map', '$scope', '$rootScope',
  '$state', '$log', '$modalInstance', 'GeoServer', 'AppEvent',
    function(workspace, map, $scope, $rootScope, $state, $log, $modalInstance,
      GeoServer, AppEvent) {

      $scope.workspace = workspace;
      $scope.map = map;

      $scope.form = {};
      $scope.form.mapSettings = {};
      var originalMap = angular.copy($scope.map);

      $scope.crsTooltip =
      '<h5>Add a projection in EPSG</h5>' +
      '<p>Coordinate Reference System (CRS) info is available at ' +
        '<a href="http://prj2epsg.org/search" target="_blank">' +
          'http://prj2epsg.org' +
        '</a>' +
      '</p>';

      $scope.saveChanges = function() {
        if ($scope.form.mapSettings.$dirty) {
          var patch = {};
          if (originalMap.name !== $scope.map.name) {
            patch.name = $scope.map.name;
          }
          if (originalMap.title !== $scope.map.title) {
            patch.title = $scope.map.title;
          }
          if (originalMap.proj.srs !== $scope.map.proj.srs) {
            patch.proj = $scope.map.proj;
          }
          if (originalMap.description !== $scope.map.description) {
            patch.description = $scope.map.description;
          }

          GeoServer.map.update($scope.workspace, originalMap.name, patch).then(
            function(result) {
              if (result.success) {
                $scope.form.mapSettings.saved = true;
                $scope.form.mapSettings.$setPristine();
                $rootScope.$broadcast(AppEvent.MapUpdated, {
                  'original': originalMap,
                  'new': $scope.map
                });
                originalMap = angular.copy($scope.map);
              } else {
                $rootScope.alerts = [{
                  type: 'warning',
                  message: 'Map update failed.',
                  fadeout: true
                }];
              }
            });
        }
      };

      $scope.deleteMap = function (map) {
        GeoServer.map.delete($scope.workspace, map.name, {'name': map.name})
        .then(function(result) {
            if (result.success) {
              $rootScope.$broadcast(AppEvent.MapsAllUpdated, result.data);
              $rootScope.alerts = [{
                type: 'success',
                message: 'Map ' + map.name + ' successfully deleted.',
                fadeout: true
              }];
              $modalInstance.dismiss('close');
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Map could not be deleted.',
                fadeout: true
              }];
            }
          });
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }]);
