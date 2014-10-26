angular.module('gsApp.workspaces.data.import', [
  'ngGrid',
  'angularFileUpload',
  'gsApp.core.utilities',
  'gsApp.projfield'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.data.import.file', {
        url: '/file',
        templateUrl: '/workspaces/detail/data/import/import.file.tpl.html',
        controller: 'DataImportFileCtrl',
        params: { workspace: {}, maps: {value: null} }
      });
      $stateProvider.state('workspace.data.import.db', {
        url: '/db',
        templateUrl: '/workspaces/detail/data/import/import.db.tpl.html',
        controller: 'DataImportDbCtrl',
        params: { workspace: {}, maps: {value: null} }
      });
      $stateProvider.state('workspace.data.import.details', {
        url: '/details',
        templateUrl: '/workspaces/detail/data/import/import.details.tpl.html',
        controller: 'DataImportDetailsCtrl',
        params: {workspace: {}, import: {}, maps: {value: null} }
      });
    }])
.controller('DataImportCtrl', ['$scope', '$state', '$stateParams', 'GeoServer',
    function($scope, $state, $stateParams, GeoServer) {

      $scope.title = 'Import Data';

      var wsName = $stateParams.workspace;
      var maps = $stateParams.maps;

      $scope.is = function(route) {
        return $state.is('workspace.data.import'+(route!=null?'.'+route:''));
      };

      $scope.go = function(route) {
        $state.go('workspace.data.import.'+route, {
          workspace: wsName,
          maps: maps
        });
      };

      $scope.next = function(imp) {
        $state.go('workspace.data.import.details', {
          'workspace': wsName,
          'import': imp.id,
          'maps': maps
        });
      };

      $scope.inFileFlow = function() {
        var test = $scope.is() || $scope.is('file');
        test = test || $state.includes('workspace.data.import.details');
        return test;
      };

      GeoServer.workspace.get(wsName).then(function(result) {
        if (result.success) {
          $scope.workspace = result.data;
          $scope.go('file');
        }
      });

      $scope.getMaps = function(workspace) {
        if (!$scope.maps) {
          GeoServer.maps.get(workspace).then(function(result) {
            if (result.success) {
              var maps = result.data;
              $scope.maps = maps;
            } else {
              $scope.alerts = [{
                type: 'warning',
                message: 'Failed to get maps.',
                fadeout: true
              }];
            }
          });
        }
      };
    }])
.controller('DataImportFileCtrl', ['$scope', '$state', '$upload', '$log',
    'GeoServer', '$stateParams',
    function($scope, $state, $upload, $log, GeoServer, $stateParams) {

      var wsName = $stateParams.workspace;
      $scope.maps = $stateParams.maps;

      $scope.onFileSelect = function(files) {
        $scope.file = files[0];
      };
      $scope.upload = function() {
        $upload.upload({
          url: GeoServer.import.url($scope.workspace.name),
          method: 'POST',
          file: $scope.file
        }).progress(function(e) {
          $scope.progress.percent = parseInt(100.0 * e.loaded / e.total);
        }).success(function(e) {
          $scope.result = e;
          $scope.storeAdded();
        });
      };
      $scope.progress = {percent: 0};
    }])
.controller('DataImportDbCtrl', ['$scope', '$state', '$stateParams',
    function($scope, $state, $stateParams) {
      $scope.workspace = $stateParams.workspace;
      $scope.maps = $stateParams.maps;
    }])
