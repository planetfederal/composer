angular.module('gsApp.workspaces', [
  'ngGrid',
  'gsApp.workspaces.home'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('workspaces', {
          url: '/workspaces',
          templateUrl: '/workspaces/workspaces.tpl.html',
          controller: 'WorkspacesCtrl'
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

      GeoServer.workspaces.get().$promise.then(function(workspaces) {
        workspaces.filter(function(ws) {
          return workspaces;
        });
        $scope.workspaceData = workspaces;
      });

    }]);
