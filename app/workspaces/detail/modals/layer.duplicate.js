angular.module('gsApp.workspaces.layers.duplicate', [])
.controller('DuplicateLayerCtrl', ['resource', 'workspace', '$scope',
  '$rootScope', '$state', '$log', '$modalInstance', 'GeoServer',
  'AppEvent',
    function(resource, workspace, $scope, $rootScope, $state, $log,
      $modalInstance, GeoServer) {

      $scope.resource = resource;
      $scope.workspace = workspace;

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

      var fromLayer = resource.layers[0].name;

      $scope.layer = {
        title: resource.title,
        workspace: workspace,
        proj: findProj(resource.schema.attributes),
        layer: {
          name: fromLayer,
          workspace: $scope.workspace
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
                message: 'Could not create duplicate layer from resource ' +
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
