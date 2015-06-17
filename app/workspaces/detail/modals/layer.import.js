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

      GeoServer.datastores.getResource($scope.workspace, store.name,
        resource.name).then(
          function(result) {
            if (result.success) {
              $scope.resource = result.data;
              var schema = result.data.schema;
              $scope.resourceProj = findProj(schema.attributes,
                schema.defaultGeometry);
              var keywords = $scope.resource.keywords?
                $scope.resource.keywords.toString() : 'none';
              $scope.layer = {
                'name': $scope.resource.name,
                'title': $scope.resource.title,
                'workspace': $scope.workspace,
                'proj': $scope.resourceProj,
                'keywords': keywords,
                'resource': {
                  'store': $scope.resource.store.name,
                  'url': $scope.resource.store.url,
                  'workspace': $scope.workspace,
                  'name': $scope.resource.name
                }
              };
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Could not get resource details for ' +
                  $scope.resource.name + ': ' + result.data.message,
                details: result.data.trace,
                fadeout: true
              }];
            }
          });

      // Iterate through resource attributes to find the_geom or geom or
      // any geometry attribute to find the projection
      var findProj = function(attributes, defaultGeomPropName) {
        var proj;
        for (var k=0; k < attributes.length; k++) {
          var attr = attributes[k];
          if (attr.name===defaultGeomPropName && attr.proj) {
            return attr.proj;
          }
        }
        return null;
      };

      $scope.crsTooltip =
        '<h5>Add a projection in EPSG</h5>' +
        '<p>Coordinate Reference System (CRS) info is available at ' +
          '<a href="http://prj2epsg.org/search" target="_blank">' +
            'http://prj2epsg.org' +
          '</a>' +
        '</p>';


      $scope.importAsLayer = function() {
        var layerInfo = $scope.layer;
        $scope.layerAdded = false;
        GeoServer.layer.create($scope.workspace, layerInfo).then(
          function(result) {
            if (result.success) {
              $scope.form.alerts = null;
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
              $modalInstance.close($scope.layerAdded);
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Could not create layer from resource ' +
                  $scope.resource.name + ': ' + result.data.message,
                details: result.data.trace,
                fadeout: true
              }];
              $scope.form.alerts = 'Error: ' + result.data.message;
            }
          });
      };

      $scope.cancel = function () {
        $modalInstance.dismiss(false);
      };
    }]);
