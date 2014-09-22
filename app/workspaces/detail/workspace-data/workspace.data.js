angular.module('gsApp.workspaces.workspace.data', [
  'ngGrid',
  'ngSanitize',
  'ui.router'
])
.controller('WorkspaceDataCtrl', ['$scope', 'GeoServer', '$log',
    function($scope, GeoServer, $log ) {

      $scope.datastores = GeoServer.datastores.get().datastores;
      // stubbed in backend.js

      $scope.pagingOptions = {
        pageSizes: [25, 50, 100],
        pageSize: 25
      };
      $scope.gridOptions = {
        data: 'datastores',
        columnDefs: [
          {field: 'workspace', displayName: 'Workspace'},
          {field: 'store', displayName: 'Store'},
          {field: 'type', displayName: 'Data Type'},
          {field: 'source', displayName: 'Source', width: '30%'},
          {field: 'description', displayName: 'Description', width: '20%'},
          {field: 'srs', displayName: 'SRS'}
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

    }]);
