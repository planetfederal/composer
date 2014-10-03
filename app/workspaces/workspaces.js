angular.module('gsApp.workspaces', [
  'ngGrid',
  'gsApp.workspaces.workspace'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('workspaces', {
          url: '/workspaces',
          templateUrl: '/workspaces/workspaces.tpl.html',
          controller: 'WorkspacesCtrl'
        })
        .state('workspace.new', {
          url: '/new',
          templateUrl: '/workspaces/detail/workspace-new.tpl.html',
          controller: 'NewWorkspaceCtrl'
        })
        .state('workspace', {
          abstract: true,
          url: '/workspaces/:workspace',
          templateUrl: '/workspaces/detail/workspace.tpl.html'
        });
    }])

.controller('WorkspacesCtrl', ['$scope', 'GeoServer', '$state', '$log',
    function($scope, GeoServer, $state, $log) {
      $scope.title = 'All Workspaces';

      $scope.onWorkspaceClick = function(ws) {
        $state.go('workspace.home', {
          workspace: ws
        });
      };

      $scope.pagingOptions = {
        pageSizes: [25, 50, 100],
        pageSize: 25
      };

      $scope.gridOptions = {
        data: 'workspaceData',
        columnDefs: [
          {
            field: 'name',
            displayName: 'Name',
            cellTemplate: '<a ng-click="onWorkspaceClick(row.getProperty(' +
              '\'name\'))">{{row.getProperty(\'name\')}}</a>'
          },
          {
            field: 'default',
            displayName: 'Default?'
          }
        ],
        enablePaging: true,
        enableColumnResize: false,
        showFooter: true,
        pagingOptions: $scope.pagingOptions,
        filterOptions: {
          filterText: '',
          useExternalFilter: true
        }
      };

      GeoServer.workspaces.get().then(
        function(result) {
          if (result.success) {
            $scope.workspaceData = result.data;
          } else {
            $scope.alerts = [{
                type: 'warning',
                message: 'Could not get workspaces.',
                fadeout: true
              }];
          }
        });

    }])
.controller('NewWorkspaceCtrl', ['$scope', 'GeoServer', '$state', '$log',
  '$rootScope', 'AppEvent',
    function($scope, GeoServer, $state, $log, $rootScope, AppEvent) {

      $scope.title = 'Create New Workspace';
      $scope.wsSettings = {};
      $scope.workspaceCreated = false;

      $scope.cancel = function() {
        $state.go('workspaces');
      };

      $scope.create = function() {
        var newWorkspace = {
          'name': $scope.wsSettings.name,
          'uri': $scope.wsSettings.uri,
          'default': $scope.wsSettings.default
        };
        GeoServer.workspace.create(newWorkspace).then(
          function(result) {
            if (result.success || result.status===201) {
              $scope.workspaceCreated = true;
              $scope.workspaces.push(newWorkspace);
            } else {
              // TODO move alerts to top of header nav
              var msg = result.data.message?
                result.data.message : result.data;
              $scope.alerts = [{
                type: 'warning',
                message: msg,
                fadeout: true
              }];
            }
          });
      };
    }]);
