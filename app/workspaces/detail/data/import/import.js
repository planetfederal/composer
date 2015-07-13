/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.data.import', [
  'ngGrid',
  'angularFileUpload',
  'ui.bootstrap',
  'gsApp.core.utilities',
  'gsApp.projfield',
  'gsApp.inlineErrors',
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.data.import.fileordb', {
        views: {
          'importfile@': {
            url: '/',
            templateUrl: '/workspaces/detail/data/import/import.file.tpl.html',
            controller: 'DataImportFileCtrl'
          },
          'importdb@': {
            url: '/',
            templateUrl:
              '/workspaces/detail/data/import/import.db.tpl.html',
            controller: 'DataImportDbCtrl'
          }
        },
        params: { workspace: {}, importId: {}, connectParams: {}, format: {} }
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
        params: { workspace: {}, importId: {}, mapInfo: {} }
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
        params: { workspace: {}, importId: {}, mapInfo: {} }
      });
    }])
.controller('DataImportCtrl', ['$scope', '$state', '$stateParams', 'GeoServer',
  '$modal', '$modalInstance', 'workspace', 'mapInfo', 'mapInfoModel',
  '$rootScope', 'mapsListModel', 'storesListModel', '_',
    function($scope, $state, $stateParams, GeoServer, $modal, $modalInstance,
        workspace, mapInfo, mapInfoModel, $rootScope, mapsListModel,
        storesListModel, _) {

      var wsName = workspace;
      $scope.mapInfo = mapInfo;
      mapInfoModel.setMapInfo(mapInfo);

      $scope.showImportFile = true;
      $scope.showImportDB = false;
      $scope.showImportDetails = false;
      $scope.selectedStore = null;

      $scope.close = function(newmapOrClose) {
        $state.go('workspace.data.main', {workspace: wsName});
        if (newmapOrClose) {
          $modalInstance.close(newmapOrClose);
        } else {
          $modalInstance.close($scope.selectedStore);
        }
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
          'importId': String(imp.id)
        });
      };

      $scope.db_home = false;
      $scope.back = function() {
        if (!$scope.is('fileordb') && !$scope.showImportDB) {
        // back to Add File
          $state.go('workspace.data.import.fileordb', {
            workspace: wsName,
            importId: $scope.importId
          });
        } else if ($scope.format) {  // back to DB connect
          if ($scope.is('fileordb')) {
            $scope.importResult = null;
            $scope.connectParams = null;
            $scope.params = null;
            $scope.db_home = true;
          } else {
            $state.go('workspace.data.import.fileordb', {
              workspace: wsName,
              importId: $scope.importId,
              connectParams: $scope.connectParams,
              format: $scope.format
            });
          }
        } else {
          $scope.db_home = true;
          $scope.showImportDetails = false;
          $scope.format = null;
          $state.go('workspace.data.import.fileordb', {
            workspace: wsName,
            format: $scope.format
          });
        }
      };

      $scope.inFileFlow = function() {
        var test = $scope.is() || $scope.is('fileordb');
        test = test || $state.includes('workspace.data.import.details');
        return test;
      };

      $scope.title = 'Import Data to ' + wsName;
      if (mapInfoModel.getMapInfo()) {
        $scope.title += ' for ' + $scope.mapInfo.name;
      }

      GeoServer.workspace.get(wsName).then(function(result) {
        if (result.success) {
          $scope.workspace = result.data;
          $scope.go('fileordb');
        }
      });

      $scope.importResult = null;
      $scope.setImportResult = function(result) {
        $scope.importResult = result;
        if (result && result.pending) {
          $scope.importResult.total = result.failed.length +
            result.ignored.length + result.pending.length +
            result.imported.length + result.preimport.length;
        }
      };

      $scope.setImportResultId = function(result) {
        $scope.importResult = result;
      };

      $scope.addStore = function() {
        storesListModel.addEmptyStore(wsName, $scope.format.name,
          $scope.content);
        $scope.close();
      };

      $scope.connectParams = null;
      $scope.setConnectionParamsAndFormat = function(params, format) {
        $scope.connectParams = params;
        $scope.format = format;
        $scope.setStoreConnectionContent();
      };

      // for adding store after attempting import from empty store
      $scope.content = null;
      $scope.setStoreConnectionContent = function() {
        var params = $scope.connectParams;
        $scope.content = $scope.format;
        $scope.content.connection = {};
        for (var obj in params) {
          if (params[obj].value) {
            $scope.content.connection[obj] = params[obj].value.toString();
            // geoserver doesn't recognize without toString + need to remove
            // any undefined optional parameters
          }
        }
        delete $scope.content.params;
      };

      $scope.goToCreateNewMap = function(workspace, importInfo) {
        $state.go('workspace.data.import.newmap', {
          workspace: workspace,
          import: importInfo
        });
      };

      // Expects store object not just store name
      $scope.storeSelected = function(store) {
        $scope.selectedStore = {'name': store.store};
      };

      $scope.completeNewMap = function() { // New Map > Import Data
        var mapInfo = mapInfoModel.getMapInfo();
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
              $scope.close();
              $state.go('map.compose', {workspace: wsName,
                name: map.name});
            } else {
              $scope.errors = result.data.message; // show errors in modal
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Error creating new map: '+result.data.message,
                details: result.data.trace,
                fadeout: true
              }];
            }
          });
      };

      $scope.addNewLayersToExistingMap = function() { // Existing Map > Import
        var mapInfo = mapInfoModel.getMapInfo();
        var layers = [], layersToAdd = null;
        if (mapInfo.newLayers) {
          layersToAdd = mapInfo.newLayers;
        } else {
          layersToAdd = mapInfo.layers;
        }
        for (var k=0, len = layersToAdd.length; k < len; k++) {
          var l = layersToAdd[k].layer;
          if (!l) {
            l = layersToAdd[k];
          }
          layers.push({
            'workspace': l.workspace,
            'name': l.name
          });
        }

        GeoServer.map.layers.add(wsName, mapInfo.name, layers).then(
          function(result) {
            if (result.success) {
              $rootScope.alerts = [{
                type: 'success',
                message: layers.length + ' new layer(s) added to map ' +
                  mapInfo.name + '.',
                fadeout: true
              }];
              $scope.close();
              var hiddenLayers = mapInfo.hiddenLayers;
              $state.go('map.compose', {'workspace': wsName,
                'name': mapInfo.name, 'hiddenLayers': hiddenLayers});
            } else {
              $scope.errors = result.data.message; // show errors in modal
              $rootScope.alerts = [{
                type: 'danger',
                message: 'New layer(s) could not be added to map ' +
                  mapInfo.name + ': ' + result.data.message,
                details: result.data.trace,
                fadeout: true
              }];
            }
          });
      };

      $scope.createNewMapwithImported = function() { // Import Data > New Map
        var mapInfo = mapInfoModel.getMapInfo();

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
              $scope.close();
              $state.go('map.compose', {workspace: wsName,
                name: map.name});
            } else {
              $scope.errors = result.data.message?
                result.data.message: result.data; // show errors in modal
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Error creating new map: '+result.data.message,
                details: result.data.trace,
                fadeout: true
              }];
            }
          });
      };


    }])
