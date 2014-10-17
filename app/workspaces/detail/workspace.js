angular.module('gsApp.workspaces.home', [
  'gsApp.workspaces.maps',
  'gsApp.workspaces.data',
  'gsApp.workspaces.layers',
  'gsApp.workspaces.settings',
  'gsApp.workspaces.data.attributes',
  'gsApp.alertpanel',
  'ngSanitize'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('workspace', {
          url: '/workspace/:workspace',
          templateUrl: '/workspaces/detail/workspace.tpl.html',
          controller: 'WorkspaceHomeCtrl'
        });
    }])
.controller('WorkspaceHomeCtrl', ['$scope','$state', '$stateParams', '$log',
  '$modal', 'GeoServer',
    function($scope, $state, $stateParams, $log, $modal, GeoServer) {
      var wsName = $stateParams.workspace;

      $scope.workspace = wsName;

      GeoServer.workspace.get(wsName).then(function(result) {
        $scope.title = wsName;

        $scope.tabs = [
          { heading: 'Maps', route: 'workspace.maps', active: true},
          { heading: 'Layers', route: 'workspace.layers', active: false},
          { heading: 'Data', route: 'workspace.data', active: false}
        ];

        $scope.go = function(route) {
          $state.go(route, {workspace:wsName});
        };

        // hack to deal with strange issue with tabs being selected
        // when they are destroyed
        // https://github.com/angular-ui/bootstrap/issues/2155
        var destroying = false;
        $scope.$on('$destroy', function() {
          destroying = true;
        });
        $scope.selectTab = function(t) {
          if (!destroying) {
            $scope.go(t.route);
          }
        };

        $scope.$on('$stateChangeSuccess',
          function(e, to, toParams, from, fromParams) {
            $scope.tabs.forEach(function(tab) {
              tab.active = $state.is(tab.route);
            });
            if (to.name == 'workspace') {
              $scope.go($scope.tabs[0].route);
            }
            $scope.showSettings = $state.is('workspace.settings');
          });
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
    }]);

