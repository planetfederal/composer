/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.data.attributes', [])
.controller('WorkspaceAttributesCtrl',
    ['layerOrResource', 'attributes', '$scope', '$rootScope',
    '$log', '$modalInstance',
    function(layerOrResource, attributes, $scope, $rootScope,
      $log, $modalInstance) {

      $scope.layerOrResource = layerOrResource;
      $scope.attributes = attributes;

      $scope.title = layerOrResource;

      $scope.close = function () {
        $modalInstance.dismiss('close');
      };
    }]);
