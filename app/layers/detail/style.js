angular.module('gsApp.layers.style', [
  'ui.codemirror',
  'gsApp.olmap',
  'gsApp.styleditor'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('layer.style', {
        url: '/style',
        templateUrl: '/layers/detail/style.tpl.html',
        controller: 'LayerStyleCtrl'
      });
    }])
.controller('LayerStyleCtrl', ['$scope', '$stateParams', 'GeoServer', '$log',
    function($scope, $stateParams, GeoServer, $log) {
      var wsName = $stateParams.workspace;
      var name = $stateParams.name;

      GeoServer.layer.get({ name: name, workspace: wsName }).$promise
        .then(function(layer) {
          $scope.layer = layer;
          $scope.layers = [layer];
          $scope.proj = layer.proj.srs;
          $scope.center = layer.bbox.native.center;
          $scope.zoom = 4;

          GeoServer.style.get(wsName, name).then(function(result) {
            $scope.style = result.data;
          });
        });

      $scope.refreshMap = function() {
        $scope.$broadcast('refresh');
      };
      $scope.saveStyle = function(content) {
        GeoServer.style.put(wsName, name, content).then(function(result) {
          $scope.refreshMap();
        });
      };
    }]);
