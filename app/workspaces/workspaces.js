angular.module('gsApp.workspaces', [
  'ngGrid',
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('workspaces', {
          url: '/workspaces',
          templateUrl: '/workspaces/workspaces.tpl.html',
          controller: 'WorkspacesCtrl'
        });
    }])
.controller('WorkspacesCtrl', ['$scope', 'GeoServer', '$state', '$log',
    function($scope, GeoServer, $state, $log) {
      $scope.title = 'All Workspaces';

      $scope.pagingOptions = {
        pageSizes: [25,50,100],
        pageSize: 25
      };
      $scope.gridOptions = {
        data: 'workspaceData',
        columnDefs: [
          {field:'name', displayName:'Name'},
          {
            field:'default',
            displayName:'Default?'
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