.controller('DataImportFileCtrl', ['$scope', '$state', '$upload', '$log',
    'GeoServer', '$stateParams', 'AppEvent', '$rootScope', 'storesListModel', '_',
    function($scope, $state, $upload, $log, GeoServer, $stateParams,
      AppEvent, $rootScope, storesListModel, _) {

      var wsName = $stateParams.workspace;
      $scope.existingStores = [];

      GeoServer.datastores.get(wsName, 0, null, null, null).then(
        function(result) {
          if (result.success) {

            result.data.stores.forEach(function (store) {
              if (store.type.toLowerCase() === 'database' 
                || store.type.toLowerCase() === 'generic' 
                || store.format.indexOf('directory of spatial files')!==-1) {

                $scope.existingStores.push(store);
              }
            });
            if ($scope.existingStores.length > 0) {
              $scope.chosenImportStore = $scope.existingStores[0];
            }
      }});
      $scope.diskSize = 0;
      GeoServer.import.wsInfo(wsName).then(function(result) {
        if (result.success) {
          $scope.diskSize = result.data.spaceAvailable;
        }
      });

      $scope.initProgress = function() {
        $scope.progress = {percent: 0};
      };

      $scope.calcFileSize = function(files) {
        var size = 0;
        for (var i = 0; i < files.length; i++) {
          size += files[i].size;
        }
        return size;
      };

      $scope.onFileSelect = function(files) {
        if (!$scope.files) {
          $scope.files = [];
        }
        //Add unique files
        files.forEach(function(file) {
          for (var i = 0; i < $scope.files.length; i++) {
            if (angular.equals($scope.files[i], file)) {
              return;
            }
          }
          $scope.files.push(file);
        });
        $scope.fileSize = $scope.calcFileSize($scope.files);
        
        $scope.setImportResult(null);
        $scope.initProgress();
      };

      $scope.onFileRemove = function(file) {
        if ($scope.files) {
          while ($scope.files.indexOf(file) >= 0) {
            $scope.files.splice($scope.files.indexOf(file), 1);
          }
          $scope.fileSize = $scope.calcFileSize($scope.files);
        }
      };

      $scope.upload = function() {
        var postURL;
        if ($scope.addToStore) {
          postURL = GeoServer.import.urlToStore($scope.workspace.name,
            $scope.chosenImportStore.name);
        } else {
          postURL = GeoServer.import.url($scope.workspace.name);
        }

        $upload.upload({
          url: postURL,
          method: 'POST',
          file: $scope.files
        }).progress(function(e) {
          $scope.progress.percent = parseInt(100.0 * e.loaded / e.total);
        }).success(function(e) {
          $scope.setImportResult(e);
          $scope.$broadcast(AppEvent.StoreAdded,
            {workspace: $scope.workspace});
        }).then(function(result) {
          GeoServer.import.wsInfo().then(function(result) {
            if (result.success) {
              $scope.diskSize = result.data.spaceAvailable;
            }
          });
          if (result.status > 201) {
            $rootScope.alerts = [{
              type: 'danger',
              message: 'Could not import ' + ($scope.files.length == 1 
                        ? 'file: ' + $scope.files[0].name
                        : +$scope.files.length + ' files'),
              fadeout: true
            }];
            $scope.close();
          }
        });
      };
      $scope.initProgress();

      GeoServer.formats.get().then(function(result) {
        var fileTooltip = 
          "<div class='data-import-file-tooltip'>" +
          "<h5>Spatial Files</h5>" +
          "<p>Supported file types:</p>";

        if (result.success) {
          result.data.forEach(function(f) {
            if (f.type == 'file') {
              fileTooltip += "<div class='file-type'><div><strong>"+f.title+"</strong></div>" +
                                    "<div>"+f.description+"</div></div>"
            }
          });
        }
        fileTooltip += "</div>";
        $scope.fileTooltip = fileTooltip;
      });

    }])
