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
  'baseUrl', '$window', '$state',
    function($scope, $stateParams, GeoServer, $log, baseUrl, $window, $state) {

      var wsName = $stateParams.workspace;
      $scope.title = wsName;
      $scope.thumbnails = {};
      $scope.olmaps = {};

      // Maps

      GeoServer.maps.get({workspace: wsName}).$promise
        .then(function(maps) {

          $scope.maps = maps;

          // load all map thumbnails & metadata
          for (var i=0; i < $scope.maps.length; i++) {
            var map = $scope.maps[i];
            var layers = '';

            $scope.maps[i].workspace = wsName;
            $scope.maps[i].layergroupname = wsName + ':' + map.name;
            $scope.maps[i].layerCount = map.layers.length;

            var url = GeoServer.map.thumbnail.get(map.workspace, map,
              map.layergroupname, 250, 250);
            var bbox = '&bbox=' + map.bbox.west + ',' + map.bbox.south +
              ',' + map.bbox.east + ',' + map.bbox.north;
            var srs = '&srs=' + map.proj.srs;

            $scope.thumbnails[map.name] = baseUrl + url + bbox +
              '&format=image/png' + srs;
          }

        });

      $scope.newWindow = function(map) {
        var baseUrl = GeoServer.map.thumbnail.get(map.workspace, map,
          map.layergroupname, 800, 400);
        var url = $scope.thumbnails[map.name];
        $window.open(url);
      };

      $scope.onEdit = function(map) {
        $state.go('map.compose', {
          workspace: map.workspace,
          name: map.name
        });
      };


      // Data

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

