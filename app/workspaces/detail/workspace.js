angular.module('gsApp.workspaces.workspace', [
  'gsApp.workspaces.workspace.data',
  'gsApp.workspaces.workspace.maps',
  'gsApp.workspaces.workspace.settings',
  'gsApp.alertpanel',
  'ngSanitize'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.home', {
        url: '/',
        templateUrl: '/workspaces/detail/workspace-home.tpl.html',
        controller: 'WorkspaceHomeCtrl'
      })
      .state('workspace.home.data', {
          url: '#data',
          templateUrl: '/workspaces/detail/workspace-home.tpl.html',
          controller: 'WorkspaceDataCtrl'
        })
      .state('workspace.home.maps', {
          url: '#maps',
          templateUrl: '/workspaces/detail/workspace-home.tpl.html',
          controller: 'WorkspaceMapsCtrl'
        })
      .state('workspace.home.settings', {
          url: '#settings',
          templateUrl: '/workspaces/detail/workspace-home.tpl.html',
          controller: 'WorkspaceSettingsCtrl'
        });
    }])
.controller('WorkspaceHomeCtrl', ['$scope', '$stateParams', 'GeoServer',
  '$log', '$sce', 'baseUrl', '$window', '$state', '$location', '$modal',
  '$rootScope', 'AppEvent',
    function($scope, $stateParams, GeoServer, $log, $sce, baseUrl,
      $window, $state, $location, $modal, $rootScope, AppEvent) {

      $scope.showSettings = false;

      $scope.tabs = {'data': false, 'maps': true};
      $scope.$on('$stateChangeSuccess', function(event, toState,
        toParams, fromState, fromParams) {

          switch($location.hash()) {
            case 'data':
              $scope.tabs.data = true;
              break;
            default:
              $scope.tabs.maps = true;
          }
        });

      var wsName = $stateParams.workspace;
      $scope.workspace = wsName;
      $scope.title = wsName;
      $scope.thumbnails = {};
      $scope.olmaps = {};
      // Set stores list to window height
      $scope.storesListHeight = {'height': $window.innerHeight-250};

      // Settings

      $scope.workspaceSettings = function() {
        $scope.showSettings = true;
      };
      $scope.workspaceSettingsOff = function() {
        $scope.showSettings = false;
      };

    }])
.controller('DeleteModalControl', ['$scope', '$modalInstance', 'workspace',
  'geoserver', '$state', '$rootScope', 'AppEvent',
  function ($scope, $modalInstance, workspace, geoserver, $state,
      $rootScope, AppEvent) {

      $scope.workspace = workspace;
      $scope.geoserver = geoserver;
      $scope.workspaceDeleted = false;

      $scope.deleteForever = function () {
        $scope.geoserver.workspace.delete($scope.workspace).then(
          function(result) {
            if (result.success || result) {
              $scope.workspaceDeleted = true;
              $rootScope.alerts = [{
                type: 'success',
                message: 'Workspace '+ workspace +' deleted.',
                fadeout: true
              }];
              $rootScope.$broadcast(AppEvent.WorkspaceDeleted,
                $scope.workspace);
              $state.go('workspaces');
            } else {
              $rootScope.alerts = [{
                type: 'warning',
                message: 'Workspace deletion failed.',
                fadeout: true
              }];
            }
          });
        $modalInstance.close($scope.workspace);
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }]);
