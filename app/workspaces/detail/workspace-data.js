angular.module('gsApp.workspaces.workspace.data', [
  'gsApp.workspaces.workspace.data.create',
  'gsApp.workspaces.workspace.data.update',
  'gsApp.workspaces.workspace.data.delete',
  'gsApp.core.utilities',
  'gsApp.alertpanel',
  'ngSanitize'
])
.controller('WorkspaceDataCtrl', ['$scope', '$stateParams', 'GeoServer',
  '$log', '$sce', 'baseUrl', '$window', '$state', '$location', '$modal',
  '$rootScope', 'AppEvent',
    function($scope, $stateParams, GeoServer, $log, $sce, baseUrl,
      $window, $state, $location, $modal, $rootScope, AppEvent) {

      var workspace = $scope.workspace;

      GeoServer.datastores.get($scope.workspace).then(
        function(result) {
          $scope.datastores = result.data;
          $scope.datastores.forEach(function(ds) {
            if (ds.format.toLowerCase() === 'shapefile') {
              ds.sourcetype = 'shp';
            } else if (ds.kind.toLowerCase() === 'raster') {
              ds.sourcetype = 'raster';
            } else if (ds.type.toLowerCase() === 'database') {
              ds.sourcetype = 'database';
            }
          });
        });

      $scope.selectStore = function(store) {
        $scope.selectedStore = store;
        GeoServer.datastores.getDetails($scope.workspace, store.name).then(
        function(result) {
          if (result.success) {
            $rootScope.alerts = [{
              type: 'warning',
              message: 'The Store details API is under construction.',
              fadeout: true
            }];

            //$scope.selectedStore.imported = store.layers_imported.length;
            //$scope.selectedStore.unimported = store.layers_unimported.length;
          } else {
            $rootScope.alerts = [{
              type: 'warning',
              message: 'Store details could not be loaded.',
              fadeout: true
            }];
          }
        });
      };

      $scope.addNewStore = function() {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/addstore-modal.tpl.html',
          controller: 'AddStoreModalCtrl',
          size: 'lg',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            geoserver: function() {
              return GeoServer;
            }
          }
        });
      };

      $scope.deleteStore = function() {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/deletestore-modal.tpl.html',
          controller: 'DeleteStoreModalCtrl',
          size: 'md',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            geoserver: function() {
              return GeoServer;
            },
            store: function() {
              return $scope.selectedStore;
            }
          }
        });
      };

      $scope.updateStore = function() {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/updatestore-modal.tpl.html',
          controller: 'UpdateStoreModalCtrl',
          size: 'md',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            geoserver: function() {
              return GeoServer;
            },
            store: function() {
              return $scope.selectedStore;
            }
          }
        });
      };
    }]);
