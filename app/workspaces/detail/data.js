angular.module('gsApp.workspaces.data', [
  'gsApp.workspaces.data.add',
  'gsApp.workspaces.data.delete',
  'gsApp.workspaces.data.update',
  'gsApp.core.utilities',
  'gsApp.alertpanel',
  'ngSanitize'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.data', {
        url: '/data',
        templateUrl: '/workspaces/detail/data.tpl.html',
        controller: 'WorkspaceDataCtrl'
      });
    }])
.controller('WorkspaceDataCtrl', ['$scope', '$rootScope', '$state',
  '$stateParams', '$modal', '$window', '$log', 'GeoServer',
    function($scope, $rootScope, $state, $stateParams, $modal, $log, $window,
      GeoServer) {

      var workspace = $scope.workspace;

      // Set stores list to window height
      $scope.storesListHeight = {'height': $window.innerHeight-250};

      GeoServer.datastores.get($scope.workspace).then(
        function(result) {
          $scope.datastores = result.data;

          $scope.datastores.forEach(function(ds) {
            var format = ds.format.toLowerCase();
            if (format === 'shapefile') {
              ds.sourcetype = 'shp';
            } else if (format === 'directory of spatial files') {
              ds.sourcetype = 'shp dir';
            } else if (ds.kind.toLowerCase() === 'raster') {
              ds.sourcetype = 'raster';
            } else if (ds.type.toLowerCase() === 'database') {
              ds.sourcetype = 'database';
            }
          });
        });

      $scope.storeRemoved = function(storeToRemove) {
        var index = $scope.datastores.indexOf(storeToRemove);
        if (index > -1) {
          $scope.datastores.splice(index, 1);
        }
      };

      $scope.storeAdded = function(storeToAdd) {
        $scope.datastores.push(storeToAdd);
      };

      // See utilities.js pop directive - 1 popover open at a time
      var openPopoverStore;
      $scope.closePopovers = function(store) {
        if (openPopoverStore) {
          openPopoverStore.showSourcePopover = false;
        }
        if (openPopoverStore===store) {
          openPopoverStore.showSourcePopover = false;
        } else {
          store.showSourcePopover = true;
          openPopoverStore = store;
        }
      };

      $scope.allRetrievedLayers = [];

      $scope.selectStore = function(store) {
        $scope.selectedStore = store;
        GeoServer.datastores.getDetails($scope.workspace, store.name).then(
        function(result) {
          if (result.success) {
            var storeData = result.data;
            $scope.selectedStore = storeData;

            for (var i=0; i < storeData.resources.length; i++) {
              for (var k=0; k < storeData.resources[i].layers.length; k++) {
                var layer = storeData.resources[i].layers[k];
                var rsrc = $scope.selectedStore.resources[i];

                GeoServer.layer.get($scope.workspace, layer.name).then(
                  function(result) {
                    if (result.success) {
                      $scope.allRetrievedLayers.push(result.data);
                    } else {
                      $rootScope.alerts = [{
                        type: 'warning',
                        message: 'Details for ' + layer.name +
                          ' could not be loaded.',
                        fadeout: true
                      }];
                    }
                  });
              }
            }

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

      $scope.addNewStore = function() {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/data.add.tpl.html',
          controller: 'WorkspaceAddDataCtrl',
          backdrop: 'static',
          size: 'lg',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            storeAdded: function() {
              return $scope.storeAdded;
            }
          }
        });
      };

      $scope.deleteStore = function() {
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

      $scope.updateStore = function() {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/data.update.tpl.html',
          controller: 'WorkspaceUpdateDataCtrl',
          backdrop: 'static',
          size: 'md',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            store: function() {
              return $scope.selectedStore;
            }
          }
        });
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

    }]);