.controller('DataImportDbCtrl', ['$scope', '$state', '$stateParams', '$log',
    'GeoServer', '_', '$sce',
    function($scope, $state, $stateParams, $log, GeoServer, _, $sce) {
      $scope.workspace = $stateParams.workspace;
      $scope.maps = $stateParams.maps;
      $scope.params = $stateParams.connectParams;
      $scope.chooseTables = false;

      $scope.geoserverDatabaseLink = GeoServer.baseUrl() +
        '/web/?wicket:bookmarkablePage=:org.geoserver.importer.web.' +
        'ImportDataPage';

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

        $scope.setConnectionParamsAndFormat($scope.params, $scope.format);

        GeoServer.import.post($scope.workspace, content)
          .then(function(result) {
            if (result.success) {
              $scope.error = null;
              if (typeof result.data.id !== 'undefined') {
                $scope.setImportResultId(result.data);
              } else if (result.data.store) {
                $scope.alert = result.data;
                $scope.selectStore = result.data.store;
              }
            }
            else {
              $scope.error = result.data;
            }
            $scope.connecting = false;
          });
      };

      $scope.showStore = function() {
        $scope.close($scope.selectStore);
      };

      GeoServer.formats.get().then(function(result) {
        if (result.success) {
          $scope.formats = result.data.filter(function(f) {
            return f.type == 'database' || f.type == 'generic';
          });
        }
      });
    }])
