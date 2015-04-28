/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.layers', [
  'gsApp.workspaces.layers.settings',
  'gsApp.workspaces.layers.import',
  'gsApp.workspaces.layers.duplicate',
  'gsApp.workspaces.layers.addtomap',
  'gsApp.alertpanel',
  'gsApp.core.utilities',
  'ngSanitize',
  'ui.scrollfix'
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
.controller('WorkspaceLayersCtrl', function($scope, $state, $stateParams,
  $anchorScroll, AppEvent, layersListModel, $timeout) {

      $scope.workspace = $stateParams.workspace;

      $timeout(function() {
        if ($scope.$parent && $scope.$parent.tabs) {
          $scope.$parent.tabs[1].active = true;
        }
      }, 300);

      $scope.lyrThumbsWidth = 75;
      $scope.lyrThumbsHeight = 75;

      $scope.opts = {
        paging: {
          pageSize: 25,
          currentPage: 1
        },
        sort: {
          predicate: 'name',
          order: 'asc'
        },
        filter: {
          filterText: ''
        }
      };

      $scope.sortBy = function(pred) {
        var sort = $scope.opts.sort;
        if (pred === sort.predicate) { // flip order if selected same
          sort.order = sort.order === 'asc' ? 'desc' : 'asc';
        } else { // default to 'asc' order when switching
          sort.predicate = pred;
          sort.order = 'asc';
        }
      };

      $scope.serverRefresh = function() {
        var opts = $scope.opts;
        return layersListModel.fetchLayers(
          $scope.workspace,
          opts.paging.currentPage,
          opts.paging.pageSize,
          opts.sort.predicate + ':' + opts.sort.order,
          opts.filter.filterText
        ).then(function() {
          $scope.layers = layersListModel.getLayers();
          $scope.totalItems = layersListModel.getTotalServerItems();
        });
      };

      $scope.serverRefresh();

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

      $scope.$watch('opts', function(newVal, oldVal) {
        if (newVal != null && newVal !== oldVal) {
          $scope.serverRefresh();
        };
      }, true);

    })
.controller('LayersMainCtrl', function($scope, $state, $stateParams,
  GeoServer, $modal, $rootScope, AppEvent, _, mapsListModel,
      layersListModel, $timeout, $location, $anchorScroll) {

      $scope.layerSelections = [];

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
        $timeout(function() {
          $rootScope.$broadcast(AppEvent.ImportData, {
            workspace: $scope.workspace
          });
        }, 250);
        // go to this state to initiate listener for broadcast above!
        $state.go('workspace.data.main', {workspace: $scope.workspace});
      };

      $scope.setMap = function(map) {
        $scope.selectedMap = map;
      };

      $scope.toggleSelected = function(layer) {
        if (layer != null) {
          var found = false;
          for (var i=0; i < $scope.layerSelections.length; i++) {
            if ($scope.layerSelections[i].name===layer.name) {
              $scope.layerSelections.splice(i,1);
              found = true;
            }
          }
          if (!found) {
            $scope.layerSelections.push(layer);
          }
        }
      };

      $scope.addSelectedToMap = function() {
        var map = $scope.selectedMap;
        var mapInfo = {
          'name': map.name,
          'proj': map.proj,
          'description': map.description
        };
        mapInfo.layers = [];
        _.forEach($scope.layerSelections, function(layer) {
          mapInfo.layers.push({
            'name': layer.name,
            'workspace': $scope.workspace
          });
        });

        // 1. Create New map from Layers tab - selected layers
        if (map.name==='Create New Map') {
          mapInfo.name = null;

          if (mapInfo.layers.length==0) {
            $rootScope.alerts = [{
                type: 'warning',
                message: 'Please import data and create a new Layer.' +
                  ' A map requires at least 1 layer.',
                fadeout: true
              }];
          } else {
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
          }
          return;
        }
        if (mapInfo.layers.length==0) {
          $rootScope.alerts = [{
            type: 'warning',
            message: 'Select layers to add to a map below.',
            fadeout: true
          }];
          return;
        }

        // 2. Create New map - possible fr. other states - no selected layers
        GeoServer.map.layers.add($scope.workspace, mapInfo.name,
          mapInfo.layers).then(function(result) {
            if (result.success) {
              $rootScope.alerts = [{
                type: 'success',
                message: mapInfo.layers.length +
                  ' layer(s) added to ' + mapInfo.name +
                  ', now with ' + result.data.length + ' total.',
                fadeout: true
              }];
              mapsListModel.addMap(result.data);
              $state.go('map.compose', {workspace: map.workspace,
                name: mapInfo.name});
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
          $scope.totalItems = layers.length;
        }
      });

      $rootScope.$on(AppEvent.LayerAdded, function(scope, layer) {
        if (layer) {
          if (layersListModel.getLayers()) {
            layersListModel.addLayer(layer);
            $scope.layers =
              layersListModel.sortByTime(layersListModel.getLayers());
          } else {
            layersListModel.fetchLayers($scope.workspace).then(
              function() {
                layersListModel.add(layer);
                $scope.layers =
                layersListModel.sortByTime(layersListModel.getLayers());
              });
          }
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

    })
.service('layersListModel', function(GeoServer, _, $rootScope,
  $window) {
  var _this = this;
  this.layers = null;
  this.totalServerItems = 0;

  this.thumbnailize = function(layer) {
    var retina = $window.devicePixelRatio > 1;
    var url = GeoServer.layers.thumbnail.get(layer.workspace,
      layer.name);
    if (retina) {
      url = url + '?hiRes=true';
    }
    layer.thumbnail = url;
  };

  this.getTotalServerItems = function() {
    return _this.totalServerItems;
  };

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

  this.fetchLayers = function(workspace, currentPage,
    pageSize, sort, filterText) {
    if (currentPage) {
      currentPage = currentPage - 1;
    }
    return GeoServer.layers.get(
      workspace,
      currentPage,
      pageSize,
      sort,
      filterText
    ).then(function(result) {
        if (result.success) {
          var layers = _.map(result.data.layers,
            function(layer) {
              _this.thumbnailize(layer);
              if (layer.modified) {  // convert time strings to Dates
                return _.assign(layer, {'modified': {
                  'timestamp': new Date(layer.modified.timestamp),
                  'pretty': layer.modified.pretty
                }});
              } else {
                return layer;
              }
            });
          _this.totalServerItems = result.data.total;
          // sort by timestamp
          _this.setLayers(_this.sortByTime(layers));
        } else {
          $rootScope.alerts = [{
            type: 'warning',
            message: 'Unable to load paged workspace layers.',
            fadeout: true
          }];
        }
      });
  };
});
