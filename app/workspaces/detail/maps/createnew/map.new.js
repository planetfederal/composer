angular.module('gsApp.workspaces.maps.new', [
  'ngSanitize',
  'gsApp.alertpanel',
  'gsApp.projfield',
  'gsApp.core.utilities',
  'ui.select'
])
.controller('NewMapCtrl', ['$scope', '$state', '$stateParams', '$rootScope',
  '$log', 'GeoServer',
  function ($scope, $state, $stateParams, $rootScope, $log,
    GeoServer) {

    $scope.workspace = $stateParams.workspace;
    $scope.mapInfo = {
      'abstract': ''
    };
    $scope.layers = [];
    $scope.selectedLayers = [];
    $scope.newMap = {};
    $scope.map = {};
    $scope.title = 'New Map';
    $scope.step = 1;

    $scope.crsTooltip =
      '<h5>Add a projection in EPSG</h5>' +
      '<p>Coordinate Reference System (CRS) info is available at ' +
        '<a href="http://prj2epsg.org/search" target="_blank">' +
          'http://prj2epsg.org' +
        '</a>' +
      '</p>';

    $scope.loadLayers = function() {
      GeoServer.layers.getAll($scope.workspace).then(
        function(result) {
          if (result.success) {
            $scope.layers = result.data.layers;
          } else {
            $scope.alerts = [{
              type: 'danger',
              message: 'Unable to load workspace layers.',
              fadeout: true
            }];
          }
        });
    };
    $scope.loadLayers();

    $scope.addLayers = function() {
      $scope.step = 2;
    };

    $scope.cancel = function() {
      $state.go('workspace.maps.main', {workspace:$scope.workspace});
    };

    $scope.createMap = function() {
      $scope.mapInfo.layers = [];
      for (var i=0; i< $scope.map.layers.length; i++) {
        $scope.mapInfo.layers.push({
          'name': $scope.map.layers[i],
          'workspace': $scope.workspace
        });
      }
      $scope.map.layers = [];
      $log.log($scope.mapInfo);

      GeoServer.map.create($scope.workspace, $scope.mapInfo).then(
        function(result) {
          if (result.success) {
            $log.log(result.data);
          } else {
            $rootScope.alerts = [{
              type: 'danger',
              message: 'Could not create map.',
              fadeout: true
            }];
          }
        });
    };
  }]);
