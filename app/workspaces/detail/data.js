angular.module('gsApp.workspaces.data', [
  'gsApp.workspaces.data.delete',
  'gsApp.workspaces.data.update',
  'gsApp.workspaces.data.import',
  'gsApp.workspaces.formats.type',
  'gsApp.workspaces.data.attributes',
  'gsApp.workspaces.layers.import',
  'gsApp.workspaces.layers.duplicate',
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
        templateUrl: '/workspaces/detail/data/data.main.tpl.html',
        controller: 'DataMainCtrl'
      });
      $stateProvider.state('workspace.data.import', {
        url: '/import',
        templateUrl: '/workspaces/detail/data/import/import.tpl.html',
        controller: 'DataImportCtrl',
        params: { workspace: {} }
      });
    }])
.controller('WorkspaceDataCtrl', ['$scope', '$rootScope', '$state',
  '$stateParams', '$modal', '$window', '$log', 'GeoServer', '_',
  'AppEvent', '$timeout',
    function($scope, $rootScope, $state, $stateParams, $modal, $log,
      $window, GeoServer, _, AppEvent, $timeout) {

      var workspace = $scope.workspace;

      // Set stores list to window height
      $scope.storesListHeight = {'height': $window.innerHeight-250};

      $timeout(function() {
        if ($scope.$parent.tabs) {
          $scope.$parent.tabs[2].active = true;
        }
      }, 300);

      function getDataStores() {
        GeoServer.datastores.get($scope.workspace).then(
          function(result) {
            if (result.success) {
              $scope.datastores = result.data;

              $scope.datastores.forEach(function(ds) {
                var format = ds.format.toLowerCase();
                if (format === 'shapefile') {
                  ds.sourcetype = 'shp';
                } else if (ds.kind.toLowerCase() === 'raster') {
                  ds.sourcetype = 'raster';
                } else if (ds.type.toLowerCase() === 'database') {
                  ds.sourcetype = 'database';
                } else if (format.indexOf('directory of spatial files')!==-1) {
                  ds.sourcetype = 'shp_dir';
                }
              });
              // select first store as default to show
              if ($scope.datastores.length > 0) {
                $scope.selectStore($scope.datastores[0]);
              }
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Stores could not be loaded.',
                fadeout: true
              }];
            }
          });
      }
      getDataStores();

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

      $scope.importData = function() {
        $state.go('workspace.data.import', {
          workspace: $scope.workspace
        });
      };
      $scope.$on(AppEvent.ImportData, function() {
        $scope.importData();
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

      $scope.storeAdded = function() {
        getDataStores();
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
    function($scope, $rootScope, $state, $stateParams, $modal, $log, $window,
      GeoServer) {

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

      $scope.copyToNewLayer = function(resource) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/layer.duplicate.tpl.html',
          controller: 'DuplicateLayerCtrl',
          size: 'md',
          resolve: {
            resource: function() {
              return resource;
            },
            workspace: function() {
              return $scope.workspace;
            }
          }
        });
      };

      $scope.importAsNewLayer = function(resource, store) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/layer.import.tpl.html',
          controller: 'ImportLayerCtrl',
          size: 'md',
          resolve: {
            resource: function() {
              return resource;
            },
            workspace: function() {
              return $scope.workspace;
            },
            store: function() {
              return store;
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
    }]);
