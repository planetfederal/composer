/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.data.attributes', [])
.controller('WorkspaceAttributesCtrl',
    ['layerOrResource', '$scope', '$rootScope', 'workspace',
     '$log', '$modalInstance', 'GeoServer', 'storename',
    function(layerOrResource, $scope, $rootScope, workspace,
     $log, $modalInstance, GeoServer, storename) {

      if (layerOrResource.layers.length > 0 &&
       layerOrResource.layers[0].schema) {
        $scope.attributes = layerOrResource.layers[0].schema.attributes;
      } else {
        GeoServer.datastores.getResource(workspace, storename,
          layerOrResource.name).then(
          function(result) {
            if (result.success) {
              $scope.attributes = result.data.schema.attributes;
            } else {
              if (result.data) {
                $scope.error = result.data.message;
              } else {
                $scope.error = "Unable to load attributes.";
              }
            }
          });
      }

      $scope.layerOrResource = layerOrResource;
      $scope.title = layerOrResource.name;

      $scope.close = function () {
        $modalInstance.dismiss('close');
      };
    }]);