.controller('DataImportDetailsCtrl', ['$scope', '$state', '$stateParams',
    '$log', 'GeoServer', '$rootScope', 'AppEvent', 'mapInfoModel',
    'storesListModel', 'importPollingService', '$timeout',
    function($scope, $state, $stateParams, $log, GeoServer, $rootScope,
      AppEvent, mapInfoModel, storesListModel, importPollingService, $timeout) {

      // Initialize scope

      $scope.workspace = $stateParams.workspace;
      $scope.importId = $stateParams.importId;
      $scope.layerSelections = [];
      $scope.detailsLoading = true;
      var stopUpdateTimer, stopGetTimer;

      // if mapInfo's not defined it's import not create map workflow
      if (!mapInfoModel.getMapInfo()) {
        GeoServer.maps.get($scope.workspace).then(
          function(result) {
            if (result.success) {
              $scope.maps = result.data.maps;
            }
          });
      }

      // ng-grid configuration

      var baseGridOpts = {
        enableCellSelection: false,
        enableRowSelection: true,
        enableCellEdit: false,
        showSelectionCheckbox: true,
        selectWithCheckboxOnly: false,
        multiSelect: true,
        selectedItems: $scope.layerSelections,
        afterSelectionChange: function(rowItem, event) {
          if (mapInfoModel.getMapInfo()) {
            mapInfoModel.setMapInfoLayers($scope.layerSelections);
          }
        }
      };

      $scope.preimportGridOpts = angular.extend({
        data: 'import.preimport',
        checkboxHeaderTemplate:
          '<input class="ngSelectionHeader" type="checkbox"' +
            'ng-model="allSelected" ' +
              'ng-change="toggleSelectAll(allSelected)"/>',
        sortInfo: {fields: ['name'], directions: ['asc']},
        columnDefs: [
          {field: 'name', displayName: 'Name', width: '25%'},
          {field: 'geometry', displayName: 'Geometry',
            cellTemplate:
              '<div class="ngCellText" ng-switch ' +
                'on="row.entity.geometry==\'none\'">' +
                '<span ng-switch-when="false">{{ row.entity.geometry }}' +
                '</span>' +
                '<span ng-switch-when="true">None *</span>' +
              '</div>',
            width: '20%'},
          {
            displayName: ''
          },
          {
            displayName: '',
            cellTemplate:
              '<span class="loadingField" ng-show="row.entity.loading">' +
              '<i class="fa fa-spinner fa-spin"></i> Importing</span>',
            width: '20%'
          }
        ],
        checkboxCellTemplate:
          '<div class="ngSelectionCell">' +
          '<input tabindex="-1" class="ngSelectionCheckbox" ' +
          'type="checkbox" ng-checked="row.selected" ' +
          'ng-disabled="row.entity.imported" />' +
          '</div>',
        enablePaging: false,
        enableColumnResize: false,
        showFooter: false,
        totalServerItems: 'import.preimport.length',
        pagingOptions: {
          pageSize: 50,
          currentPage: 1
        },
      }, baseGridOpts);

      $scope.completedGridOpts = angular.extend({
        data: 'import.imported',
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
        enablePaging: false,
        enableColumnResize: false,
        showFooter: false,
        totalServerItems: 'import.imported.length',
        pagingOptions: {
          pageSize: 50,
          currentPage: 1
        }
      }, baseGridOpts);
      
      $scope.pendingGridOpts = angular.extend({
        data: 'import.pending',
        checkboxHeaderTemplate:
          '<input class="ngSelectionHeader" type="checkbox"' +
            'ng-model="allSelected" ' +
            'ng-change="toggleSelectAll(allSelected)"/>',
        checkboxCellTemplate:
          '<div class="ngSelectionCell">' +
          '<input tabindex="-1" class="ngSelectionCheckbox" ' +
          'type="checkbox" ng-checked="row.selected" ' +
          'ng-disabled="row.entity.success" />' +
          '</div>',
        enablePaging: false,
        showFooter: false,
        columnDefs: [
          {field: 'name', displayName: 'Name'},
          {
            displayName: 'Projection',
            cellTemplate:
              '<div ng-switch on="row.entity.success">' +
                '<proj-field ng-switch-when="false" proj="row.entity.proj">' +
                '</proj-field>' +
                '<div ng-switch-when="true" class="ngCellText">' +
                ' {{ row.entity.proj.srs }}'+
                '<div>' +
              '</div>',
            width: '30%'
          },
          {
            displayName: '',
            cellTemplate:
              '<div class="ngCellText" ' +
                'ng-show="!row.entity.success && row.entity.proj != null">'+
                '<a ng-click="applyProjToAll(row.entity.proj)" ' +
                '  title="Apply projection to all pending layers">'+
                'Apply to all</a> ' +
                '<i class="fa fa-mail-forward fa-rotate-180" '+
                'style="color: #999;"></i>' +
              '</div>' +
              '<div class="ngCellText" ng-show="row.entity.success == true">'+
                '<i class="fa fa-check-circle"></i> Layer imported.' +
              '</div>'
          },
          {
            displayName: '',
            cellTemplate:
              '<button ng-click="reimport([row.entity])" ' +
                  'ng-disabled="row.entity.success==true" ' +
                  'ng-hide="row.entity.loading" ' +
                  'class="btn btn-success btn-xs"> ' +
                  '<span ng-hide="row.entity.success">' +
                  '<i class="fa fa-refresh"></i> Retry Import</span>' +
                  '<span ng-show="row.entity.success">' +
                  '<i class="fa fa-check"></i> Imported</span>' +
              '</button>' +
              '<span class="errorField" ng-show="row.entity.error" ' +
              'popover={{row.entity.errorMsg}} ' +
              'popover-trigger="mouseenter" ' +
              'popover-placement="top" popover-append-to-body="true">' +
              '<i class="fa fa-exclamation-triangle"></i> Error</span>' +
              '<span class="loadingField" ng-show="row.entity.loading">' +
              '<i class="fa fa-spinner fa-spin"></i> Importing</span>',
              width: '20%'
          }
        ]
      }, baseGridOpts);

      //Function definitions
  
      $scope.setStoreFromLayername = function(importedLayerName) {
        if (!$scope.selectedStore) {
          GeoServer.layer.get($scope.workspace, importedLayerName).then(
            function(result) {
              if (result.success) {
                $scope.storeSelected(result.data.resource);
              }
            });
        }
      };

      $scope.pollingGetCallback = function(result) {
        if (result.success) {
          var data = result.data;
          
          // Completed
          if (data.running && data.running.length == 0) {
          
            // cleanup/reset
            $timeout.cancel(stopGetTimer);
            $scope.pollRetries = 1000;

            $scope.detailsLoading = false;
            $scope.importInProgress = false;

            //configure pending
            data.pending.forEach(function(t) {
              t.success = false;
              //Copy over any saved CRS values
              if ($scope.import) {
                for (var i=0; i < $scope.import.pending.length; i++) {
                  var layer = $scope.import.pending[i];
                  if (t.task == layer.task && typeof t.proj === 'undefined' 
                      && typeof layer.proj !== 'undefined') {
                    t.proj = layer.proj;
                  }
                }
              }
            });

            //configure imported
            if (data.imported.length > 0) {
              $scope.setStoreFromLayername(data.imported[0].name);
            }
            mapInfoModel.setMapInfoLayers(data.imported);

            data.imported.forEach(function(t) {
              t.layer.source = t.name;
            });

            //set global import data
            $scope.import = data;

            var totalImported = data.imported.length + data.pending.length +
              data.preimport.length + data.failed.length +
              data.running.length + data.ignored.length;
            if (totalImported == 0) {
              $scope.noImportData = true;
            } else {
              $rootScope.$broadcast(AppEvent.StoreAdded);
            }

          } else { // continue polling
            if (stopGetTimer) { $timeout.cancel(stopGetTimer); }
            if ($scope.pollRetries > 0) {
              $scope.pollRetries--;
              stopGetTimer = $timeout(function() {
                importPollingService.pollGetOnce($scope.workspace, $scope.importId,
                  $scope.pollingGetCallback);
              }, 2000);
            } else {
              $scope.pollRetries = 1000;
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Could not import store: Import took too long',
                fadeout: true
              }];
            }
          }
        } else { //import failed
          $rootScope.alerts = [{
            type: 'danger',
            message: 'Error importing store: ' + result.data.message,
            details: result.data.trace,
            fadeout: true
          }];
        }
      };

      $scope.applyProjToAll = function(proj) {
        $scope.import.pending.forEach(function(task) {
          task.proj = proj;
        });
      };

      $scope.importTables = function() {
        $scope.importInProgress = true;
        var toImport;
        var tasks = $scope.import.imported.length;
        if (($scope.layerSelections.length === $scope.import.preimport.length) && ($scope.import.pending.length === 0)) {
          toImport = {'filter': 'ALL'};
          tasks = $scope.import.preimport.length;
          $scope.layerSelections.forEach(function(task) {
              task.loading = true;
          });
        } else {
          toImport = {'tasks': []};
          $scope.layerSelections.filter(function(item) {
            return $scope.import.preimport.filter(function(layer) {return layer === item && !layer.imported;}).length > 0;
          }).forEach(function(task) {
              toImport.tasks.push({'task': task.task});
              task.loading = true;
              tasks++;
          });
        }

        $scope.pollRetries = 500;
 
        importPollingService.pollUpdateOnce($scope.workspace,
          $scope.importId, angular.toJson(toImport), $scope.pollingGetCallback);
      };

      $scope.reimport = function(items) {

        var toImport = {'tasks': []};
        items.filter(function(item) {
          return item.problem == 'NO_CRS' && item.proj != null;
        }).forEach(function(task) {
          toImport.tasks.push({'task': task.task, 'proj': task.proj});
          task.loading = true;
          // also reset error state
          task.error = false;
          task.errorMsg = '';
        });

        $scope.pollRetries = 500;
        
        if (toImport.tasks.length > 0) {
          importPollingService.pollUpdateOnce($scope.workspace,
            $scope.importId, angular.toJson(toImport),
            $scope.pollingGetCallback);
        }
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
        var imported = $scope.import.imported;
        for (var i=0; i < selectedLayers.length; i++) {
          for (var k=0; k < imported.length; k++) {
            var importedItem = imported[k];
            if (selectedLayers[i].name &&
                selectedLayers[i].name==importedItem.name) {
              newMapInfo.layers.push({
                'name': importedItem.layer.name,
                'workspace': importedItem.layer.workspace
              });
            }
          }
        }
        mapInfoModel.setMapInfo(newMapInfo);
        $scope.goToCreateNewMap($scope.workspace, $scope.import);
      };

      $scope.addSelectedToMap = function(selectedLayers) {
        var map = $scope.selectedMap;
        var newMapInfo = {
          'name': map.name,
          'proj': map.proj,
          'abstract': map.abstract
        };
        newMapInfo.layers = [];
        var imported = $scope.import.imported;
        for (var i=0; i < selectedLayers.length; i++) {
          for (var k=0; k < imported.length; k++) {
            var importedItem = imported[k];
            if (selectedLayers[i].name &&
                selectedLayers[i].name==importedItem.name) {
              newMapInfo.layers.push({
                'name': importedItem.layer.name,
                'workspace': importedItem.layer.workspace
              });
            }
          }
        }
        GeoServer.map.layers.add($scope.workspace,
          newMapInfo.name, newMapInfo.layers).then(function(result) {
            if (result.success) {
              $rootScope.alerts = [{
                type: 'success',
                message: $scope.import.imported.length +
                  ' layer(s) added to map ' + newMapInfo.name + '.',
                fadeout: true
              }];
              $scope.close('close');
              $state.go('map.compose', {workspace: map.workspace,
                name: newMapInfo.name});
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Layer(s) could not be added to map ' +
                  newMapInfo.name + ': ' + result.data.message,
                details: result.data.trace,
                fadeout: true
              }];
            }
          });
      };

      //Poll for import results
      $scope.pollRetries = 1000;
      
      importPollingService.pollGetOnce($scope.workspace, $scope.importId,
        $scope.pollingGetCallback);

      $scope.$on('destroy', function(event) {
        $timeout.cancel(stopGetTimer);
        $timeout.cancel(stopUpdateTimer);
      });

    }])
