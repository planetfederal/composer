angular.module('gsApp.workspaces.layers', [
  'gsApp.workspaces.layers.settings',
  'gsApp.workspaces.layers.import',
  'gsApp.workspaces.layers.duplicate',
  'gsApp.workspaces.layers.addtomap',
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
  '$timeout',
    function($scope, $state, $stateParams, $sce, $window, $log,
      GeoServer, AppEvent, layersListModel, $timeout) {

      $scope.workspace = $stateParams.workspace;
      $scope.thumbnails = {};

      $scope.layerThumbsWidth = 175;
      $scope.layerThumbsHeight = 175;

      $timeout(function() {
        if ($scope.$parent && $scope.$parent.tabs) {
          $scope.$parent.tabs[1].active = true;
        }
      }, 300);

      layersListModel.fetchLayers($scope.workspace).then(
        function() {
          $scope.layers = layersListModel.getLayers();
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
  'AppEvent', '_', 'mapsListModel', 'layersListModel',
    function($scope, $state, $stateParams, $sce, $window, $log,
      GeoServer, $modal, $rootScope, AppEvent, _, mapsListModel,
      layersListModel) {

      $scope.workspace = $stateParams.workspace;
      mapsListModel.fetchMaps($scope.workspace).then(function() {
        $scope.maps = mapsListModel.getMaps();
        $scope.mapOptions = $scope.maps.concat(
          [{'name': 'Create New Map'}]);
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
        if (mapInfo.layers.length==0) {
          $rootScope.alerts = [{
            type: 'warning',
            message: 'Select layers to add to a map below.',
            fadeout: true
          }];
          return;
        }

        // 1. Create New map from Layers tab - selected layers
        if (map.name==='Create New Map') {
          mapInfo.name = null;
          var createNewMapModal = $modal.open({
            templateUrl:
              '/workspaces/detail/maps/createnew/map.new.fromselected.tpl.html',
            controller: 'NewMapFromSelectedCtrl',
            backdrop: 'static',
            size: 'lg',
            resolve: {
              workspace: function() {
                return $scope.workspace;
              },
              mapInfo: function() {
                return mapInfo;
              }
            }
          });
          return;
        }

        // 2. Create New map from anywhere - no selected layers
        GeoServer.map.layers.add($scope.workspace, mapInfo.name,
          mapInfo.layers).then(function(result) {
            if (result.success) {
              $rootScope.alerts = [{
                type: 'success',
                message: mapInfo.layers.length +
                  ' layers added to ' + mapInfo.name +
                  ', now with ' + result.data.length + ' total.',
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

      $rootScope.$on(AppEvent.LayerAdded, function(scope, layer) {
        if (layer) {
          layersListModel.addLayer(layer);
          $scope.layers =
            layersListModel.sortByTime(layersListModel.getLayers());
        }
      });

      var openPopoverLayer;
      $scope.closeLayerTPopovers = function(layer) {
        if (layer.title.length < 33) {
          return;
        }
        if (openPopoverLayer || openPopoverLayer===layer) {
          openPopoverLayer.layerTitle = false;
          openPopoverLayer = null;
        } else {
          layer.layerTitle = true;
          openPopoverLayer = layer;
        }
      };

      $scope.closeLayerNPopovers = function(layer) {
        if (layer.name.length < 33) {
          return;
        }
        if (openPopoverLayer || openPopoverLayer===layer) {
          openPopoverLayer.layerName = false;
          openPopoverLayer = null;
        } else {
          layer.layerName = true;
          openPopoverLayer = layer;
        }
      };

      $scope.copyToNewLayer = function(layer) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/layer.duplicate.tpl.html',
          controller: 'DuplicateLayerCtrl',
          size: 'md',
          resolve: {
            layer: function() {
              return layer;
            },
            workspace: function() {
              return $scope.workspace;
            }
          }
        });
      };

    }])
.service('layersListModel', function(GeoServer, _, $rootScope) {
  var _this = this;
  this.layers = null;

  this.getLayers = function() {
    return _this.layers;
  };

  this.setLayers = function(layers) {
    _this.layers = layers;
  };

  this.addLayer = function(layer) {
    _this.layers.push(layer);
  };

  this.removeLayer = function(layer) {
    _.remove(_this.layers, function(_layer) {
      return _layer.name === layer.name;
    });
  };

  this.sortByTime = function(layers) {
    // sort by timestamp
    var sorted = _.sortBy(layers, function(lyr) {
      if (lyr.modified) {
        return lyr.modified.timestamp;
      }
    });
    return sorted.reverse();
  };

  this.fetchLayers = function(workspace) {
    return GeoServer.layers.get(workspace).then(
      function(result) {
        if (result.success) {
          var layers = _.map(result.data.layers,
            function(layer) {
              if (layer.modified) {  // convert time strings to Dates
                return _.assign(layer, {'modified': {
                  'timestamp': new Date(layer.modified.timestamp),
                  'pretty': layer.modified.pretty
                }});
              } else {
                return layer;
              }
            });
          // sort by timestamp
          _this.setLayers(_this.sortByTime(layers));
        } else {
          $rootScope.alerts = [{
            type: 'warning',
            message: 'Unable to load workspace layers.',
            fadeout: true
          }];
        }
      });
  };
});
