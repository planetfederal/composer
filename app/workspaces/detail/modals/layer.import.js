/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.layers.import', [])
.controller('ImportLayerCtrl', ['resource', 'workspace', 'store', '$scope',
  '$rootScope', '$state', '$log', '$modalInstance', 'GeoServer',
  'AppEvent', 'layersListModel',
    function(resource, workspace, store, $scope, $rootScope, $state, $log,
      $modalInstance, GeoServer, AppEvent, layersListModel) {

      $scope.resource = resource;
      $scope.workspace = workspace;
      $scope.store = store;

      // Iterate through resource attributes to find the_geom or geom or
      // any geometry attribute to find the projection
      var findProj = function(attributes) {
        var proj;
        for (var k=0; k < attributes.length; k++) {
          var attr = attributes[k];
          if (attr.property==='geometry') {
            proj = attr.proj;
            if (attr.name==='the_geom') {
              return proj;
            }
          }
        }
        return proj;
      };

      $scope.crsTooltip =
        '<h5>Add a projection in EPSG</h5>' +
        '<p>Coordinate Reference System (CRS) info is available at ' +
          '<a href="http://prj2epsg.org/search" target="_blank">' +
            'http://prj2epsg.org' +
          '</a>' +
        '</p>';


      $scope.layer = {
        'title': resource.title,
        'workspace': workspace,
        'type': store.kind.toLowerCase(),
        'proj': findProj(resource.schema.attributes),
        'resource': {
          'store': store.name,
          'url': store.url,
          'workspace': workspace,
          'name': resource.name
        }
      };

      $scope.importAsLayer = function() {
        var layerInfo = $scope.layer;
        $scope.layerAdded = false;
        GeoServer.layer.create($scope.workspace, layerInfo).then(
          function(result) {
            if (result.success) {
              $scope.resource = result.data.resource;
              if ($scope.resource.layers) {
                $scope.resource.layers.push(result.data);
              } else {
                $scope.resource.layers = result.data;
              }
              $rootScope.$broadcast(AppEvent.LayerAdded, result.data);
              $rootScope.alerts = [{
                type: 'success',
                message: 'Imported resource ' + $scope.resource.name +
                  ' as layer ' + layerInfo.title + '.',
                fadeout: true
              }];
              $scope.layerAdded = true;
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Could not create layer from resource ' +
                  $scope.resource.name + ': ' + result.data.message,
                fadeout: true
              }];
            }
            $modalInstance.close($scope.layerAdded);
          });
      };

      $scope.cancel = function () {
        $modalInstance.dismiss(false);
      };
    }]);
