/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
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
        // 'directory' vs. 'directory of shapefiles'
        if (format.name.indexOf('directory') > -1) {
          return (resource.format.toLowerCase().indexOf('directory') > -1);
        }
        return resource.format.toLowerCase()===format.name;
      });

      $scope.close = function () {
        $modalInstance.dismiss('close');
      };
    }]);
