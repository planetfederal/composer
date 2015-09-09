/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.maps.new', [
  'ngSanitize',
  'gsApp.alertpanel',
  'gsApp.projfield',
  'gsApp.core.utilities',
  'ui.select',
  'ngGrid',
  'gsApp.inlineErrors'
])
.config(['$stateProvider',
  function($stateProvider) {
    $stateProvider.state('workspace.maps.new', {
      url: '/new',
      controller: 'NewMapCtrl',
      params: { workspace: {}, maps: {} }
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
      params: { workspace: {}, projs: {}, maps: {} }
    });
    $stateProvider.state('workspace.maps.new.add', {
      url: '/',
      views: {
        'addlayers@': {
          templateUrl:
            '/workspaces/detail/maps/createnew/map.new.addlayers.tpl.html',
          controller: 'NewMapSelectCtrl',
        }
      },
      params: { workspace: {}, layers: {}, mapInfo: {}, maps: {} }
    });
    $stateProvider.state('workspace.maps.new.import', {
      url: '/import',
      views: {
        'importnew@': {
          templateUrl:
            '/workspaces/detail/maps/createnew/map.new.importdata.tpl.html',
          controller: 'NewMapImportCtrl',
        }
      },
      params: { workspace: {}, maps: {} }
    });
    $stateProvider.state('workspace.maps.new.import.data', {
      views: {
        'importfile@': {
          url: '/file',
          templateUrl: '/workspaces/detail/data/import/import.file.tpl.html',
          controller: 'DataImportFileCtrl'
        },
        'importdb@': {
          url: '/db',
          templateUrl:
            '/workspaces/detail/data/import/import.db.tpl.html',
          controller: 'DataImportDbCtrl'
        }
      },
      params: { workspace: {}, maps: {} }
    });
  }])
.controller('NewMapCtrl', ['$modalInstance', '$scope', '$state',
  '$stateParams', '$rootScope', '$log', 'GeoServer', '$window',
  'AppEvent', '_', 'workspace', 'maps', '$modal',
  function ($modalInstance, $scope, $state, $stateParams, $rootScope,
    $log, GeoServer, $window, AppEvent, _, workspace, maps, $modal) {

    $scope.mapInfo = {};
    $scope.workspace = $stateParams.workspace;
    $scope.maps = maps;
    $scope.proj = null;

    $scope.opts = {
      paging: {
        pageSize: 25,
        currentPage: 1
      },
      sort: {
        fields: ['name'],
        directions: ['asc']
      },
      filter: {
        filterText: ''
      }
    };

    $scope.close = function (closeOrImport) {
      if (closeOrImport === 'import') {
        // open new modal to import
        $modalInstance.close({
          importOrClose: 'import',
          mapInfo: $scope.mapInfo
        });
      } else {
        $state.go('workspace.maps.main', {
          workspace: $scope.workspace
        });
        $modalInstance.close({importOrClose: 'close'});
      }
    };

    $scope.stepBack = function () {
      if ($state.is('workspace.maps.new.add')) {
        $state.go('workspace.maps.new.form');
      }
      if ($state.is('workspace.maps.new.import')) {
        $state.go('workspace.maps.new.add');
      }
    };

    $scope.addLayers = function() {
      $state.go('workspace.maps.new.add', {
        workspace: $scope.workspace,
        layers: $scope.layers,
        datastores: $scope.datastores,
        mapInfo: $scope.mapInfo
      });
    };

    $scope.is = function(route) {
      return $state.is('workspace.maps.new' +
        (route!=null?'.'+route:''));
    };

    $state.go('workspace.maps.new.form', {
      workspace: $scope.workspace,
      projs: $scope.projs,
      maps: $scope.maps
    });
  }])
