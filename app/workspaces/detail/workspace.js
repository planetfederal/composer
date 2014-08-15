angular.module('gsApp.workspaces.workspace', [
  'ngGrid'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.home', {
        url: '/home',
        templateUrl: '/workspaces/detail/workspace-home.tpl.html',
        controller: 'WorkspaceHomeCtrl'
      });
    }])
.controller('WorkspaceHomeCtrl', ['$scope', '$stateParams', 'GeoServer', '$log',
    function($scope, $stateParams, GeoServer, $log) {

      var wsName = $stateParams.workspace;
      $scope.title = wsName;

      $scope.pagingOptions = {
        pageSizes: [25, 50, 100],
        pageSize: 25
      };
      $scope.gridOptions = {
        data: 'layer2Data',
        columnDefs: [
          {field: 'name', displayName: 'Name'},
          {field: 'title', displayName: 'Title'},
          {field: 'type', displayName: 'Type'},
          {field: 'srs', displayName: 'SRS'},
          {
            field: 'style',
            displayName: 'Style',
            cellTemplate: '<div>hello</div>'
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

      $scope.layerData = [];

      // TODO change this to get workspace maps and data
      GeoServer.layers.get({workspace: wsName}).$promise
      .then(function(layers) {
        $scope.layerData = layers;
      });

    }]);

