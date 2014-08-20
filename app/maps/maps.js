angular.module('gsApp.maps', [
  'ngGrid',
  'ui.select',
  'gsApp.maps.compose'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('maps', {
          url: '/maps',
          templateUrl: '/maps/maps.tpl.html',
          controller: 'MapsCtrl'
        })
        .state('map', {
          abstract: true,
          url: '/maps/:workspace/:name',
          templateUrl: '/maps/detail/map.tpl.html'
        });
    }])
.controller('MapsCtrl', ['$scope', 'GeoServer', '$state', '$log',
    function($scope, GeoServer, $state, $log) {
      $scope.title = 'All Maps';

      $scope.workspaceChanged = function(ws) {
        GeoServer.maps.get({workspace: ws.name}).$promise
          .then(function(maps) {
            $scope.mapData = maps;
          });
      };

      $scope.onCompose = function(map) {
        $state.go('map.compose', {
          workspace: map.workspace,
          name: map.name
        });
      };

      $scope.pagingOptions = {
        pageSizes: [25, 50, 100],
        pageSize: 25
      };
      $scope.gridOptions = {
        data: 'mapData',
        columnDefs: [
          {field: 'name', displayName: 'Name'},
          {field: 'title', displayName: 'Title'},
          {
            field: 'compose',
            displayName: 'Compose',
            cellTemplate: '<div ng-class="col.colIndex()">' +
              '<a ng-click="onCompose(row.entity)">Compose</a></div>'
          },
          {
            field: 'preview',
            displayName: 'Preview',
            cellTemplate: '<div ng-class="col.colIndex()"></div>'
          },
          {
            field: 'settings',
            displayName: 'Settings',
            cellTemplate: '<div ng-class="col.colIndex()"></div>'
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

      $scope.workspace = {};
      $scope.workspaces = [];

      GeoServer.workspaces.get().$promise.then(function(workspaces) {
        workspaces.filter(function(ws) {
          return ws['default'];
        }).forEach(function(ws) {
          $scope.workspace.selected = ws;
          $scope.workspaceChanged(ws);
        });

        $scope.workspaces = workspaces;
      });

    }]);

