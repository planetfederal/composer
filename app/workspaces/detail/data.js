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
  'AppEvent', '$timeout', 'storesListModel', 'resourcesListModel',
    function($scope, $rootScope, $state, $stateParams, $modal, $log,
      $window, GeoServer, _, AppEvent, $timeout, storesListModel, resourcesListModel) {

      var workspace;
      if ($scope.workspace) {
        workspace = $scope.workspace;
      } else if ($stateParams.workspace) {
        workspace = $stateParams.workspace;
      }

      $scope.opts = {
        paging: {
          pageSize: 10,
          currentPage: 1
        },
        sort: {
          predicate: 'name',
          order: 'asc'
        },
        filter: {
          filterText: ''
        },
      };

      $scope.resourceOpts = {
        paging: {
          pageSize: 10,
          currentPage: 1
        },
        sort: {
          predicate: 'name',
          order: 'asc'
        },
        filter: {
          filterText: ''
        }
      }

      // Set stores list to window height
      $scope.storesListHeight = {'height': $window.innerHeight-250};

      $timeout(function() {
        if ($scope.$parent && $scope.$parent.tabs) {
          $scope.$parent.tabs[2].active = true;
        }
      }, 300);

      $scope.storesHome = function() {
        if (!$state.is('workspace.data.main')) {
          $state.go('workspace.data.main', {workspace:$scope.workspace});
        }
      };

      $scope.selectStore = function(store) {
        if (store.name == null) {
          return;
        }
        if ($scope.selectedStore &&
              $scope.selectedStore.name===store.name) {
          return;
        }
        $scope.selectedStore = store;
        $scope.pagedResources = null;

        GeoServer.datastores.getDetails($scope.workspace, store.name).then(
          function(result) {
            if (result.success) {
              var storeData = result.data;
              resourcesListModel.setResources(result.data.resources);
              var opts = $scope.resourceOpts;
              $scope.pagedResources = resourcesListModel.getResourcesPage(
                opts.paging.currentPage, 
                opts.paging.pageSize, 
                opts.sort.predicate +':'+opts.sort.order, 
                opts.filter.filterText);
              $scope.totalResources = resourcesListModel.getTotalServerItems();
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

      $scope.sortBy = function(sort, pred) {
        if (pred === sort.predicate) { // flip order if selected same
          sort.order = sort.order === 'asc' ? 'desc' : 'asc';
        } else { // default to 'asc' order when switching
          sort.predicate = pred;
          sort.order = 'asc';
        }
      };

      $scope.serverRefresh = function() {
        var opts = $scope.opts;
        return storesListModel.fetchStores(
          $scope.workspace,
          opts.paging.currentPage,
          opts.paging.pageSize,
          opts.sort.predicate + ':' + opts.sort.order,
          opts.filter.filterText
        ).then(function() {
          $scope.datastores = storesListModel.getStores();
          $scope.totalStores = storesListModel.getTotalServerItems();
          //refresh selected store
          if ($scope.selectedStore && $scope.selectedStore.enabled) {
            var store = $scope.selectedStore;
            $scope.selectedStore = null;
            $scope.selectStore(store);
          } else {
            resourcesListModel.setResources(null);
            $scope.pagedResources = null;
            $scope.totalResources = null;
          }
        });
      };

      //Change store name
      $scope.storeEdit = function (store, editing) {
        if (editing) {
          store.editing = true;
          $timeout(function() {
            $('.store-edit').focus();
          }, 10);
        } else {
          var newName = $('.store-edit').val();

          if (newName.match(/^[a-zA-Z\d][a-zA-Z\d\-_]*$/)) {
            store.refresh = true;
            GeoServer.datastores.update($scope.workspace, store.name, {name: newName})
            .then(function(result) {
              store.refresh = false;
              if (result.success) {
                store.name = result.data.name;
                $scope.selectStore(store);
              } else {
                $rootScope.alerts = [{
                  type: 'warning',
                  message: 'Could not change store name from '+store.name+' to '+newName,
                  details: result.data.trace,
                  fadeout: true
                }];
              }
            });
          } else {
            $rootScope.alerts = [{
              type: 'warning',
              message: 'Could not change store name to '+newName+': Invalid characters in store name',
              fadeout: true
            }];
          }
          store.editing = false;
        }
      }

      $scope.dataLoading=true;
      $scope.serverRefresh().then(function() {
        $scope.dataLoading=false;
        if ($scope.datastores && $scope.datastores.length > 0) {
          $scope.selectStore($scope.datastores[0]);
        }
      });

      $scope.$watch('opts', function(newVal, oldVal) {
        if (newVal != null && newVal !== oldVal) {
          $scope.serverRefresh();
        }
      }, true);

      $scope.$watch('resourceOpts', function(newVal, oldVal) {
        if (newVal != null && newVal !== oldVal) {
          var opts = $scope.resourceOpts;
          $scope.pagedResources = resourcesListModel.getResourcesPage(
            opts.paging.currentPage, 
            opts.paging.pageSize, 
            opts.sort.predicate +':'+opts.sort.order, 
            opts.filter.filterText);
          $scope.totalResources = resourcesListModel.getTotalServerItems();
        }
      }, true);



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
        $scope.serverRefresh();
      });

      $rootScope.$on(AppEvent.StoreUpdated, function(scope, info) {
        for (var i = 0; i < $scope.datastores.length; i++) {
          if ($scope.datastores[i].name = info.original.name) {
            $scope.datastores[i] = info.updated;
            if ($scope.selectedStore.name = info.original.name) {
              $scope.selectedStore = info.updated;
              if ($scope.selectedStore.enabled) {
                $scope.selectedStore = null;
                $scope.selectStore(info.updated);
              } else {
                resourcesListModel.setResources(null);
                $scope.pagedResources = null;
                $scope.totalResources = null;
              }
            }
            break;
          }
        }

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
        $scope.selectedStore=null;
        $scope.serverRefresh();
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
  this.totalServerItems = 0;

  this.getTotalServerItems = function() {
    return _this.totalServerItems;
  };

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
    } else if (store.type.toLowerCase() === 'database' || store.type.toLowerCase() === 'generic') {
      store.sourcetype = 'database';
      store.displayName = store.name + ' (database)';
    } else if (format.indexOf('directory of spatial files')!==-1) {
      store.sourcetype = 'shp_dir';
      store.displayName = store.name + ' (directory of shapefiles)';
    } else if (store.type.toLowerCase() === 'web') {
      store.sourcetype = 'web';
    }
    return store;
  };

  this.tagStores = function(stores) {
    for (var i=0; i < stores.length; i++) {
      stores[i] = _this.tagStore(stores[i]);
    }
    return stores;
  };

  this.fetchStores = function(workspace, currentPage, pageSize, sort, filterText) {
    if (currentPage) {
      currentPage = currentPage - 1;
    }
    return GeoServer.datastores.get(workspace, currentPage, pageSize, sort, filterText).then(
      function(result) {
        if (result.success) {
          var stores = result.data.stores;
          // tag for display
          _this.totalServerItems = result.data.total;
          _this.setStores(_this.tagStores(stores));
        } else {
          $rootScope.alerts = [{
            type: 'warning',
            message: 'Unable to load data stores for workspace '+workspace,
            details: result.data.trace,
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
            message: 'Unable to add data store in workspace '+workspace,
            details: result.data.trace,
            fadeout: true
          }];
        }
      });
  };
}).service('resourcesListModel', function( _, $rootScope) {
  var _this = this;
  this.resources = null;
  this.totalServerItems = 0;

  this.currentPage = null;
  this.pageSize = null;
  this.sort = null;
  this.filterText = null;
  this.filteredResources = null;

  this.getTotalServerItems = function() {
    return _this.totalServerItems;
  };

  this.getResources = function() {
    return _this.resources;
  };

  this.setResources = function(resources) {
    _this.resources = resources;
    _this.filteredResources = null;
    if (resources) {
      _this.totalServerItems = resources.length;
    } else {
      _this.totalServerItems = null;
    }

  };

  this.getResourcesPage = function(currentPage, pageSize, sort, filterText) {
    var changed = false;

    if (_this.resources == null) {
      return null;
    }

    if (this.filteredResources == null) {
      changed = true;
      this.filteredResources = _this.resources;
    }

    //filter
    if (changed || _this.filterText != filterText) {
      changed = true
      _this.filterText = filterText
      _this.filteredResources = _this.resources.filter(function(value) {
        return value.name && value.name.indexOf(filterText) >= 0;
      });
      _this.totalServerItems = _this.filteredResources.length;
    }

    //sort
    if (changed || _this.sort != sort) {
      changed = true
      _this.sort = sort
      var parsedSort = sort.split(":")
      var reverse = 1;

      if (parsedSort[1] && parsedSort[1] == 'desc') {
        reverse = -1;
      }

      _this.filteredResources = _this.filteredResources.sort(function(o1, o2) {
        if (parsedSort[0] == 'name') {
          return ((o1.name > o2.name) - (o1.name < o2.name))*reverse;
        }
        if (parsedSort[0] == 'published') {
          return ((o1.layers.length > o2.layers.length) - (o1.layers.length < o2.layers.length))*reverse;
        }
        return 0;
      });
    }

    //page
    _this.currentPage = currentPage;
    _this.pageSize = pageSize;

    return _this.filteredResources.slice((currentPage-1)*pageSize, currentPage*pageSize);
  }
});
