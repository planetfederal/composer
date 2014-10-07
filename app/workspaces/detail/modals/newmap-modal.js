angular.module('gsApp.workspaces.maps', [
  'ngSanitize',
  'gsApp.alertpanel'
])
.controller('NewMapModalCtrl', ['$scope', '$modalInstance', 'workspace',
  'geoserver', 'maps', '$timeout', '$sce', '$http',
  function ($scope, $modalInstance, workspace, geoserver, maps, $timeout,
   $sce, $http) {

    $scope.workspace = workspace;
    $scope.geoserver = geoserver;
    $scope.maps = maps;
    $scope.mapSettings = {};

    $scope.ok = function () {
      $modalInstance.close();
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };

    $scope.crsTooltip =
      '<h5>Add a projection in EPSG</h5>' +
      '<p>Coordinate Reference System (CRS) info is available at ' +
        '<a href="http://prj2epsg.org/search" target="_blank">' +
          'http://prj2epsg.org' +
        '</a>' +
      '</p>';

    $scope.createMap = function() {
      $scope.$parent.alerts = [{
          type: 'warning',
          message: 'Feature yet to be implemented.',
          fadeout: true
        }];
      $modalInstance.close();
    };
  }]);
