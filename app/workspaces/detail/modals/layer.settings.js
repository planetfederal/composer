angular.module('gsApp.workspaces.layers.settings', [])
.controller('EditLayerSettingsCtrl', ['workspace', 'layer', '$scope',
  '$rootScope', '$state', '$log', '$modalInstance', 'GeoServer', 'AppEvent',
    function(workspace, layer, $scope, $rootScope, $state, $log, $modalInstance,
      GeoServer, AppEvent) {

      $scope.workspace = workspace;
      $scope.layer = layer;

      $scope.form = {};
      $scope.form.mapSettings = {};
      var originalLayer = angular.copy($scope.layer);

      $scope.crsTooltip =
      '<h5>Add a projection in EPSG</h5>' +
      '<p>Coordinate Reference System (CRS) info is available at ' +
        '<a href="http://prj2epsg.org/search" target="_blank">' +
          'http://prj2epsg.org' +
        '</a>' +
      '</p>';

      $scope.saveChanges = function() {
        if ($scope.form.layerSettings.$dirty) {
          var patch = {};
          if (originalLayer.name !== $scope.layer.name) {
            patch.name = $scope.layer.name;
          }
          if (originalLayer.title !== $scope.layer.title) {
            patch.title = $scope.layer.title;
          }
          if (originalLayer.proj.srs !== $scope.layer.proj.srs) {
            patch.proj = $scope.layer.proj;
          }
          if (originalLayer.description !== $scope.layer.description) {
            patch.description = $scope.layer.description;
          }

          GeoServer.layer.update($scope.workspace, originalLayer.name, patch)
          .then(function(result) {
              if (result.success) {
                $scope.form.layerSettings.saved = true;
                $scope.form.layerSettings.$setPristine();
                $rootScope.$broadcast(AppEvent.MapUpdated, {
                  'original': originalLayer,
                  'new': $scope.layer
                });
                originalLayer = angular.copy($scope.layer);
              } else {
                $rootScope.alerts = [{
                  type: 'warning',
                  message: 'Layer update failed.',
                  fadeout: true
                }];
              }
            });
        }
      };

      $scope.deleteLayer = function (layer) {
        GeoServer.layer.delete($scope.workspace, layer.name)
        .then(function(result) {
            if (result.success) {
              $rootScope.$broadcast(AppEvent.LayersAllUpdated, result.data);
              $rootScope.alerts = [{
                type: 'success',
                message: 'Layer ' + layer.name + ' successfully deleted.',
                fadeout: true
              }];
              $modalInstance.dismiss('close');
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Layer could not be deleted.',
                fadeout: true
              }];
            }
          });
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }]);