// for creating a new map after selecting layers on the Layers tab
.controller('NewMapFromSelectedCtrl', ['$scope', '$state', '$stateParams',
  '$rootScope', '$log', 'GeoServer', '$window', 'AppEvent', '_',
  'projectionModel', 'workspace', 'mapInfo', '$modalInstance',
  function ($scope, $state, $stateParams, $rootScope, $log, GeoServer,
    $window, AppEvent, _, projectionModel, workspace, mapInfo,
    $modalInstance) {

    $scope.workspace = workspace;
    $scope.mapInfo = mapInfo;

    $scope.title = 'New Map from Selected Layers';
    $scope.step = 1;
    $scope.proj = null;

    $scope.crsTooltip =
      '<h5>Add a projection in EPSG</h5>' +
      '<p>Coordinate Reference System (CRS) info is available at ' +
        '<a href="http://prj2epsg.org/search" target="_blank">' +
          'http://prj2epsg.org' +
        '</a>' +
      '</p>';

    $scope.projEnabled = false;

    $scope.$watch('proj', function(newValue, oldValue) {
      if (newValue==='latlon') {
        $scope.mapInfo.proj = _.find($scope.projs, function(proj) {
          return proj.srs === 'EPSG:4326';
        });
      } else if (newValue==='mercator') {
        $scope.mapInfo.proj = _.find($scope.projs, function(proj) {
          return proj.srs === 'EPSG:3857';
        });
      } else if (newValue==='other') {
        $scope.mapInfo.proj = $scope.customproj;
      }
    });

    $rootScope.$on(AppEvent.ProjSet, function(scope, proj) {
      $scope.mapInfo.proj = proj;
    });

    projectionModel.fetchProjections().then(function() {
      $scope.projs = projectionModel.getDefaults();
      $scope.projEnabled = true;
      $scope.proj = 'latlon';   // default
    });

    $scope.close = function () {
      $modalInstance.close('close');
    };

    $scope.createMap = function () {
      GeoServer.map.create($scope.workspace, $scope.mapInfo).then(
        function(result) {
          if (result.success) {
            var map = result.data;
            $rootScope.alerts = [{
              type: 'success',
              message: 'Map ' + $scope.mapInfo.name + ' created  with ' +
                $scope.mapInfo.layers.length + ' layer(s).',
              fadeout: true
            }];
            $rootScope.$broadcast(AppEvent.MapAdded, map);
            $scope.close();
            $state.go('map.edit', {workspace: $scope.workspace,
                name: map.name});
          } else {
            var message = 'Could not create map: ' + result.data.message;
            if (result.data.trace.indexOf("too close to a pole") > -1) {
              message = 'Cannot create map in Mercator: the layer bounds touch the poles'
            }
            $rootScope.alerts = [{
              type: 'danger',
              message: message,
              details: result.data.trace,
              fadeout: true
            }];
          }
        });
    };

  }])
.controller('NewMapFormCtrl', ['$scope', '$state', '$stateParams',
  '$rootScope', '$log', 'GeoServer', '$window', 'AppEvent', '_',
  'projectionModel', '$timeout',
  function ($scope, $state, $stateParams, $rootScope, $log, GeoServer,
    $window, AppEvent, _, projectionModel, $timeout) {
    $scope.workspace = $stateParams.workspace;
    $scope.maps = $stateParams.maps;
    $scope.title = 'New Map';
    $scope.step = 1;
    $scope.proj = null;

    $scope.crsTooltip =
      '<h5>Add a projection in EPSG</h5>' +
      '<p>Coordinate Reference System (CRS) info is available at ' +
        '<a href="http://prj2epsg.org/search" target="_blank">' +
          'http://prj2epsg.org' +
        '</a>' +
      '</p>';

    $scope.projEnabled = false;

    $scope.$watch('proj', function(newValue, oldValue) {
      if (newValue==='latlon') {
        $scope.mapInfo.proj = _.find($scope.projs, function(proj) {
          return proj.srs === 'EPSG:4326';
        });
      } else if (newValue==='mercator') {
        $scope.mapInfo.proj = _.find($scope.projs, function(proj) {
          return proj.srs === 'EPSG:3857';
        });
      } else if (newValue==='other') {
        $scope.mapInfo.proj = $scope.customproj;
      }
    });

    $rootScope.$on(AppEvent.ProjSet, function(scope, proj) {
      $scope.mapInfo.proj = proj;
    });

    if ($scope.maps) {
      var timer = null;
      $scope.$watch('mapInfo.name', function(newVal) {
        if (timer==null && newVal != null) {
          timer = $timeout(function() {
            var found = _.find($scope.maps, function(map) {
              return map.name === $scope.mapInfo.name;
            });
            if (found) {
              $scope.newMap.name.$setValidity('alreadyExists', false);
            } else {
              $scope.newMap.name.$setValidity('alreadyExists', true);
            }
            timer  = null;
          }, 800);
        }
      });
    }

    projectionModel.fetchProjections().then(function() {
      $scope.projs = projectionModel.getDefaults();
      $scope.projEnabled = true;
      $scope.proj = 'latlon';   // default
    });

  }])
