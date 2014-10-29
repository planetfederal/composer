angular.module('gsApp.workspaces.layers', [
  'gsApp.workspaces.layers.settings',
  'gsApp.workspaces.layers.type',
  'gsApp.alertpanel',
  'gsApp.core.utilities',
  'ngSanitize'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.layers', {
        url: '/layers',
        templateUrl: '/workspaces/detail/layers.tpl.html',
        controller: 'WorkspaceLayersCtrl',
        abstract: true
      });
      $stateProvider.state('workspace.layers.main', {
        url: '/',
        templateUrl: '/workspaces/detail/layers/layers.main.tpl.html',
        controller: 'LayersMainCtrl'
      });
    }])
.controller('WorkspaceLayersCtrl', ['$scope', '$state', '$stateParams',
  '$sce', '$window', '$log', 'GeoServer', 'AppEvent',
    function($scope, $state, $stateParams, $sce, $window, $log,
      GeoServer, AppEvent) {

      $scope.workspace = $stateParams.workspace;
      $scope.thumbnails = {};

      $scope.layerThumbsWidth = 175;
      $scope.layerThumbsHeight = 175;

      GeoServer.layers.get($scope.workspace).then(
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
.controller('LayersMainCtrl', ['$scope', '$state', '$stateParams',
  '$sce', '$window', '$log', 'GeoServer', '$modal', '$rootScope',
  'AppEvent', '_',
    function($scope, $state, $stateParams, $sce, $window, $log,
      GeoServer, $modal, $rootScope, AppEvent, _) {

      $scope.workspace = $stateParams.workspace;

      $scope.showAttrs = function(layerOrResource, attributes) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/data.attributes.tpl.html',
          controller: 'WorkspaceAttributesCtrl',
          size: 'md',
          resolve: {
            layerOrResource: function() {
              return layerOrResource;
            },
            attributes: function() {
              return attributes;
            }
          }
        });
      };

      $scope.editLayerSettings = function(layer) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/layer.settings.tpl.html',
          controller: 'EditLayerSettingsCtrl',
          backdrop: 'static',
          size: 'md',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            layer: function() {
              return layer;
            }
          }
        });
      };

      // Get Formats Info
      $scope.formats = {
        'vector': [],
        'raster': [],
        'service': []
      };
      GeoServer.formats.get().then(
        function(result) {
          if (result.success) {
            var formats = result.data;
            for (var i=0; i < formats.length; i++) {
              $scope.formats[formats[i].kind.toLowerCase()].push(formats[i]);
            }
          }
      });

      $scope.layerType = function(layer) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/layer.type.tpl.html',
          controller: 'LayerTypeInfoCtrl',
          backdrop: 'static',
          size: 'md',
          resolve: {
            formats: function() {
              return $scope.formats;
            },
            layer: function() {
              return layer;
            },

          }
        });
      };

      $rootScope.$on(AppEvent.MapsAllUpdated, function(scope, maps) {
        if (maps) {
          $scope.maps = maps;
        }
      });

      $rootScope.$on(AppEvent.MapUpdated, function(scope, maps) {
        // Update thumbnail if name chanaged
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
    }]);
