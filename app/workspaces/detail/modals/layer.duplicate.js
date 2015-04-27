/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.layers.duplicate', [])
.controller('DuplicateLayerCtrl', ['layer', 'workspace', '$scope',
  '$rootScope', '$state', '$log', '$modalInstance', 'GeoServer',
  'AppEvent',
    function(layer, workspace, $scope, $rootScope, $state, $log,
      $modalInstance, GeoServer, AppEvent) {

      $scope.fromLayer = layer;
      $scope.workspace = workspace;

      $scope.layer = {
        'layer': { // from layer
          'name': $scope.fromLayer.name,
          'workspace': $scope.workspace,
        },
        'title': $scope.fromLayer.title, // fill in defaults
        'workspace': $scope.workspace,
        'proj': $scope.fromLayer.proj,
        'description': $scope.fromLayer.description,
        'type': $scope.fromLayer.type
      };
      $scope.importAsLayer = function() {
        var layerInfo = $scope.layer;
        $scope.form.layerSettings.alerts = null;

        GeoServer.layer.create($scope.workspace, layerInfo)
          .then(function(result) {
            if (result.success) {
              var layer = result.data;
              $rootScope.$broadcast(AppEvent.LayerAdded, layer);
              $rootScope.alerts = [{
                type: 'success',
                message: 'New layer ' + layer.name + ' successfully created.',
                fadeout: true
              }];
              $modalInstance.dismiss('created');
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Could not copy layer ' + $scope.layer.name + '.',
                fadeout: true
              }];
              $scope.form.layerSettings.alerts = 'Copy Failed: ' +
                result.data.message;
            }
          });
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }]);