.controller('DataImportDetailsCtrl', ['$scope', '$state', '$stateParams',
    '$log', 'GeoServer', '$rootScope',
    function($scope, $state, $stateParams, $log, GeoServer, $rootScope) {

      $scope.createMap = false; // for a new map not yet created

      if ($stateParams.maps) {
        $scope.maps = $stateParams.maps;
        $scope.createMap = true;
      } else {
        // TODO get a list of maps in workspace
        $scope.getMaps($scope.workspace);
      }

      $scope.layerSelections = [];

      var baseGridOpts = {
        enableCellSelection: false,
        enableRowSelection: true,
        enableCellEdit: false,
        showSelectionCheckbox: true,
        selectWithCheckboxOnly: false,
        multiSelect: true,
        selectedItems: $scope.layerSelections,
      };

      $scope.completedGridOpts = angular.extend({
        data: 'importedLayers',
        checkboxHeaderTemplate:
          '<input class="ngSelectionHeader" type="checkbox"' +
            'ng-model="allSelected" ng-change="toggleSelectAll(allSelected)"/>',
        sortInfo: {fields: ['name'], directions: ['asc']},
        columnDefs: [
          {field: 'name', displayName: 'Layer', width: '20%'},
          {field: 'title',
            displayName: 'Title',
            enableCellEdit: true,
            cellTemplate:
              '<div class="grid-text-padding"' +
                'alt="{{row.entity.description}}"' +
                'title="{{row.entity.description}}">' +
                '{{row.entity.title}}' +
              '</div>',
            width: '20%'
          },
          {field: 'geometry',
            displayName: 'Type',
            cellClass: 'text-center',
            cellTemplate:
              '<div get-type ' +
                'geometry="{{row.entity.geometry}}">' +
              '</div>',
            width: '5%'
          },
          {field: 'srs',
            displayName: 'SRS',
            cellClass: 'text-center',
            cellTemplate:
              '<div class="grid-text-padding">' +
                '{{row.entity.proj.srs}}' +
              '</div>',
            width: '7%'
          },
          {field: 'settings',
            displayName: 'Settings',
            cellClass: 'text-center',
            sortable: false,
            cellTemplate:
              '<div ng-class="col.colIndex()">' +
                '<a ng-click="onStyleEdit(row.entity)">' +
                  '<i class="fa fa-gear grid-icons" ' +
                    'alt="Edit Layer Settings" ' +
                    'title="Edit Layer Settings"></i>' +
                '</a>' +
              '</div>',
            width: '10%'
          },
          {field: 'style',
            displayName: 'Styles',
            cellClass: 'text-center',
            sortable: false,
            cellTemplate:
              '<div class="grid-text-padding" ' +
                'ng-class="col.colIndex()">' +
                '<a ng-click="onStyleEdit(row.entity)">Edit</a>' +
              '</div>',
            width: '7%'
          },
          {field: '',
            displayName: '',
            cellClass: 'text-center',
            sortable: false,
            cellTemplate:
              '<div ng-class="col.colIndex()">' +
                '<a ng-click="deleteLayer(row.entity)">' +
                  '<img ng-src="images/delete.png"' +
                    ' alt="Remove Layer"' +
                    'title="Remove Layer" />' +
                '</a>' +
              '</div>',
            width: '*'
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
          }
        ]
      }, baseGridOpts);

      GeoServer.import.get($stateParams.workspace, $stateParams.import)
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
                $scope.storeAdded();
                result.data.layer.source = result.data.file;
                $scope.importedLayers.push(result.data.layer);
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

      $scope.addSelectedToMap = function(selectedFiles) {
        var map = $scope.selectedMap;

        if ($scope.createMap) { // New map to be created
          var mapInfo = {
            'name': map.name,
            'proj': map.proj,
            'abstract': map.abstract
          };

          mapInfo.layers = [];
          var imported = $scope.importedLayers;
          for (var i=0; i < selectedFiles.length; i++) {
            for (var k=0; k < imported.length; k++) {
              if (selectedFiles[i].source===imported[k].source) {
                mapInfo.layers.push({
                  'name': imported[k].name,
                  'workspace': $scope.workspace.name
                });
              }
            }
          }
          GeoServer.map.create($scope.workspace.name, mapInfo).then(
            function(result) {
              if (result.success) {
                $rootScope.alerts = [{
                  type: 'success',
                  message: 'Map ' + result.data.name + ' created  with ' +
                    result.data.layers.length + ' layers.',
                  fadeout: true
                }];
                $scope.maps.push(result.data);
              } else {
                $rootScope.alerts = [{
                  type: 'danger',
                  message: 'Could not create map.',
                  fadeout: true
                }];
              }

            });
        } else { // else existing map update
          // TODO - add layer to map - API not ready
        }
      };

    }]);
