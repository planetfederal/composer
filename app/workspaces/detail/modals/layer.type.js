angular.module('gsApp.workspaces.layers.type', [])
.controller('LayerTypeInfoCtrl',
    ['layer', 'formats', '$scope', '$rootScope', '$state',
    '$log', '$modalInstance', 'GeoServer', 'AppEvent', '_',
    function(layer, formats, $scope, $rootScope, $state,
      $log, $modalInstance, GeoServer, AppEvent, _) {

      $scope.layer = layer;
      $scope.formats = formats;

      $scope.close = function () {
        $modalInstance.dismiss('close');
      };
    }]);
