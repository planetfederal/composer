angular.module('gsApp.workspaces.data.import', [
  'ngGrid',
  'angularFileUpload',
  'ui.bootstrap',
  'gsApp.core.utilities',
  'gsApp.projfield'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.data.import.file', {
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
        params: { workspace: {} }
      });
      $stateProvider.state('workspace.data.import.details', {
        views: {
          'importdetails@': {
            url: '/details',
            templateUrl:
              '/workspaces/detail/data/import/import.details.tpl.html',
            controller: 'DataImportDetailsCtrl',
          }
        },
        params: { workspace: {}, import: {}, mapInfo: {} }
      });
      $stateProvider.state('workspace.data.import.newmap', {
        views: {
          'newmap@': {
            url: '/newmap',
            templateUrl:
              '/workspaces/detail/data/import/import.newmap.tpl.html',
            controller: 'ImportNewMapCtrl'
          }
        },
        params: { workspace: {}, import: {}, mapInfo: {} }
      });
    }])
.controller('DataImportCtrl', ['$scope', '$state', '$stateParams', 'GeoServer',
  '$modal', '$modalInstance', 'workspace', 'mapInfo', 'mapInfoService',
  '$rootScope', 'mapsListModel',
    function($scope, $state, $stateParams, GeoServer, $modal, $modalInstance,
        workspace, mapInfo, mapInfoService, $rootScope, mapsListModel) {

      var wsName = workspace;
      $scope.mapInfo = mapInfo;
      mapInfoService.setMapInfo(mapInfo);

      $scope.title = 'Import Data';
      if (mapInfoService.getMapInfo()) {
        $scope.title += ' for ' + $scope.mapInfo.name;
      }

      $scope.showImportFile = true;
      $scope.showImportDB = false;
      $scope.showImportDetails = false;


      $scope.close = function() {
        $state.go('workspace.data.main', {workspace: wsName});
        $modalInstance.dismiss('close');
      };

      $scope.is = function(route) {
        return $state.is('workspace.data.import'+(route!=null?'.'+route:''));
      };

      $scope.go = function(route) {
        $state.go('workspace.data.import.'+route, {
          workspace: wsName
        });
      };

      $scope.next = function(imp) {
        $scope.showImportFile = false;
        $scope.showImportDetails = true;
        $state.go('workspace.data.import.details', {
          'workspace': wsName,
          'import': imp.id
        });
      };

      $scope.inFileFlow = function() {
        var test = $scope.is() || $scope.is('file');
        test = test || $state.includes('workspace.data.import.details');
        test = test || $state.includes('workspace.data.import.newmap');
        return test;
      };

      GeoServer.workspace.get(wsName).then(function(result) {
        if (result.success) {
          $scope.workspace = result.data;
          $scope.go('file');
        }
      });

      $scope.importResult = null;
      $scope.setImportResult = function(result) {
        $scope.importResult = result;
      };

      $scope.completeNewMap = function() {
        var mapInfo = mapInfoService.getMapInfo();

        GeoServer.map.create(wsName, mapInfo).then(
          function(result) {
            if (result.success) {
              var map = result.data;
              $rootScope.alerts = [{
                type: 'success',
                message: 'Map ' + map.name + ' created  with ' +
                  map.layers.length + ' layer(s).',
                fadeout: true
              }];
              mapsListModel.addMap(map);
              $scope.close('map_added');
              $state.go('map.compose', {workspace: wsName,
                name: map.name});
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Error creating new map.',
                fadeout: true
              }];
            }
          });
      };
    }])
.controller('DataImportFileCtrl', ['$scope', '$state', '$upload', '$log',
    'GeoServer', '$stateParams', 'AppEvent',
    function($scope, $state, $upload, $log, GeoServer, $stateParams, AppEvent) {

      var wsName = $stateParams.workspace;

      $scope.initProgress = function() {
        $scope.progress = {percent: 0};
      };

      $scope.onFileSelect = function(files) {
        $scope.file = files[0];
        $scope.setImportResult(null);
        $scope.initProgress();
      };
      $scope.upload = function() {
        $upload.upload({
          url: GeoServer.import.url($scope.workspace.name),
          method: 'POST',
          file: $scope.file
        }).progress(function(e) {
          $scope.progress.percent = parseInt(100.0 * e.loaded / e.total);
        }).success(function(e) {
          $scope.setImportResult(e);
          $scope.$broadcast(AppEvent.StoreAdded, {workspace: $scope.workspace});
        });
      };
      $scope.initProgress();

    }])
