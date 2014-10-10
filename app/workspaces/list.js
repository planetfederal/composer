angular.module('gsApp.workspaces.list', [
  'ngGrid',
  'gsApp.core.utilities'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('workspaces.list', {
          url: '/list',
          templateUrl: '/workspaces/list.tpl.html',
          controller: 'WorkspacesListCtrl'
        });
    }])
.controller('WorkspacesListCtrl', ['$scope', 'GeoServer', '$state', '$log',
  '$rootScope', 'AppEvent',
    function($scope, GeoServer, $state, $log, $rootScope, AppEvent) {
      $scope.title = 'All Workspaces';

      $scope.onWorkspaceClick = function(ws) {
        $state.go('workspace', {
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
            $rootScope.$broadcast(AppEvent.WorkspacesFetched,
              $scope.workspaceData);
          } else {
            $scope.alerts = [{
                type: 'warning',
                message: 'Could not get workspaces.',
                fadeout: true
              }];
          }
        });

    }]);
