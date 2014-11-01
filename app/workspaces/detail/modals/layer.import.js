angular.module('gsApp.workspaces.layers.import', [])
.controller('ImportLayerCtrl', ['resource', 'workspace', 'store', '$scope',
  '$rootScope', '$state', '$log', '$modalInstance', 'GeoServer',
  'AppEvent',
    function(resource, workspace, store, $scope, $rootScope, $state, $log,
      $modalInstance, GeoServer) {

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
        GeoServer.layer.create($scope.workspace, layerInfo)
          .then(function(result) {
            if (result.success) {
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Could not create layer from resource ' +
                  $scope.resource.name + '.',
                fadeout: true
              }];
            }
          });
        $modalInstance.dismiss('created');
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }]);
