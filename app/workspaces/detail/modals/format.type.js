angular.module('gsApp.workspaces.formats.type', [])
.controller('FormatTypeInfoCtrl',
    ['formats', 'resource', '$scope', '$rootScope', '$state', '$log',
    '$modalInstance', 'GeoServer', 'AppEvent', '_',
    function(formats, resource, $scope, $rootScope, $state, $log,
      $modalInstance,GeoServer, AppEvent, _) {

      $scope.formats = formats;
      $scope.resource = resource;
      var formatsByType = $scope.formats[resource.kind.toLowerCase()];
      $scope.format = _.find(formatsByType, function(format) {
        return format.name===resource.format.toLowerCase();
      });

      $scope.close = function () {
        $modalInstance.dismiss('close');
      };
    }]);
