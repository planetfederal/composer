angular.module('gsApp.workspaces.layers', [
  'gsApp.core.utilities',
  'gsApp.alertpanel',
  'ngSanitize'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.layers', {
        url: '/layers?layer',
        templateUrl: '/workspaces/detail/layers.tpl.html',
        controller: 'WorkspaceLayersCtrl'
      });
    }])
.controller('WorkspaceLayersCtrl', ['$scope', '$rootScope', '$state',
  '$stateParams', '$modal', '$window', '$log', 'GeoServer',
    function($scope, $rootScope, $state, $stateParams, $modal, $log, $window,
      GeoServer) {

      var workspace = $scope.workspace;

      // Set stores list to window height
      $scope.layersListHeight = {'height': $window.innerHeight-250};

      GeoServer.layers.get($scope.workspace).then(
        function(result) {
          if (result.success) {
            $scope.layers = result.data.layers;
          } else {
            $scope.alerts = [{
              type: 'warning',
              message: 'Could not get layers in workspace ' +
                $scope.workspace + '.',
              fadeout: true
            }];
          }
        });

      $scope.selectLayer = function(layer) {
        $scope.selectedLayer = layer;
        GeoServer.layer.get($scope.workspace, layer.name).then(
        function(result) {
          if (result.success) {
            $scope.selectedLayer = result.data;
            $scope.selectedLayer.thumbnail =
            GeoServer.map.thumbnail.get($scope.workspace,
              layer.name, 120, 120) + '&format=image/png';
          } else {
            $rootScope.alerts = [{
              type: 'warning',
              message: 'Details for layer ' + layer.name +
                ' could not be loaded.',
              fadeout: true
            }];
          }
        });
      };

      if ($stateParams.layer) {
        $scope.selectLayer($stateParams.layer);
      }
    }]);
