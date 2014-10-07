angular.module('gsApp.workspaces.workspace.maps', [
  'gsApp.alertpanel',
  'ngSanitize'
])
.controller('WorkspaceMapsCtrl', ['$scope', '$stateParams', 'GeoServer',
  '$log', '$sce', 'baseUrl', '$window', '$state', '$location', '$modal',
  '$rootScope', 'AppEvent',
    function($scope, $stateParams, GeoServer, $log, $sce, baseUrl,
      $window, $state, $location, $modal, $rootScope, AppEvent) {

      var workspace = $scope.workspace;

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

              var url = GeoServer.map.thumbnail.get(map.workspace, map,
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
          templateUrl: '/workspaces/detail/modals/newmap-modal.tpl.html',
          controller: 'NewMapModalCtrl',
          size: 'md',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            geoserver: function() {
              return GeoServer;
            },
            maps: function() {
              return $scope.maps;
            }
          }
        });
      };
    }]);
