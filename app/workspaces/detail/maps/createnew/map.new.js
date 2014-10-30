angular.module('gsApp.workspaces.maps.new', [
  'ngSanitize',
  'gsApp.alertpanel',
  'gsApp.projfield',
  'gsApp.core.utilities',
  'ui.select',
  'ngGrid'
])
.controller('NewMapCtrl', ['$scope', '$state', '$stateParams', '$rootScope',
  '$log', 'GeoServer', '$window', 'AppEvent',
  function ($scope, $state, $stateParams, $rootScope, $log, GeoServer, $window,
    AppEvent) {

    $scope.workspace = $stateParams.workspace;
    $scope.mapInfo = {
      'abstract': ''
    };
    $scope.selectedLayers = [];
    $scope.newMap = {};
    $scope.map = {};
    $scope.title = 'New Map';
    $scope.step = 1;

    $scope.crsTooltip =
      '<h5>Add a projection in EPSG</h5>' +
      '<p>Coordinate Reference System (CRS) info is available at ' +
        '<a href="http://prj2epsg.org/search" target="_blank">' +
          'http://prj2epsg.org' +
        '</a>' +
      '</p>';

    $scope.cancel = function() {
      $state.go('workspace.maps.main', {workspace:$scope.workspace});
    };

    $scope.createMap = function(layerSelections) {
      $scope.mapInfo.layers = [];
      for (var i=0; i< layerSelections.length; i++) {
        $scope.mapInfo.layers.push({
          'name': layerSelections[i].name,
          'workspace': $scope.workspace
        });
      }

      GeoServer.map.create($scope.workspace, $scope.mapInfo).then(
        function(result) {
          if (result.success) {
            var map = result.data;
            $rootScope.alerts = [{
              type: 'success',
              message: 'Map ' + map.name + ' created  with ' +
                map.layers.length + ' layer(s).',
              fadeout: true
            }];
            map.layergroupname = $scope.workspace + ':' + map.name;
            $scope.maps.push(map);
            $rootScope.$broadcast(AppEvent.MapUpdated, {
              'new': map
            });
            $state.go('map.compose', {workspace: $scope.workspace,
                name: map.name});
          } else {
            $rootScope.alerts = [{
              type: 'danger',
              message: 'Could not create map.',
              fadeout: true
            }];
          }
        });
    }; // end createMap

    $scope.createNewLayers = function() {
      $state.go('workspace.data.import.file', {
        workspace: $scope.workspace,
        maps: [$scope.mapInfo]
      });
    };

    // Available Layers Table
    $scope.layers = [];
    $scope.totalServerItems = [];

    $scope.gridWidth = {'width': $window.innerWidth - 150};

    $scope.pagingOptions = {
      pageSizes: [25, 50, 100],
      pageSize: 25,
      currentPage: 1
    };
    $scope.filterOptions = {
        filterText: '',
        useExternalFilter: true
      };
    $scope.layerSelections = [];

    $scope.layerOptions = {
      data: 'layers',
      enableCellSelection: false,
      enableRowSelection: true,
      enableCellEdit: false,
      checkboxHeaderTemplate:
        '<input class="ngSelectionHeader" type="checkbox"' +
          'ng-model="allSelected" ng-change="toggleSelectAll(allSelected)"/>',
      int: function() {
        $log('done');
      },
      sortInfo: {fields: ['name'], directions: ['asc']},
      showSelectionCheckbox: true,
      selectWithCheckboxOnly: false,
      selectedItems: $scope.layerSelections,
      multiSelect: true,
      columnDefs: [
        {field: 'name', displayName: 'Layer', width: '30%'},
        {field: 'title',
          displayName: 'Title',
          enableCellEdit: true,
          cellTemplate:
            '<div class="grid-text-padding"' +
              'alt="{{row.entity.description}}"' +
              'title="{{row.entity.description}}">' +
              '{{row.entity.title}}' +
            '</div>',
          width: '30%'
        },
        {field: 'geometry',
          displayName: 'Type',
          cellClass: 'text-center',
          cellTemplate:
            '<div get-type ' +
              'geometry="{{row.entity.geometry}}">' +
            '</div>',
          width: '10%'
        }
      ],
      enablePaging: true,
      enableColumnResize: false,
      showFooter: true,
      totalServerItems: 'totalServerItems',
      pagingOptions: $scope.pagingOptions
    };

    $scope.loadLayers = function() {
      GeoServer.layers.get(
        $scope.workspace,
        $scope.pagingOptions.currentPage-1,
        $scope.pagingOptions.pageSize
      ).then(function(result) {
        if (result.success) {
          $scope.layers = result.data.layers;
          $scope.totalServerItems = result.data.total;
        } else {
          $rootScope.alerts = [{
            type: 'danger',
            message: 'Layers for workspace ' + $scope.workspace.name +
              ' could not be loaded.',
            fadeout: true
          }];
        }
      });
    };
    $scope.loadLayers();

    $scope.setMap = function(map) {
      $scope.selectedMap = map;
    };

  }]);
