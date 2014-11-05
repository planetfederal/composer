angular.module('gsApp.workspaces.maps.new', [
  'ngSanitize',
  'gsApp.alertpanel',
  'gsApp.projfield',
  'gsApp.core.utilities',
  'ui.select',
  'ngGrid'
])
.config(['$stateProvider',
  function($stateProvider) {
    $stateProvider.state('workspace.maps.new', {
      url: '/data',
      controller: 'NewMapCtrl',
      params: { workspace: {} }
    });
    $stateProvider.state('workspace.maps.new.form', {
      url: '/',
      views: {
        'newmap@': {
          templateUrl:
            '/workspaces/detail/maps/createnew/map.new.map.tpl.html',
          controller: 'NewMapFormCtrl',
        }
      },
      params: { workspace: {}, projs: {} }
    });
    $stateProvider.state('workspace.maps.new.import', {
      url: '/',
      views: {
        'importnew@': {
          templateUrl:
            '/workspaces/detail/maps/createnew/map.new.importlayers.tpl.html',
          controller: 'NewMapSelectCtrl',
        }
      },
      params: { workspace: {}, layers: {}, mapInfo: {} }
    });
  }])
.controller('NewMapCtrl', ['$modalInstance', '$scope', '$state', '$stateParams',
  '$rootScope', '$log', 'GeoServer', '$window', 'AppEvent',
  '_', 'workspace',
  function ($modalInstance, $scope, $state, $stateParams, $rootScope,
    $log, GeoServer, $window, AppEvent, _, workspace) {

    $scope.mapInfo = {};
    $scope.workspace = $stateParams.workspace;

    $scope.close = function () {
      $state.go('workspace.maps.main', {workspace: $scope.workspace});
      $modalInstance.dismiss('close');
    };

    $scope.pagingOptions = {
      pageSizes: [25, 50, 100],
      pageSize: 25,
      currentPage: 1
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

    $scope.addLayers = function() {
      $state.go('workspace.maps.new.import', {
        workspace: $scope.workspace,
        layers: $scope.layers,
        mapInfo: $scope.mapInfo
      });
    };

    $scope.is = function(route) {
      return $state.is('workspace.maps.new'+(route!=null?'.'+route:''));
    };

    $state.go('workspace.maps.new.form', {
      workspace: $scope.workspace,
      projs: $scope.projs
    });

  }])
.controller('NewMapFormCtrl', ['$scope', '$state', '$stateParams',
  '$rootScope', '$log', 'GeoServer', '$window', 'AppEvent',
  '_', 'projectionModel',
  function ($scope, $state, $stateParams, $rootScope, $log, GeoServer, $window,
    AppEvent, _, projectionModel) {
    $scope.workspace = $stateParams.workspace;
    $scope.title = 'New Map';
    $scope.step = 1;
    $scope.proj = 'mercator';

    $scope.crsTooltip =
      '<h5>Add a projection in EPSG</h5>' +
      '<p>Coordinate Reference System (CRS) info is available at ' +
        '<a href="http://prj2epsg.org/search" target="_blank">' +
          'http://prj2epsg.org' +
        '</a>' +
      '</p>';

    $scope.projEnabled = false;

    projectionModel.fetchProjections().then(function() {
      $scope.projs = projectionModel.getDefaults();
      $scope.projEnabled = true;
      $scope.$watch('proj', function(newValue, oldValue) {
        if (newValue==='mercator') {
          $scope.mapInfo.proj = _.find($scope.projs, function(proj) {
            return proj.srs === 'EPSG:3857';
          });
        } else if (newValue==='latlon') {
          $scope.mapInfo.proj = _.find($scope.projs, function(proj) {
            return proj.srs === 'EPSG:4326';
          });
        } else if (newValue==='other') {
          $scope.mapInfo.proj = $scope.customproj;
        }
      });
    });

  }])
.controller('NewMapSelectCtrl', ['$scope', '$state', '$stateParams',
  '$rootScope', '$log', 'GeoServer', '$window', 'AppEvent',
  '_',
  function ($scope, $state, $stateParams, $rootScope, $log, GeoServer, $window,
    AppEvent, _) {

    var modalWidth = 800;
    $scope.selectedLayers = [];
    $scope.newMap = {};
    $scope.map = {};
    $scope.workspace = $stateParams.workspace;

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
            $rootScope.$broadcast(AppEvent.MapAdded, map);
            $scope.close();
            $state.go('map.compose', {workspace: $scope.workspace,
                name: map.name});
          } else {
            $rootScope.alerts = [{
              type: 'danger',
              message: 'Could not create map: ' + result.data.message,
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

    $scope.gridWidth = {'width': modalWidth};

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
      enableRowReordering: false,
      jqueryUIDraggable: false,
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
        {field: 'name', displayName: 'Layer', width: '40%'},
        {field: 'title',
          displayName: 'Title',
          enableCellEdit: false,
          cellTemplate:
            '<div class="grid-text-padding"' +
              'alt="{{row.entity.description}}"' +
              'title="{{row.entity.description}}">' +
              '{{row.entity.title}}' +
            '</div>',
          width: '50%'
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

    $scope.setMap = function(map) {
      $scope.selectedMap = map;
    };

  }]);
