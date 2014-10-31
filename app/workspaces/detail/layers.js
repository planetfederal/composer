angular.module('gsApp.workspaces.layers', [
  'gsApp.workspaces.layers.settings',
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
  '$sce', '$window', '$log', 'GeoServer', 'AppEvent', 'layersListModel',
    function($scope, $state, $stateParams, $sce, $window, $log,
      GeoServer, AppEvent, layersListModel) {

      $scope.workspace = $stateParams.workspace;
      $scope.thumbnails = {};

      $scope.layerThumbsWidth = 175;
      $scope.layerThumbsHeight = 175;

      GeoServer.layers.get($scope.workspace).then(
        function(result) {
          if (result.success) {
            var layers = result.data.layers;
            layersListModel.setLayers(layers);
            $scope.layers = layers;
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
  'AppEvent', '_', 'mapsListModel',
    function($scope, $state, $stateParams, $sce, $window, $log,
      GeoServer, $modal, $rootScope, AppEvent, _, mapsListModel) {

      $scope.workspace = $stateParams.workspace;
      mapsListModel.fetchMaps($scope.workspace).then(function() {
        $scope.maps = mapsListModel.getMaps();
      });

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

      $scope.createLayer = function() {
        $state.go('workspace.data.import.file', {
          workspace: $scope.workspace
        });
      };

      $scope.setMap = function(map) {
        $scope.selectedMap = map;
      };

      $scope.addSelectedToMap = function() {
        var map = $scope.selectedMap;
        var mapInfo = {
          'name': map.name,
          'proj': map.proj,
          'description': map.description
        };
        mapInfo.layers = [];
        for (var k=0; k < $scope.layers.length; k++) {
          var layer = $scope.layers[k];
          if (layer.selected) {
            mapInfo.layers.push({
              'name': layer.name,
              'workspace': $scope.workspace
            });
          }
        }
        GeoServer.map.layers.add($scope.workspace, mapInfo.name,
          mapInfo.layers).then(function(result) {
            if (result.success) {
              $rootScope.alerts = [{
                type: 'success',
                message: result.data.length + ' layer(s) added to map ' +
                  mapInfo.name + '.',
                fadeout: true
              }];
              mapsListModel.addMap(result.data);
             // $state.go('map.compose', {workspace: map.workspace,
              //  name: mapInfo.name});
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Layer(s) could not be added to map ' +
                  mapInfo.name + '.',
                fadeout: true
              }];
            }
          });
      };

      $rootScope.$on(AppEvent.LayersAllUpdated, function(scope, layers) {
        if (layers) {
          $scope.layers = layers;
        }
      });

    }])
.service('layersListModel', function(GeoServer, _) {
  var _this = this;
  this.layers = null;

  this.getLayers = function() {
    return this.layers;
  };

  this.setLayers = function(layers) {
    this.layers = layers;
  };

  this.addLayer = function(layer) {
    this.layers.push(layer);
  };

  this.removeLayer = function(layer) {
    _.remove(_this.layers, function(_layer) {
      return _layer.name === layer.name;
    });
  };

  this.fetchLayers = function(workspace) {
    GeoServer.layers.get(workspace).then(
      function(result) {
        if (result.success) {
          _this.setLayers(result.data);
        }
      });
  };
});