.controller('ImportNewMapCtrl', ['$scope', '$state', '$stateParams',
  '$log', 'GeoServer', '$rootScope', 'mapsListModel', 'mapInfoModel',
  'projectionModel', '_', '$timeout', 'AppEvent',
    function($scope, $state, $stateParams, $log, GeoServer, $rootScope,
      mapsListModel, mapInfoModel, projectionModel, _, $timeout, AppEvent) {

      $scope.$parent.title += ' > New Map';

      $scope.workspace = $stateParams.workspace;
      $scope.mapInfo = mapInfoModel.getMapInfo();
      $scope.importId = $stateParams.importId;
      $scope.selectedLayers = $scope.mapInfo.layers;

      // Proj field
      $scope.crsTooltip =
        '<h5>Add a projection in EPSG</h5>' +
        '<p>Coordinate Reference System (CRS) info is available at ' +
          '<a href="http://prj2epsg.org/search" target="_blank">' +
            'http://prj2epsg.org' +
          '</a>' +
        '</p>';
      $scope.proj = null;
      $scope.projEnabled = false;

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
        mapInfoModel.setMapInfo($scope.mapInfo);
      });

      projectionModel.fetchProjections().then(function() {
        $scope.projs = projectionModel.getDefaults();
        $scope.projEnabled = true;
        $scope.proj = 'latlon';
      });

      $rootScope.$on(AppEvent.ProjSet, function(scope, proj) {
        $scope.mapInfo.proj = proj;
      });

      $scope.back = function() {
        $state.go('workspace.data.import.details', {
          workspace: $scope.workspace,
          import: $scope.import,
          mapInfo: $scope.mapInfo
        });
      };

      // Save form updates to mapInfoModel service
      var timeout = null;
      var debounceSaveUpdates = function(newVal, oldVal) {
        if (newVal != oldVal) {
          if (timeout) {
            $timeout.cancel(timeout);
          }
          timeout = $timeout(function() {
            mapInfoModel.setMapInfo($scope.mapInfo);
          }, 1000);
        }
      };
      $scope.$watch('mapInfo', debounceSaveUpdates);

    }])
