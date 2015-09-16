/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.modals.maps.new', [
  'ngSanitize',
  'gsApp.alertpanel',
  'gsApp.import',
  'gsApp.modal',
  'gsApp.projfield',
  'gsApp.core.utilities',
  'ui.select',
  'ngGrid',
  'gsApp.inlineErrors'
])
.config(['$stateProvider',
  //Additionally, redirection to/from import?
  function($stateProvider) {
    $stateProvider.state('workspace.newmap', {
      url: '/new'
    });
    $stateProvider.state('workspace.newmap.form', {
      url: '/',
      views: {
        'mapform@': {
          templateUrl:
            '/components/modals/map/map.new.form.tpl.html',
          controller: 'NewMapFormCtrl',
        }
      },
      params: { workspace: {}, mapInfo: {}}
    });
    $stateProvider.state('workspace.newmap.import', {
      url: '/',
      views: {
        'mapimport@': {
          templateUrl:
            '/components/modals/map/map.new.import.tpl.html',
          controller: 'NewMapImportCtrl',
        }
      },
      params: { workspace: {}, mapInfo: {}}
    });
    $stateProvider.state('workspace.newmap.layers', {
      url: '/',
      views: {
        'maplayers@': {
          templateUrl:
            '/components/modals/map/map.new.layers.tpl.html',
          controller: 'NewMapLayersCtrl',
        }
      },
      params: { workspace: {}, mapInfo: {}}
    });
  }])
//Setup and routing
.controller('NewMapCtrl', ['$controller', '$modalInstance', '$scope', '$state',
  '$stateParams', '$rootScope', '$log', 'GeoServer', '$window',
  'AppEvent', '_', 'workspace', 'mapInfo', '$modal',
  function ($controller, $modalInstance, $scope, $state, $stateParams, $rootScope,
    $log, GeoServer, $window, AppEvent, _, workspace, mapInfo, $modal) {

    angular.extend(this, $controller('ModalCtrl', {$scope: $scope}));

    $scope.workspace = workspace;    
    $scope.proj = null;
    $scope.step=0;

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

    //TODO: Setup layers
    $scope.title = 'New Map';
      $scope.nextButton = 'Add Layers \&rarr;' //move to html
    if (mapInfo) {
      $scope.mapInfo = mapInfo;
      if ($scope.mapInfo.layers && Array.isArray($scope.mapInfo.layers) && $scope.mapInfo.layers.length > 0) {
        
        $scope.title = 'New Map from Selected Layers';
        $scope.nextButton = 'Create New Map' // move to html. Make seperate from Add Layers?
        //TODO: Show layerlist (collapsible) and "Create Map" button
      } 
    } else {
      $scope.mapInfo = {layers:[]};
    }

    $scope.next = function () {
      if ($state.is('workspace.newmap.form')) {
        $scope.step=2;
        $state.go('workspace.newmap.import', {
          workspace: $scope.workspace,
          mapInfo: $scope.mapInfo
        });
      }
      if ($state.is('workspace.newmap.import')) {
        $scope.step=3;
        $state.go('workspace.newmap.layers', {
          workspace: $scope.workspace,
          mapInfo: $scope.mapInfo
        });
      }
    }

    $scope.back = function () {
      if ($state.is('workspace.newmap.import')) {
        $scope.step=1;
        $state.go('workspace.newmap.form');
      }
      if ($state.is('workspace.newmap.layers')) {
        if (mapInfo.layers.length > 0) {
          $scope.selectLayers = true;
        }
        $scope.step=2;
        $state.go('workspace.newmap.import');
      }
    };

    //return null on cancel, map on success.
    $scope.close = function (result) {
      $modalInstance.close(result);
    };

    //Get current state
    $scope.is = function(route) {
      return $state.is('workspace.newmap' +
        (route!=null?'.'+route:''));
    };

    $scope.importNewLayers = function () {
      $modal.open({
        templateUrl: '/components/import/import.tpl.html',
        controller: 'DataImportCtrl',
        backdrop: 'static',
        size: 'lg',
        resolve: {
          workspace: function() {
            return $scope.workspace;
          },
          mapInfo: function() {
            return $scope.mapInfo;
          },
          contextInfo: function() {
            return {
              title:'Import layers into new map: '+$scope.mapInfo.name,
              hint:'Create new map from selected layers',
              button:'Create new map'
            };
          }
        }
      }).result.then(function(param) {
        if (param) {
          $scope.mapInfo.layers = param;
          $scope.step=1
        }
        $state.go('workspace.newmap.form', {
          workspace: $scope.workspace,
          mapInfo: $scope.mapInfo
        });
      });
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
            $scope.close(map);
            $state.go('editmap', {workspace: $scope.workspace,
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

    $scope.step=1;
    $state.go('workspace.newmap.form', {
      workspace: $scope.workspace,
      mapInfo: $scope.mapInfo
    });
  }])
// Map settings
.controller('NewMapFormCtrl', ['$scope', '$state', '$stateParams',
  '$rootScope', '$log', 'GeoServer', '$window', 'AppEvent', '_',
  'projectionModel',
  function ($scope, $state, $stateParams, $rootScope, $log, GeoServer,
    $window, AppEvent, _, projectionModel, workspace, mapInfo) {

    $scope.step=1;
    $scope.workspace = $stateParams.workspace;
    $scope.mapInfo = $stateParams.mapInfo;

    $scope.proj=null;
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
  }])
.controller('NewMapImportCtrl', ['$log', '$modal', '$rootScope', '$scope', '$state', '$stateParams',
   '$timeout', '$window',  '_', 'AppEvent', 'GeoServer', 
  function ($log, $modal, $rootScope, $scope, $state, $stateParams,
   $timeout, $window,  _, AppEvent, GeoServer) {

    $scope.step=2;
    $scope.workspace = $stateParams.workspace;
    $scope.mapInfo = $stateParams.mapInfo;

    //Get layer count
    GeoServer.layers.get($scope.workspace,0,0,'','').then(function(result) {
      if (result.success) {
        $scope.layers = result.data.total;
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

  }])
//Layer Select
.controller('NewMapLayersCtrl', ['$scope', '$state', '$stateParams',
  '$rootScope', '$log', 'GeoServer', '$window', 'AppEvent', '_', '$modal',
  function ($scope, $state, $stateParams, $rootScope, $log, GeoServer,
    $window, AppEvent, _, $modal) {

    $scope.step=3;
    $scope.workspace = $stateParams.workspace;
    $scope.mapInfo = $stateParams.mapInfo;

    var modalWidth = 800;

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
            $scope.layerOptions.$gridScope.selectedItems.length = 0;
            $scope.layerOptions.$gridScope['allSelected'] = false;
            $scope.mapInfo.layers = $scope.layerOptions.$gridScope.selectedItems;
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

    // Refresh if scope updated
    $scope.$watch('opts', function (newVal, oldVal) {
      if (newVal && newVal !== oldVal) {
        $scope.loadLayers();
      }
    }, true);

    // Available Layers Table
    $scope.gridWidth = {'width': modalWidth};
    $scope.selectAll = false;

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
      selectedItems: [],
      selectWithCheckboxOnly: false,
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
      sortInfo: $scope.opts.sort,
    };
  }]);
