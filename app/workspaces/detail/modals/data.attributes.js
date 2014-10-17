angular.module('gsApp.workspaces.data.attributes', [])
.controller('WorkspaceAttributesCtrl',
    ['layerOrResource', 'attributes', '$scope', '$rootScope', '$state',
    '$log', '$modalInstance',
    function(layerOrResource, attributes, $scope, $rootScope, $state,
      $log, $modalInstance) {

      $scope.layerOrResource = layerOrResource;
      $scope.attributes = attributes;

      $scope.title = 'Attributes for ' + $scope.layerOrResource;

      $scope.close = function () {
        $modalInstance.dismiss('close');
      };
    }]);
