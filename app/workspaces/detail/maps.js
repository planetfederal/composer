/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
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
      }

      $scope.currentPage = 1;
      $scope.pagingOptions = {
        pageSizes: [25, 50, 100],
        pageSize: 25,
        currentPage: 1
      };
      $scope.filterOptions = {
          filterText: ''
        };
      $scope.sortOptions = '';

      $scope.serverRefresh = function() {
        // only use paging if many layers on server
        if ($scope.totalItems > $scope.pagingOptions.pageSize) {
          mapsListModel.fetchPagedMaps(
            $scope.workspace,
            $scope.pagingOptions.currentPage,
            $scope.pagingOptions.pageSize,
            $scope.sortOptions,
            $scope.filterOptions.filterText
          ).then(function() {
              $scope.maps = mapsListModel.getMaps();
              $scope.totalItems = mapsListModel.getTotalServerItems();
              if (!$scope.maps) {
                return;
              }
              thumbnailize();
            });
        } else {
          mapsListModel.fetchMaps($scope.workspace).then(
            function() {
              $scope.maps = mapsListModel.getMaps();
              $scope.totalItems = mapsListModel.getTotalServerItems();
              if (!$scope.maps) {
                return;
              }
              thumbnailize();
            });
        }
      };
      $scope.serverRefresh();

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
              templateUrl: '/workspaces/detail/modals/nostores.tpl.html',
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
              templateUrl: '/workspaces/detail/modals/nolayers.tpl.html',
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
          templateUrl: '/workspaces/detail/maps/createnew/map.new.tpl.html',
          controller: 'NewMapCtrl',
          backdrop: 'static',
          size: 'lg',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            maps: function() {
              return $scope.maps;
            }
          }
        }).result.then(function(response) {
          if (response.importOrClose==='import') {
            var mapInfo = response.mapInfo;
            $timeout(function() {
              $rootScope.$broadcast(AppEvent.ImportData, {
                mapInfo: mapInfo,
                workspace: $scope.workspace
              });
            }, 250);
            // go to this state to initiate listener for broadcast above!
            $state.go('workspace.data.import', {workspace: $scope.workspace});
          }
        });
      };

      $scope.$on(AppEvent.CreateNewMap, function() {
        $scope.createMap();
      });

    }])
.controller('MapsMainCtrl', ['$scope', '$state', '$stateParams', '$sce',
  '$window', '$log', 'GeoServer', '$modal', '$rootScope', 'AppEvent', '_',
  'mapsListModel',
    function($scope, $state, $stateParams, $sce, $window, $log,
      GeoServer, $modal, $rootScope, AppEvent, _, mapsListModel) {

      $scope.workspace = $stateParams.workspace;

      $scope.$watch('predicate', function(newVal, oldVal) {
        if (newVal && newVal !== oldVal) {
          var sortOrder = ':asc';
          if (newVal === 'modified.timestamp') {
            sortOrder = ':desc';
          }
          $scope.sortOptions = newVal + sortOrder;
        }
        $scope.refreshMaps();
      });

      $scope.$watch('pagingOptions.currentPage', function(newVal) {
        if (newVal != null) {
          $scope.refreshMaps();
        }
      });

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
          $scope.totalItems = maps.length;
          mapsListModel.setMaps(maps);
        }
      });
      $rootScope.$on(AppEvent.MapAdded, function(scope, map) {
        if (map) {
          mapsListModel.addMap(map);
          $scope.maps =
            mapsListModel.sortByTime(mapsListModel.getMaps());
        }
      });

      $rootScope.$on(AppEvent.MapSettingsUpdated, function(scope, maps) {
        // Update thumbnail if name changed
        if (maps && maps.new) {
          var _new = maps.new;
          var _original = maps.original;
          if (!_original || _new.name !== _original.name) {
            var url = GeoServer.map.thumbnail.get(_new.workspace,
              _new.layergroupname, $scope.mapThumbsWidth,
              $scope.mapThumbsHeight);
            var bbox;
            if (_new.bboxString) {
              bbox = _new.bboxString;
            } else {
              bbox = '&bbox=' + _new.bbox.west + ',' + _new.bbox.south +
                ',' + _new.bbox.east + ',' + _new.bbox.north;
            }

            $scope.thumbnails[_new.name] = url + bbox +
              '&format=image/png' + '&srs=' + _new.proj.srs;

            // remove old thumbnail
            if (_original) {
              $scope.thumbnails[_original.name] = null;
            }
          }
        }
      });
    }])
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

  this.sortByTime = function(maps) {
    // sort by timestamp
    var sorted = _.sortBy(maps, function(map) {
      if (map.modified) {
        return map.modified.timestamp;
      }
    });
    return sorted.reverse();
  };

  this.fetchMaps = function(workspace) {
    return GeoServer.maps.get(workspace).then(
      function(result) {
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
          _this.setMaps(_this.sortByTime(maps));
        } else {
          $rootScope.alerts = [{
            type: 'warning',
            message: 'Unable to load workspace maps.',
            fadeout: true
          }];
        }
      });
  };

  this.fetchPagedMaps = function(workspace, currentPage,
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
          _this.setMaps(_this.sortByTime(maps));
        } else {
          $rootScope.alerts = [{
            type: 'warning',
            message: 'Unable to load paged workspace maps.',
            fadeout: true
          }];
        }
      });
  };
});
