angular.module('gsApp.workspaces.maps', [
  'gsApp.workspaces.maps.new',
  'gsApp.alertpanel',
  'ngSanitize'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.maps', {
        url: '/maps',
        templateUrl: '/workspaces/detail/maps.tpl.html',
        controller: 'WorkspaceMapsCtrl'
      });
    }])
.controller('WorkspaceMapsCtrl', ['$scope', '$state', '$stateParams',
  '$sce', '$window', '$modal', '$log', 'GeoServer',
    function($scope, $state, $stateParams, $sce, $window, $modal, $log,
      GeoServer) {

      var workspace = $scope.workspace;
      $scope.thumbnails = {};
      $scope.olmaps = {};

      GeoServer.maps.get(workspace).then(
        function(result) {
          if (result.success) {
            $scope.maps = result.data;
            // load all map thumbnails & metadata
            for (var i=0; i < $scope.maps.length; i++) {
              var map = $scope.maps[i];
              var layers = '';

              $scope.maps[i].workspace = workspace;
              $scope.maps[i].layergroupname = workspace + ':' + map.name;
              var bbox = $scope.maps[i].bbox = '&bbox=' + map.bbox.west +
               ',' + map.bbox.south + ',' + map.bbox.east + ',' +
               map.bbox.north;

              var url = GeoServer.map.thumbnail.get(map.workspace,
                map.layergroupname, 250, 250);
              var srs = '&srs=' + map.proj.srs;

              $scope.thumbnails[map.name] = url + bbox +
                '&format=image/png' + srs;
            }
          } else {
            $scope.alerts = [{
              type: 'warning',
              message: 'Unable to load workspace maps.',
              fadeout: true
            }];
          }
        });

      $scope.sanitizeHTML = function(description) {
        return $sce.trustAsHtml(description);
      };

      $scope.newOLWindow = function(map) {
        var baseUrl = GeoServer.map.openlayers.get(map.workspace,
          map.name, map.bbox, 800, 500);
        $window.open(baseUrl);
      };

      $scope.onEdit = function(map) {
        $state.go('map.compose', {
          workspace: map.workspace,
          name: map.name
        });
      };

      $scope.addNewMap = function() {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/map.new.tpl.html',
          controller: 'WorkspaceNewMapCtrl',
          size: 'md',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            maps: function() {
              return $scope.maps;
            }
          }
        });
      };
    }]);