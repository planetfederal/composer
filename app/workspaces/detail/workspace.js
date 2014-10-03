angular.module('gsApp.workspaces.workspace', [
  'gsApp.workspaces.datastores',
  'ngSanitize'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.home', {
        url: '/home',
        templateUrl: '/workspaces/detail/workspace-home.tpl.html',
        controller: 'WorkspaceHomeCtrl'
      })
      .state('workspace.home.data', {
          url: '#data',
          templateUrl: '/workspaces/detail/workspace-home.tpl.html',
        })
      .state('workspace.home.maps', {
          url: '#maps',
          templateUrl: '/workspaces/detail/workspace-home.tpl.html',
        })
      .state('workspace.home.settings', {
          url: '#settings',
          templateUrl: '/workspaces/detail/workspace-home.tpl.html',
        });
    }])
.controller('WorkspaceHomeCtrl', ['$scope', '$stateParams', 'GeoServer',
  '$log', '$sce', 'baseUrl', '$window', '$state', '$location', '$modal',
  '$rootScope', 'AppEvent',
    function($scope, $stateParams, GeoServer, $log, $sce, baseUrl,
      $window, $state, $location, $modal, $rootScope, AppEvent) {

      $scope.tabs = {'data': false, 'maps': true};
      $scope.$on('$stateChangeSuccess', function(event, toState,
        toParams, fromState, fromParams) {

          switch($location.hash()) {
            case 'data':
              $scope.tabs.data = true;
              break;
            case 'settings':
              $scope.tabs.settings = true;
              break;
            default:
              $scope.tabs.maps = true;
          }
        });

      var wsName = $scope.workspace;
      $scope.thumbnails = {};
      $scope.olmaps = {};

      // Maps

      GeoServer.maps.get({workspace: wsName}).$promise
        .then(function(maps) {

          $scope.maps = maps;

          // load all map thumbnails & metadata
          for (var i=0; i < $scope.maps.length; i++) {
            var map = $scope.maps[i];
            var layers = '';

            $scope.maps[i].workspace = wsName;
            $scope.maps[i].layergroupname = wsName + ':' + map.name;
            $scope.maps[i].layerCount = map.layers.length;
            var bbox = $scope.maps[i].bbox = '&bbox=' + map.bbox.west +
             ',' + map.bbox.south + ',' + map.bbox.east + ',' +
             map.bbox.north;

            var url = GeoServer.map.thumbnail.get(map.workspace, map,
              map.layergroupname, 250, 250);
            var srs = '&srs=' + map.proj.srs;

            $scope.thumbnails[map.name] = url + bbox +
              '&format=image/png' + srs;
          }
        });

      $scope.sanitizeHTML = function(description) {
        return $sce.trustAsHtml(description);
      };

      $scope.newOLWindow = function(map) {
        var baseUrl = GeoServer.map.openlayers.get(map.workspace,
          map.name, map.bbox, 800, 500);
        $window.open(baseUrl);
      };

      $scope.onEdit = function(map) {
        $state.go('map.compose', {
          workspace: map.workspace,
          name: map.name
        });
      };

      // Data

      /*GeoServer.alldata.get().$promise.then(function(data) {
        $scope.data = data;
      });*/
      $scope.datastores = GeoServer.datastores.get().datastores;

      $scope.selectStore = function(store) {
        $scope.selectedStore = store;
        $scope.selectedStore.imported = store.layers_imported.length;
        $scope.selectedStore.unimported = store.layers_unimported.length;
      };

      $scope.addNewStore = function() {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/addnew-modal.tpl.html',
          controller: 'AddNewModalCtrl',
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

      // Settings
      $scope.wsSettings = {};
      $scope.form = {};
      var originalForm;

      GeoServer.workspace.get($scope.workspace).then(
        function(result) {
          if (result.success) {
            var ws = result.data;
            $scope.wsSettings.name = ws.name;
            $scope.wsSettings.uri= ws.uri;
            $scope.wsSettings.default = ws.default;
            originalForm = angular.copy($scope.wsSettings);
          } else {
            $scope.alerts = [{
              type: 'warning',
              message: 'Workspace could not be loaded.',
              fadeout: true
            }];
          }
        });

      $scope.saveChanges = function() {
        if ($scope.form.settings.$dirty) {
          var patch = {};
          if (originalForm.name !== $scope.wsSettings.name) {
            patch.name = $scope.wsSettings.name;
          }
          if (originalForm.uri !== $scope.wsSettings.uri) {
            patch.uri = $scope.wsSettings.uri;
          }
          if (originalForm.default !== $scope.wsSettings.default) {
            patch.default = $scope.wsSettings.default;
          }

          GeoServer.workspace.update($scope.workspace, patch).then(
            function(result) {
              if (result.success) {
                if (patch.name) { // Update everything
                  $rootScope.$broadcast(AppEvent.WorkspaceNameChanged,
                    { 'original': originalForm.name,
                      'new': $scope.wsSettings.name
                    });
                  $scope.workspace = $scope.wsSettings.name;
                  $state.go('workspace.home.settings', {
                    workspace: $scope.workspace
                  });
                }
                $scope.wsSettings.saved = true;
                originalForm = angular.copy($scope.wsSettings);

              } else {
                // TODO move alerts to top of header nav
                $scope.alerts = [{
                  type: 'warning',
                  message: 'Workspace update failed.',
                  fadeout: true
                }];
              }
            });
        }
      };

      $scope.deleteWorkspace = function() {
        // TODO
      };

    }]);
