angular.module('gsApp.workspaces.maps.new', [
  'ngSanitize',
  'gsApp.alertpanel'
])
.controller('WorkspaceNewMapCtrl', ['workspace', '$scope',
  '$modalInstance', 'GeoServer',
  function (workspace, $scope, $modalInstance, GeoServer) {

    $scope.workspace = workspace;
    $scope.mapInfo = {};
    $scope.newMap = {};

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


    $scope.createMap = function(isValid) {
      if (isValid) {
        GeoServer.map.create(workspace, $scope.mapInfo).then(
          function(result) {
            if (result.success) {
              //console.log(result.data)
            } else {
              $scope.alerts = [{
                type: 'warning',
                message: 'Feature yet to be implemented.',
                fadeout: true
              }];
            }
          });
      }
      $modalInstance.close();
    };
  }]);