.controller('DataImportDbCtrl', ['$scope', '$state', '$stateParams', '$log',
    'GeoServer', '_',
    function($scope, $state, $stateParams, $log, GeoServer, _) {
      $scope.workspace = $stateParams.workspace;
      $scope.maps = $stateParams.maps;
      $scope.chooseTables = false;

      $scope.chooseFormat = function(f) {
        GeoServer.format.get(f.name).then(function(result) {
          if (result.success) {
            $scope.format = result.data;

            $scope.params = _.mapValues($scope.format.params, function(param) {
              return angular.extend(param, {
                value: param.default
              });
            });
          }
        });
      };

      $scope.connect = function() {
        $scope.connecting = true;
        var content = _.mapValues($scope.params, function(p) {
          return p.value;
        });

        GeoServer.import.post($scope.workspace, content)
          .then(function(result) {
            if (result.success) {
              $scope.error = null;
              $scope.setImportResult(result.data);
            }
            else {
              $scope.error = result.data;
            }
            $scope.connecting = false;
          });
      };

      GeoServer.formats.get().then(function(result) {
        if (result.success) {
          $scope.formats = result.data.filter(function(f) {
            return f.type == 'database';
          });
        }
      });
    }])
.controller('DataImportDetailsCtrl', ['$scope', '$state', '$stateParams',
    '$log', 'GeoServer', '$rootScope', 'AppEvent', 'mapInfoService',
    function($scope, $state, $stateParams, $log, GeoServer, $rootScope,
      AppEvent, mapInfoService) {

      $scope.createMap = false; // for a new map not yet created
      $scope.workspace = $stateParams.workspace;
      $scope.import = $stateParams.import;
      $scope.layerSelections = [];


      // if mapInfo's defined it's import not create map workflow
      if (!mapInfoService.getMapInfo()) {
        GeoServer.maps.get($scope.workspace).then(
          function(result) {
            if (result.success) {
              $scope.maps = result.data;
            }
          });
      }

      var baseGridOpts = {
        enableCellSelection: false,
        enableRowSelection: true,
        enableCellEdit: false,
        showSelectionCheckbox: true,
        selectWithCheckboxOnly: false,
        multiSelect: true,
        selectedItems: $scope.layerSelections,
        afterSelectionChange: function(rowItem, event) {
          if (mapInfoService.getMapInfo()) {
            mapInfoService.setMapInfoLayers($scope.layerSelections);
          }
        }
      };

      $scope.completedGridOpts = angular.extend({
        data: 'importedLayers',
        checkboxHeaderTemplate:
          '<input class="ngSelectionHeader" type="checkbox"' +
            'ng-model="allSelected" ng-init="toggleSelectAll(true);"' +
              'ng-change="toggleSelectAll(allSelected)"/>',
        sortInfo: {fields: ['name'], directions: ['asc']},
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
            width: '50%'
          },
          {field: 'geometry',
            displayName: 'Type',
            cellClass: 'text-center',
            cellTemplate:
              '<div get-type ' +
                'geometry="{{row.entity.geometry}}">' +
              '</div>',
            width: '20%'
          }
        ],
        enablePaging: true,
        enableColumnResize: false,
        showFooter: true,
        totalServerItems: 'importedLayers.length',
        pagingOptions: {
          pageSize: 10,
          currentPage: 1
        }
      }, baseGridOpts);

      $scope.pendingGridOpts = angular.extend({
        data: 'pendingLayers',
        enablePaging: false,
        showFooter: false,
        columnDefs: [
          {field: 'file', displayName: 'File'},
          {
            displayName: 'Projection',
            cellTemplate:
              '<div ng-switch on="row.entity.success">' +
                '<proj-field ng-switch-when="false" proj="row.entity.proj">' +
                '</proj-field>' +
                '<div ng-switch-when="true" class="ngCellText">' +
                ' {{ row.entity.proj.srs }}'+
                '<div>' +
              '</div>'
          },
          {
            displayName: '',
            cellTemplate:
              '<div class="ngCellText" ' +
                'ng-show="!row.entity.success && row.entity.proj != null">'+
                '<a ng-click="applyProjToAll(row.entity.proj)" ' +
                '  >Apply to all</a> ' +
                '<i class="fa fa-mail-forward fa-rotate-180"></i>' +
              '</div>' +
              '<div class="ngCellText" ng-show="row.entity.success == true">'+
                '<i class="fa fa-check-circle"></i> Layer imported.' +
              '</div>'
          },
          {
            displayName: '',
            cellTemplate:
              '<button ng-click="reimport()"' +
                'ng-disabled="row.entity.success == true"' +
                  'class="btn btn-success btn-xs">' +
              '<i class="fa fa-refresh"></i> Re-import</button>'
          }
        ]
      }, baseGridOpts);

      GeoServer.import.get($scope.workspace, $scope.import)
        .then(function(result) {
          if (result.success) {
            var imp = result.data;
            $log.log(imp);
            $scope.import = imp;

            $scope.importedLayers = imp.imported.map(function(t) {
              t.layer.source = t.file;
              return t.layer;
            });
            $scope.pendingLayers = imp.pending.map(function(t) {
              t.success = false;
              return t;
            });
          } else {
            $rootScope.alerts = [{
              type: 'danger',
              message: 'Could not import file.',
              fadeout: true
            }];
          }
        });

      $scope.applyProjToAll = function(proj) {
        $scope.import.pending.filter(function(task) {
          return task.problem == 'NO_CRS' && typeof task.proj == 'undefined';
        }).forEach(function(task) {
          task.proj = proj;
        });
      };

      $scope.reimport = function() {
        $scope.import.pending.filter(function(task) {
          return task.problem == 'NO_CRS' && task.proj != null;
        }).forEach(function(task) {
          GeoServer.import.update($scope.workspace, $scope.import.id, task)
            .then(function(result) {
              task.success = result.success && result.data.layer != null;
              if (result.success) {
                $scope.$broadcast(AppEvent.StoreAdded);
                result.data.layer.source = result.data.file;
                $scope.importedLayers.push(result.data.layer);
                mapInfoService.setMapInfoLayers($scope.importedLayers);
              }
            });
        });
      };

      $scope.cancel = function() {
        $state.go('workspace.data.main', {workspace:$scope.workspace.name});
      };

      $scope.setMap = function(map) {
        $scope.selectedMap = map;
      };

      $scope.createNewMap = function(selectedLayers) {
        var newMapInfo = {};
        newMapInfo.layers = [];
        var imported = $scope.importedLayers;
        for (var i=0; i < selectedLayers.length; i++) {
          for (var k=0; k < imported.length; k++) {
            if (selectedLayers[i].file &&
                selectedLayers[i].file===imported[k].source) {
              newMapInfo.layers.push({
                'name': imported[k].name,
                'workspace': $scope.workspace
              });
            } else if (selectedLayers[i].source &&
                selectedLayers[i].source===imported[k].source) {
              newMapInfo.layers.push({
                'name': imported[k].name,
                'workspace': $scope.workspace
              });
            }
          }
        }
        $state.go('workspace.data.import.newmap', {
          'workspace': $scope.workspace,
          'import': $scope.import,
          'mapInfo': newMapInfo
        });
      };

      $scope.addSelectedToMap = function(selectedLayers) {
        var map = $scope.selectedMap;

        var newMapInfo = {
          'name': map.name,
          'proj': map.proj,
          'abstract': map.abstract
        };
        newMapInfo.layers = [];
        var imported = $scope.importedLayers;
        for (var i=0; i < selectedLayers.length; i++) {
          for (var k=0; k < imported.length; k++) {
            if (selectedLayers[i].file===imported[k].source) {
              newMapInfo.layers.push({
                'name': imported[k].name,
                'workspace': $scope.workspace
              });
            } else if (selectedLayers[i].source &&
              selectedLayers[i].source===imported[k].source) {
              newMapInfo.layers.push({
                'name': imported[k].name,
                'workspace': $scope.workspace
              });
            }
          }
        }
        GeoServer.map.layers.add($scope.workspace,
          newMapInfo.name, newMapInfo.layers).then(function(result) {
            if (result.success) {
              $rootScope.alerts = [{
                type: 'success',
                message: $scope.importedLayers.length +
                  ' layer(s) added to map ' + newMapInfo.name + '.',
                fadeout: true
              }];
              $scope.close();
              $state.go('map.compose', {workspace: map.workspace,
                name: newMapInfo.name});
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Layer(s) could not be added to map ' +
                  newMapInfo.name + '.',
                fadeout: true
              }];
            }
          });
      };
    }])
