/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.maps', [
  'gsApp.modals.maps.new',
  'gsApp.workspaces.maps.settings',
  'gsApp.workspaces.maps.delete',
  'gsApp.alertpanel',
  'gsApp.editor.map',
  'gsApp.core.utilities',
  'gsApp.olexport',
  'ngSanitize'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.maps', {
        url: '/maps',
        templateUrl: '/workspaces/detail/maps/maps.tpl.html',
        controller: 'WorkspaceMapsCtrl',
        abstract: true
      });
      $stateProvider.state('workspace.maps.main', {
        url: '/',
        views: {
          'maps': {
            templateUrl: '/workspaces/detail/maps/maps.main.tpl.html',
            controller: 'MapsMainCtrl',
          }
        }
      });
    }])
.controller('WorkspaceMapsCtrl', ['$scope', '$state', '$stateParams',
  '$sce', '$window', '$log', 'GeoServer', 'AppEvent', 'mapsListModel',
  '$timeout', '$modal', '$rootScope', 'storesListModel',
  'layersListModel',
    function($scope, $state, $stateParams, $sce, $window, $log,
      GeoServer, AppEvent, mapsListModel, $timeout, $modal,
      $rootScope, storesListModel, layersListModel) {

      $scope.workspace = $stateParams.workspace;
      $scope.thumbnails = {};
      $scope.olmaps = {};

      $timeout(function() {
        if ($scope.$parent && $scope.$parent.tabs) {
          $scope.$parent.tabs[0].active = true;
        }
      }, 300);

      $scope.mapThumbsWidth = 175;
      $scope.mapThumbsHeight = 175;

      function thumbnailize() {
        // load all map thumbnails & metadata
        var retina = $window.devicePixelRatio > 1;

        for (var i=0; i < $scope.maps.length; i++) {
          var map = $scope.maps[i];
          $scope.maps[i].workspace = $scope.workspace;
          var url = GeoServer.map.thumbnail.get(map.workspace,
            map.name) + '?t='+(new Date()).getTime();
          if (retina) {
            url = url + '&hiRes=true';
          }
          $scope.thumbnails[map.name] = url;
        }
      }

      $scope.opts = {
        paging: {
          pageSizes: [25, 50, 100],
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

      $scope.serverRefresh = function() {
        var opts = $scope.opts;

        return mapsListModel.fetchMaps(
          $scope.workspace,
          opts.paging.currentPage,
          opts.paging.pageSize,
          opts.sort.predicate + ':' + opts.sort.order,
          opts.filter.filterText
        ).then(function() {
          $scope.maps = mapsListModel.getMaps();
          $scope.totalItems = mapsListModel.getTotalServerItems();
          if (!$scope.maps) {
            return;
          }
          thumbnailize();
        });
      };

      $scope.mapsLoading = true;
      $scope.serverRefresh().then(function() {
        $scope.mapsLoading = false;
      });

      var refreshTimer = null;
      $scope.refreshMaps = function() {
        if (refreshTimer) {
          $timeout.cancel(refreshTimer);
        }
        refreshTimer = $timeout(function() {
          $scope.serverRefresh();
        }, 800);
      };

      $scope.mapsHome = function() {
        if (!$state.is('workspace.maps.main')) {
          $state.go('workspace.maps.main', {workspace:$scope.workspace});
        }
      };

      // Get stores and layers to see what modal to provide
      // when user attempts to create a map
      storesListModel.fetchStores($scope.workspace).then(
        function() {
          $scope.datastores = storesListModel.getStores();
        });
      layersListModel.fetchLayers($scope.workspace).then(
        function() {
          $scope.layers = layersListModel.getLayers();
        });

      $scope.createMap = function() {

        if ($scope.layers && $scope.layers.length===0) {
          if (! $scope.datastores.length) {
            var nostores_modal = $modal.open({
              templateUrl: '/components/modalform/map/nostores.tpl.html',
              controller: function($scope, $modalInstance) {
                $scope.close = function() {
                  $modalInstance.close('close');
                };
              },
              backdrop: 'static',
              size: 'md'
            });
          } else {
            var nolayer_modal = $modal.open({
              templateUrl: '/components/modalform/map/nolayers.tpl.html',
              controller: function($scope, $modalInstance) {
                $scope.close = function() {
                  $modalInstance.close('close');
                };
              },
              backdrop: 'static',
              size: 'md'
            });
          }
          return;
        }
        var createModalInstance = $modal.open({
          templateUrl: '/components/modalform/map/map.new.tpl.html',
          controller: 'NewMapCtrl',
          backdrop: 'static',
          size: 'lg',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            mapInfo: function() {
              return null;
            }
          }
        }).result.then(function (result) {
          if (!result) {
            $state.go('workspace.maps.main')
          }
        });
      };

      $scope.$on(AppEvent.CreateNewMap, function() {
        $scope.createMap();
      });

      $scope.$on(AppEvent.MapUpdated, function(scope, map) {
        // Update thumbnail if name changed
        if (map && map.new) {
          var _new = map.new;
          var _original = map.original;

          for (var i=0; i < $scope.maps.length; i++) {
            if (angular.equals($scope.maps[i], _original)) {
              $scope.maps[i] = angular.copy(_new);
            }
          }
        }
      });

      $scope.$watch('opts', function(newVal, oldVal) {
        if (newVal && newVal !== oldVal) {
          $scope.serverRefresh();
        }
      }, true);
    }])
.controller('MapsMainCtrl',
    function($scope, $state, $stateParams, $sce, $window, $log,
      GeoServer, $modal, $rootScope, AppEvent, _, mapsListModel,
      OlExport) {

      $scope.workspace = $stateParams.workspace;

      $scope.sortBy = function(pred) {
        var sort = $scope.opts.sort;
        if (pred === sort.predicate) { // flip order if selected same
          sort.order = sort.order === 'asc' ? 'desc' : 'asc';
        } else { // default to 'asc' order when switching
          sort.predicate = pred;
          sort.order = 'asc';
        }
        $scope.refreshMaps();
      };

      $scope.sanitizeHTML = function(description) {
        return $sce.trustAsHtml(description);
      };

      $scope.newOLWindow = function(map) {
        var baseUrl = GeoServer.map.openlayers.get(
          map.workspace, map.name, 800, 500);
        $window.open(baseUrl);
      };

      $scope.editMapSettings = function(map) {
        var modalInstance = $modal.open({
          templateUrl: '/components/modalform/map/map.settings.tpl.html',
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

      //TODO: Push modal to own controller/scope? 
      $scope.generateMapSrc = function(map) {
        OlExport.wrapHtml(
          OlExport.fromMapObj(map))
          .then(function(src) {
            $scope.ol3src = src;
            $modal.open({
              templateUrl: '/workspaces/detail/maps/maps.modal.export.tpl.html',
              scope: $scope
            });
          });
      };

      $scope.preview = function() {
        $window.open().document.write($scope.ol3src);
      };

      $scope.deleteMap = function(map) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/maps/maps.modal.delete.tpl.html',
          controller: 'MapDeleteCtrl',
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
          $scope.totalItems = maps.length;
          mapsListModel.setMaps(maps);
        }
      });
      $rootScope.$on(AppEvent.MapAdded, function(scope, map) {
        if (map) {
          mapsListModel.addMap(map);
          $scope.maps = mapsListModel.getMaps();
        }
      });
      $rootScope.$on(AppEvent.MapRemoved, function(scope, map) {
        if (map) {
          mapsListModel.removeMap(map);
          $scope.maps = mapsListModel.getMaps();
        }

      });

      $rootScope.$on(AppEvent.MapUpdated, function(scope, map) {
        // Update thumbnail if name changed
        if (map && map.new) {
          var _new = map.new;
          var _original = map.original;
          if (!_original || _new.name !== _original.name) {
            var retina = $window.devicePixelRatio > 1;
            var url = GeoServer.map.thumbnail.get(_new.workspace,
              _new.name) + '?t='+(new Date()).getTime();
            if (retina) {
              url = url + '&hiRes=true';
            }
            $scope.thumbnails[_new.name] = url;

            // remove old thumbnail
            if (_original) {
              $scope.thumbnails[_original.name] = null;
            }
          }
        }
      });
    })
.service('mapsListModel', function(GeoServer, _, $rootScope) {
  var _this = this;
  this.maps = null;
  this.totalServerItems = 0;

  this.getTotalServerItems = function() {
    return _this.totalServerItems;
  };

  this.getMaps = function() {
    return _this.maps;
  };

  this.setMaps = function(maps) {
    _this.maps = maps;
  };

  this.addMap = function(map) {
    if (!_this.maps) {
      _this.maps = [];
    }
    _this.maps.push(map);
  };

  this.removeMap = function(map) {
    if (!_this.maps) {
      _this.maps = [];
    }
    _.remove(this.maps, function(_map) {
      return _map.name == map.name;
    });
  };

  this.sortByTime = function(maps) {
    // sort by timestamp
    var sorted = _.sortBy(maps, function(map) {
      if (map.modified) {
        return map.modified.timestamp;
      }
    });
    return sorted.reverse();
  };

  this.fetchMaps = function(workspace, currentPage,
    pageSize, sort, filterText) {
    return GeoServer.maps.get(
      workspace,
      currentPage-1,
      pageSize,
      sort,
      filterText
    ).then(function(result) {
        if (result.success) {
          var maps = _.map(result.data.maps,
            function(map) {
              if (map.modified) {  // convert time strings to Dates
                return _.assign(map, {'modified': {
                  'timestamp': new Date(map.modified.timestamp),
                  'pretty': map.modified.pretty
                }});
              } else {
                return map;
              }
            });
          _this.totalServerItems = result.data.total;
          // sort by timestamp
          _this.setMaps(maps);
        } else {
          $rootScope.alerts = [{
            type: 'warning',
            message: 'Unable to load paged workspace maps: '+result.data.message,
            details: result.data.trace,
            fadeout: true
          }];
        }
      });
  };
});
