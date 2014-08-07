angular.module('gsApp.layers', [
  'ngGrid',
  'ui.select',
  'gsApp.layers.style'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('layers', {
          url: '/layers',
          templateUrl: '/layers/layers.tpl.html',
          controller: 'LayersCtrl'
        })
        .state('layer', {
          abstract: true,
          url: '/layers/:workspace/:name',
          templateUrl: '/layers/detail/layer.tpl.html'
        });
    }])
.controller('LayersCtrl', ['$scope', 'GeoServer', '$state', '$log',
    function($scope, GeoServer, $state, $log) {
      $scope.title = 'Layers';

      $scope.onStyleEdit = function(layer) {
        $state.go('layer.style', {
          workspace: layer.workspace,
          name:layer.name
        });
      };
      $scope.pagingOptions = {
        pageSizes: [25,50,100],
        pageSize: 25
      };
      $scope.gridOptions = {
        data: 'layerData',
        columnDefs: [
          {field:'name', displayName:'Name'},
          {field:'title', displayName:'Title'},
          {field:'type', displayName:'Type'},
          {field:'srs', displayName:'SRS'},
          {
            field: 'style',
            displayName: 'Style',
            cellTemplate: '<div ng-class="col.colIndex()">'+
              '<a ng-click="onStyleEdit(row.entity)">Edit</a></div>'
          },
          {
            field: 'preview',
            displayName: 'Preview',
            cellTemplate: '<div ng-class="col.colIndex()"></div>'
          },
          {
            field: 'download',
            displayName: 'Download',
            cellTemplate: '<div ng-class="col.colIndex()"></div>'
          },
          {
            field: 'summary',
            displayName: 'Summary',
            cellTemplate: '<div ng-class="col.colIndex()"></div>'
          },
          {
            field: 'settings',
            displayName: 'Settings',
            cellTemplate: '<div ng-class="col.colIndex()"></div>'
          }
        ],
        enablePaging: true,
        showFooter: true,
        pagingOptions: $scope.pagingOptions,
        filterOptions: {
          filterText: '',
          useExternalFilter: true
        }
      };

      $scope.workspace = {};
      $scope.workspaces = [];

      $scope.workspaceChanged = function(ws) {
        GeoServer.layers.get({workspace:ws.name}).$promise
          .then(function(layers) {
            $scope.layerData = layers;
          });
      };

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