.controller('ImportNewMapCtrl', ['$scope', '$state', '$stateParams', '$log',
  'GeoServer', '$rootScope', 'mapsListModel',
    function($scope, $state, $stateParams, $log, GeoServer, $rootScope,
      mapsListModel) {

      $scope.workspace = $stateParams.workspace;
      $scope.mapInfo = $stateParams.mapInfo;
      $scope.import = $stateParams.import;
      $scope.selectedLayers = $scope.mapInfo.layers;

      $scope.crsTooltip =
        '<h5>Add a projection in EPSG</h5>' +
        '<p>Coordinate Reference System (CRS) info is available at ' +
          '<a href="http://prj2epsg.org/search" target="_blank">' +
            'http://prj2epsg.org' +
          '</a>' +
        '</p>';

      $scope.back = function() {
        $state.go('workspace.data.import.details', {
          workspace: $scope.workspace,
          import: $scope.import,
          mapInfo: $scope.mapInfo
        });
      };

      $scope.createMap = function() {
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
              mapsListModel.addMap(map);
              $state.go('map.compose', {workspace: $scope.workspace,
                name: map.name});
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Error creating new map.',
                fadeout: true
              }];
            }
          });
      };

    }])
.service('mapInfoService', function() {
  var _this = this;
  this.mapInfo = null;

  this.setMapInfo = function(mapInfo) {
    _this.mapInfo = mapInfo;
  };

  this.setMapInfoLayers = function(layers) {
    _this.mapInfo.layers = layers;
  };

  this.getMapInfo = function() {
    return _this.mapInfo;
  };
});

