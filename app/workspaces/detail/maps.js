angular.module('gsApp.workspaces.maps', [
  'gsApp.workspaces.maps.new',
  'gsApp.workspaces.maps.settings',
  'gsApp.alertpanel',
  'gsApp.core.utilities',
  'ngSanitize'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.maps', {
        url: '/maps',
        templateUrl: '/workspaces/detail/maps.tpl.html',
        controller: 'WorkspaceMapsCtrl',
        abstract: true
      });
      $stateProvider.state('workspace.maps.main', {
        url: '/',
        templateUrl: '/workspaces/detail/maps/maps.main.tpl.html',
        controller: 'MapsMainCtrl'
      });
      $stateProvider.state('workspace.maps.new', {
        url: '/new',
        templateUrl: '/workspaces/detail/maps/createnew/map.new.tpl.html',
        controller: 'NewMapCtrl'
      });
    }])
.controller('WorkspaceMapsCtrl', ['$scope', '$state', '$stateParams',
  '$sce', '$window', '$log', 'GeoServer', 'AppEvent', 'mapsListModel',
  '$timeout',
    function($scope, $state, $stateParams, $sce, $window, $log,
      GeoServer, AppEvent, mapsListModel, $timeout) {

      $scope.workspace = $stateParams.workspace;
      $scope.thumbnails = {};
      $scope.olmaps = {};

      $timeout(function() {
        if ($scope.$parent.tabs) {
          $scope.$parent.tabs[0].active = true;
        }
      }, 300);

      $scope.mapThumbsWidth = 175;
      $scope.mapThumbsHeight = 175;

      GeoServer.maps.get($scope.workspace).then(
        function(result) {
          if (result.success) {
            $scope.maps = result.data;
            mapsListModel.setMaps(result.data);

            // load all map thumbnails & metadata
            for (var i=0; i < $scope.maps.length; i++) {
              var map = $scope.maps[i];
              var layers = '';
              $scope.maps[i].workspace = $scope.workspace;
              $scope.maps[i].layergroupname = $scope.workspace + ':' + map.name;
              var bbox = $scope.maps[i].bboxString = '&bbox=' + map.bbox.west +
               ',' + map.bbox.south + ',' + map.bbox.east + ',' +
               map.bbox.north;
              var url = GeoServer.map.thumbnail.get(map.workspace,
                map.layergroupname, $scope.mapThumbsWidth,
                  $scope.mapThumbsHeight);
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

      $scope.mapsHome = function() {
        if (!$state.is('workspace.maps.main')) {
          $state.go('workspace.maps.main', {workspace:$scope.workspace});
        }
      };

      $scope.createMap = function() {
        $state.go('workspace.maps.new', {workspace:$scope.workspace});
      };
      $scope.$on(AppEvent.CreateNewMap, function() {
        $scope.createMap();
      });

    }])
.controller('MapsMainCtrl', ['$scope', '$state', '$stateParams', '$sce',
  '$window', '$log', 'GeoServer', '$modal', '$rootScope', 'AppEvent', '_',
    function($scope, $state, $stateParams, $sce, $window, $log,
      GeoServer, $modal, $rootScope, AppEvent, _) {

      $scope.workspace = $stateParams.workspace;

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

      $scope.editMapSettings = function(map) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/map.settings.tpl.html',
          controller: 'EditMapSettingsCtrl',
          backdrop: 'static',
          size: 'md',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            map: function() {
              return map;
            }
          }
        });
      };

      $rootScope.$on(AppEvent.MapsAllUpdated, function(scope, maps) {
        if (maps) {
          $scope.maps = maps;
        }
      });

      $rootScope.$on(AppEvent.MapUpdated, function(scope, maps) {
        // Update thumbnail if name changed
        var _new = maps.new;
        var _original = maps.original;
        if (!_original || _new.name !== _original.name) {
          var url = GeoServer.map.thumbnail.get(_new.workspace,
            _new.layergroupname, $scope.mapThumbsWidth, $scope.mapThumbsHeight);
          var bbox;
          if (_new.bboxString) {
            bbox = _new.bboxString;
          } else {
            bbox = '&bbox=' + _new.bbox.west + ',' + _new.bbox.south + ',' +
              _new.bbox.east + ',' + _new.bbox.north;
          }

          $scope.thumbnails[_new.name] = url + bbox +
            '&format=image/png' + '&srs=' + _new.proj.srs;

          // remove old thumbnail
          if (_original) {
            $scope.thumbnails[_original.name] = null;
          }
        }

      });
    }])
.service('mapsListModel', function(GeoServer) {
  var _this = this;
  this.maps = null;

  this.getMaps = function() {
    return this.maps;
  };

  this.setMaps = function(maps) {
    this.maps = maps;
  };

  this.addMap = function(map) {
    this.maps.push(map);
  };

  this.fetchMaps = function(workspace) {
    return GeoServer.maps.get(workspace).then(
      function(result) {
        if (result.success) {
          _this.setMaps(result.data);
        }
      });
  };
});
