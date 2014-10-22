angular.module('gsApp.data', [
  'ngGrid',
  'ui.select',
  'gsApp.data.import'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('data', {
          url: '/data',
          abstract: true,
          templateUrl: '/data/data.tpl.html'
        })
        .state('data.list', {
          url: '/list',
          templateUrl: '/data/list.tpl.html',
          controller: 'ListDataCtrl'
        });
    }])
.controller('ListDataCtrl', ['$scope', 'GeoServer', '$state', '$log',
    function($scope, GeoServer, $state, $log) {
      $scope.title = 'All Data';

      $scope.datastores = GeoServer.datastores.get().datastores;

      $scope.pagingOptions = {
        pageSizes: [25, 50, 100],
        pageSize: 25
      };
      $scope.gridOptions = {
        data: 'datastores',
        sortInfo: {fields: ['workspace'], directions: ['asc']},
        enableCellSelection: false,
        enableRowSelection: true,
        enableCellEdit: true,
        selectWithCheckboxOnly: false,
        selectedItems: $scope.gridSelections,
        multiSelect: true,
        columnDefs: [
          {field: 'workspace',
            displayName: 'Workspace',
            cellClass: 'text-left',
            width: '10%'
          },
          {field: 'store',
            displayName: 'Store',
            cellClass: 'text-left',
            width: '10%'
          },
          {field: 'type',
            displayName: 'Data Type',
            cellClass: 'text-left',
            width: '10%'
          },
          {field: 'source',
            displayName: 'Source',
            cellClass: 'text-left',
            width: '20%'
          },
          {field: 'description',
            displayName: 'Description',
            cellClass: 'text-left',
            width: '20%'
          },
          {field: 'srs',
            displayName: 'SRS',
            width: '10%'
          },
          {field: '', displayName: '', width: '*'}
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