.service('mapInfoModel', function(_) {
  var _this = this;
  this.mapInfo = null;
  this.savedLayers = null;

  this.setMapInfo = function(mapInfo) {
    _this.mapInfo = mapInfo;
  };

  this.setMapInfoLayers = function(layers) {
    // if it's an existing map keep new layers separate
    if (_this.mapInfo) {
      if (_this.mapInfo.created) {
        _this.mapInfo.newLayers = layers;
      } else {
        _this.mapInfo.layers = layers;
      }
    } else { // save for layer to be added to new maps
      _this.savedLayers = layers.map(function(t) {
        return t.layer;
      });
    }
  };

  this.getMapInfo = function() {
    if (_this.mapInfo) {  // check for saved layers
      if (_this.mapInfo.layers.length == 0 && _this.savedLayers) {
        _this.mapInfo.layers = _this.savedLayers;
        _this.savedLayers = null;
      }
    }
    return _this.mapInfo;
  };
})
.factory('importPollingService', ['GeoServer',
  function(GeoServer) {

    return {

      pollGetOnce: function(workspace, importId, callback) {
        GeoServer.import.get(workspace, importId)
          .then(callback);
      },

      pollUpdateOnce: function(workspace, importId, tables, callback) {
        GeoServer.import.update(workspace, importId, tables)
          .then(callback);
      }
    };

  }]);

