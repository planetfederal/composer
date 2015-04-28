/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.data', [
  'gsApp.workspaces.data.delete',
  'gsApp.workspaces.data.update',
  'gsApp.workspaces.data.import',
  'gsApp.workspaces.formats.type',
  'gsApp.workspaces.data.attributes',
  'gsApp.workspaces.layers.import',
  'gsApp.core.utilities',
  'gsApp.alertpanel',
  'ngSanitize'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.data', {
        url: '/data',
        templateUrl: '/workspaces/detail/data.tpl.html',
        controller: 'WorkspaceDataCtrl',
        abstract: true
      });
      $stateProvider.state('workspace.data.main', {
        url: '/',
        views: {
          'data': {
            templateUrl: '/workspaces/detail/data/data.main.tpl.html',
            controller: 'DataMainCtrl',
          }
        }
      });
      $stateProvider.state('workspace.data.import', {
        url: '',
        templateUrl: '/workspaces/detail/data/import/import.tpl.html',
        controller: 'DataImportCtrl',
        params: { workspace: {} }
      });
    }])
.controller('WorkspaceDataCtrl', ['$scope', '$rootScope', '$state',
  '$stateParams', '$modal', '$window', '$log', 'GeoServer', '_',
  'AppEvent', '$timeout', 'storesListModel',
    function($scope, $rootScope, $state, $stateParams, $modal, $log,
      $window, GeoServer, _, AppEvent, $timeout, storesListModel) {

      var workspace;
      if ($scope.workspace) {
        workspace = $scope.workspace;
      } else if ($stateParams.workspace) {
        workspace = $stateParams.workspace;
      }

      // Set stores list to window height
      $scope.storesListHeight = {'height': $window.innerHeight-250};

      $timeout(function() {
        if ($scope.$parent && $scope.$parent.tabs) {
          $scope.$parent.tabs[2].active = true;
        }
      }, 300);

      $scope.getDataStores = function(workspace) {
        storesListModel.fetchStores($scope.workspace).then(
          function() {
            $scope.datastores = storesListModel.getStores();
            if ($scope.datastores && $scope.datastores.length > 0) {
              $scope.datastores.reverse();  // sorts by last added
              $scope.selectStore($scope.datastores[0]);
            }
          });
      };
      $scope.getDataStores($scope.workspace);

      $scope.storesHome = function() {
        if (!$state.is('workspace.data.main')) {
          $state.go('workspace.data.main', {workspace:$scope.workspace});
        }
      };

      $scope.selectStore = function(store) {
        if ($scope.selectedStore &&
              $scope.selectedStore.name===store.name) {
          return;
        }
        $scope.selectedStore = store;

        GeoServer.datastores.getDetails($scope.workspace, store.name).then(
          function(result) {
            if (result.success) {
              var storeData = result.data;
              $scope.selectedStore = storeData;
            } else {
              $rootScope.alerts = [{
                type: 'warning',
                message: 'Details for store ' + $scope.selectedStore.name +
                  ' could not be loaded.',
                fadeout: true
              }];
            }
          });
      };

      // for some reason modal below's being called twice without this lock
      $rootScope.importInitiated = false;

      $scope.importNewData = function(info) {
        var workspace = info.workspace;
        var mapInfo = info.mapInfo;

        if (!$scope.importInitiated) {
          $rootScope.importInitiated = true;
          $scope.mapInfo = mapInfo;
          var importModalInstance = $modal.open({
            templateUrl: '/workspaces/detail/data/import/import.tpl.html',
            controller: 'DataImportCtrl',
            backdrop: 'static',
            size: 'lg',
            resolve: {
              workspace: function() {
                return workspace;
              },
              mapInfo: function() {
                return $scope.mapInfo;
              }
            }
          }).result.then(function(param) {
            $rootScope.importInitiated = false;
            if (param != null) {
              $scope.selectStore(param);
            }
          });
        }
      };

      $rootScope.$on(AppEvent.ImportData, function(scope, info) {
        $scope.importNewData(info);
      });

      $rootScope.$on(AppEvent.StoreAdded, function(scope, workspace) {
        $scope.getDataStores(workspace);
      });

      $scope.addNewStore = function() {
        $state.go('workspace.data.import.file', {
          workspace: $scope.workspace
        });
      };

      $scope.storeRemoved = function(storeToRemove) {
        var index = _.findIndex($scope.datastores, function(ds) {
          return ds.name===storeToRemove.name;
        });
        if (index > -1) {
          $scope.datastores.splice(index, 1);
        }
        $scope.selectedStore = null;
      };

      $scope.deleteStore = function() {
        if (!$state.is('workspace.data.main')) {
          $state.go('workspace.data.main', {workspace:$scope.workspace});
        }
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/data.delete.tpl.html',
          controller: 'WorkspaceDeleteDataCtrl',
          backdrop: 'static',
          size: 'md',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            store: function() {
              return $scope.selectedStore;
            },
            storeRemoved: function() {
              return $scope.storeRemoved;
            }
          }
        });
      };
    }])
