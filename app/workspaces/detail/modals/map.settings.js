/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.maps.settings', [])
.controller('EditMapSettingsCtrl', ['workspace', 'map', '$scope', '$rootScope',
  '$state', '$log', '$modalInstance', 'GeoServer', 'AppEvent',
    function(workspace, map, $scope, $rootScope, $state, $log, $modalInstance,
      GeoServer, AppEvent) {

      $scope.workspace = workspace;
      $scope.map = angular.copy(map);
      $scope.mapname = map.name;

      $scope.form = {};
      $scope.form.mapSettings = {};
      var originalMap = angular.copy($scope.map);

      $scope.crsTooltip =
      '<p>Add a projection in EPSG</p>' +
      '<p><small>Coordinate Reference System (CRS) info is available at ' +
        '<a href="http://prj2epsg.org/search" target="_blank">' +
          'http://prj2epsg.org' +
        '</a>' +
        '</small></p>';

      $scope.renderToolTip =
      '<p>Render Timeout</p>' +
      '<small class="hint">Max time to wait for map to render in ' +
      'Composer before the request is cancelled.<br/>A lower number prevents '+
      'overloading GeoServer with resource-monopolizing<br/>rendering '+
      'requests.<br/><br/>Minimum is 3 seconds.<br/><br/>Default is ' +
      '120 seconds.<br/>(This is set high so you can still render ' +
      'large datasets, but we<br/>recommend reducing this for a more ' +
      'performant or shared GeoServer).</small>';

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
                $scope.form.mapSettings.saved = true;
                $scope.form.mapSettings.$setPristine();
                $rootScope.$broadcast(AppEvent.MapUpdated, {
                  'original': originalMap,
                  'new': result.data
                });
                $scope.map = result.data;
                originalMap = angular.copy($scope.map);
              } else {
                $scope.map = angular.copy(originalMap);
                $rootScope.alerts = [{
                  type: 'danger',
                  message: 'Map update failed: ' +
                    result.data.message,
                  fadeout: true
                }];
                $scope.form.mapSettings.alerts =
                  'Error: ' + result.data.message;
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