.controller('NewMapSelectCtrl', ['$scope', '$state', '$stateParams',
  '$rootScope', '$log', 'GeoServer', '$window', 'AppEvent', '_', '$modal',
  function ($scope, $state, $stateParams, $rootScope, $log, GeoServer,
    $window, AppEvent, _, $modal) {

    var modalWidth = 800;
    $scope.newMap = {};
    $scope.map = {};
    $scope.workspace = $stateParams.workspace;

    $scope.loadLayers = function() {
      var opts = $scope.opts;

      GeoServer.layers.get(
        $scope.workspace,
        opts.paging.currentPage - 1,
        opts.paging.pageSize,
        opts.sort.fields[0] + ':' + opts.sort.directions[0],
        opts.filter.filterText
      ).then(function(result) {
        if (result.success) {
          $scope.layers = result.data.layers;
          $scope.totalServerItems = result.data.total;
          if ($scope.layerOptions) {
            $scope.layerSelections.length = 0;
            $scope.layerOptions.$gridScope['allSelected'] = false;
          }
          
          if ($scope.hasLayers === undefined) {
            $scope.hasLayers = result.data.total !== 0;
          }
        } else {
          $rootScope.alerts = [{
            type: 'danger',
            message: 'Layers for workspace ' + $scope.workspace.name +
              ' could not be loaded: '+result.data.message,
            details: result.data.trace,
            fadeout: true
          }];
        }
      });
    };
    $scope.loadLayers();

    /**
     * Refresh if scope updated
     */
    function reloadLayers(newVal, oldVal) {
      if (newVal && newVal !== oldVal) {
        $scope.loadLayers();
      }
    }

    $scope.$watch('opts', reloadLayers, true);

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
            $state.go('map.edit', {workspace: $scope.workspace,
                name: map.name});
          } else {
            var message = 'Could not create map: ' + result.data.message;
            if (result.data.trace.indexOf("too close to a pole") > -1) {
              message = 'Cannot create map in Mercator: the layer bounds touch the poles'
            }
            $rootScope.alerts = [{
              type: 'danger',
              message: message,
              details: result.data.trace,
              fadeout: true
            }];
            $scope.errors = [{
              type: 'danger',
              message: message,
              fadeout: true
            }];
          }
        });
    }; // end createMap

    $scope.importNewLayers = function () {
      $state.go('workspace.maps.new.import', {
        workspace: $scope.workspace,
        maps: [$scope.mapInfo]
      });
    };

    // Available Layers Table

    $scope.gridWidth = {'width': modalWidth};
    $scope.selectAll = false;
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
          'ng-model="$parent.allSelected" ng-change="toggleSelectAll($parent.allSelected)"/>',
      int: function() {
        $log('done');
      },
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
          width: '10%',
          sortable: false
        }
      ],
      enableColumnResize: false,
      useExernalSorting: true,
      sortInfo: $scope.opts.sort
    };

    $scope.setMap = function(map) {
      $scope.selectedMap = map;
    };

  }])
.controller('NewMapImportCtrl', ['$scope',
  function ($scope) {

    $scope.close('import');

  }]);