.controller('DataMainCtrl', ['$scope', '$rootScope', '$state',
  '$stateParams', '$modal', '$window', '$log', 'GeoServer',
    function($scope, $rootScope, $state, $stateParams, $modal, $log,
      $window, GeoServer) {

      if ($stateParams.workspace) {
        $scope.workspace = $stateParams.workspace;
      }

      // See utilities.js pop directive - 1 popover open at a time
      var openPopoverStore;
      $scope.closePopovers = function(store) {
        if (openPopoverStore || openPopoverStore===store) {
          openPopoverStore.showSourcePopover = false;
          openPopoverStore = null;
        } else {
          store.showSourcePopover = true;
          openPopoverStore = store;
        }
      };
      var openPopoverPublished;
      $scope.closeResourcePopovers = function(resource) {
        if (openPopoverPublished || openPopoverPublished===resource) {
          openPopoverPublished.publishedPopover = false;
          openPopoverPublished = null;
        } else {
          resource.publishedPopover = true;
          openPopoverPublished = resource;
        }
      };

      $scope.getLayersForResource = function(resource) {
        var layers = resource.layers;
        var returnString = '';
        for (var t=0; t < layers.length; t++) {
          returnString += layers[t].name + ' ';
        }
        return returnString;
      };

      $scope.showLayer = function(layer) {
        $state.go('workspace.layers', { 'layer': layer });
      };

      $scope.showAttrs = function(layerOrResource, storename) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/data.attributes.tpl.html',
          controller: 'WorkspaceAttributesCtrl',
          size: 'md',
          resolve: {
            layerOrResource: function() {
              return layerOrResource;
            },
            workspace: function() {
              return $scope.workspace;
            },
            storename: function() {
              return storename;
            }
          }
        });
      };

      $scope.enableDisableStore = function(store) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/data.update.tpl.html',
          controller: 'UpdateStoreCtrl',
          size: 'md',
          resolve: {
            store: function() {
              return store;
            },
            workspace: function() {
              return $scope.workspace;
            }
          }
        });
      };

      $scope.importAsNewLayer = function(resource, store) {
        $scope.resourceToUpdate = resource;
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/layer.import.tpl.html',
          controller: 'ImportLayerCtrl',
          size: 'md',
          resolve: {
            resource: function() {
              return $scope.resourceToUpdate;
            },
            workspace: function() {
              return $scope.workspace;
            },
            store: function() {
              return store;
            }
          }
        }).result.then(function(added) {
          if (added) {
            $scope.resourceToUpdate.layers.push(added);
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
      $scope.getTypeDetails = function(resource) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/format.type.tpl.html',
          controller: 'FormatTypeInfoCtrl',
          backdrop: 'static',
          size: 'md',
          resolve: {
            formats: function() {
              return $scope.formats;
            },
            resource: function() {
              return resource;
            }
          }
        });
      };
    }])
.service('storesListModel', function(GeoServer, _, $rootScope) {
  var _this = this;
  this.stores = null;

  this.getStores = function() {
    return _this.stores;
  };

  this.setStores = function(stores) {
    _this.stores = stores;
  };

  this.addStore = function(store) {
    _this.stores.unshift(store); // add to front of array
  };

  this.removeStore = function(store) {
    _.remove(_this.stores, function(_store) {
      return _store.name === store.name;
    });
  };

  this.tagStore = function(store) {
    var format = store.format.toLowerCase();
    if (format === 'shapefile') {
      store.sourcetype = 'shp';
      store.displayName = store.name + ' (shapefile)';
    } else if (store.kind.toLowerCase() === 'raster') {
      store.sourcetype = 'raster';
      store.displayName = store.name + ' (raster)';
    } else if (store.type.toLowerCase() === 'database') {
      store.sourcetype = 'database';
      store.displayName = store.name + ' (database)';
    } else if (format.indexOf('directory of spatial files')!==-1) {
      store.sourcetype = 'shp_dir';
      store.displayName = store.name + ' (directory of shapefiles)';
    }
    return store;
  };

  this.tagStores = function(stores) {
    for (var i=0; i < stores.length; i++) {
      stores[i] = _this.tagStore(stores[i]);
    }
    return stores;
  };

  this.fetchStores = function(workspace) {
    return GeoServer.datastores.get(workspace).then(
      function(result) {
        if (result.success) {
          var stores = result.data;
          // tag for display
          _this.setStores(_this.tagStores(stores));
        } else {
          $rootScope.alerts = [{
            type: 'warning',
            message: 'Unable to load workspace data stores.',
            fadeout: true
          }];
        }
      });
  };

  this.addEmptyStore = function(workspace, format, content) {
    return GeoServer.datastores.create(workspace, format, content)
    .then(
      function(result) {
        if (result.success) {
          var store = result.data;
          // tag for display
          _this.addStore(_this.tagStore(store));
        } else {
          $rootScope.alerts = [{
            type: 'danger',
            message: 'Unable to add store.',
            fadeout: true
          }];
        }
      });
  };
});
