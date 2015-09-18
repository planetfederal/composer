/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.import', [
  'ngGrid',
  'angularFileUpload',
  'ui.bootstrap',
  'gsApp.core.utilities',
  'gsApp.projfield',
  'gsApp.inlineErrors'
])
.directive('importFile', ['$log', 'GeoServer', '$rootScope',
    function ($log, GeoServer, $rootScope) {
      return {
        restrict: 'EA',
        templateUrl: '/components/import/import.file.tpl.html',
        replace: true,
        controller: 'DataImportFileCtrl',
      };
    }])
.directive('importDb', ['$log', 'GeoServer', '$rootScope',
    function ($log, GeoServer, $rootScope) {
      return {
        restrict: 'EA',
        templateUrl: '/components/import/import.db.tpl.html',
        replace: true,
        controller: 'DataImportDbCtrl',
      };
    }])
.directive('importDetails', ['$log', 'GeoServer', '$rootScope',
    function ($log, GeoServer, $rootScope) {
      return {
        restrict: 'EA',
        templateUrl: '/components/import/import.details.tpl.html',
        replace: true,
        controller: 'DataImportDetailsCtrl',
      };
    }])
.controller('DataImportCtrl', ['$scope', 'GeoServer',
  '$modal', '$modalInstance', 'workspace', 'contextInfo', 'mapInfo','mapInfoModel',
  '$rootScope', 'mapsListModel', 'storesListModel', '_',
    function($scope, GeoServer, $modal, $modalInstance,
        workspace, contextInfo, mapInfo, mapInfoModel, $rootScope, mapsListModel,
        storesListModel, _) {

      var wsName = workspace;
      $scope.mapInfo = mapInfo;
      $scope.contextInfo = contextInfo;
      $scope.childScope = {};
      $scope.layers = []
      $scope.selectedLayers = []

      if (contextInfo && contextInfo.title) {
        $scope.title = contextInfo.title;
      } else {
        $scope.title = 'Import Data to <i class="icon-folder-open"></i> <strong>'+wsName+'</strong>';
      }

      mapInfoModel.setMapInfo(mapInfo);

      $scope.showImportFile = true;
      $scope.showImportDB = false;
      $scope.showImportDetails = false;
      $scope.selectedStore = null;

      /*
       * If import was opened from an import layers into map dialog (details in contextInfo)
       * then return the list of imported, selected, layers (Note/TODO: All imported layers default to selected)
       * else return the imported store
       */
      $scope.close = function(layerlist) {
        if (contextInfo) {
          if (layerlist) {
            $modalInstance.close(layerlist);
          } else {
            $modalInstance.close();
          }
        } else {
          $modalInstance.close($scope.selectedStore);
        }
      };

      /* Get layer list and exit*/
      $scope.returnSelectedLayers = function (selectedTasks) {
        var layers = [];
        selectedTasks.forEach(function(task) {
          if (task.layer) {
            layers.push(task.layer);
          } 
          //else warn user?
        });

        $scope.close(layers);
      }

      $scope.next = function(imp) {
        $scope.showImportDetails = true;
        $scope.importId = imp.id
      };

      $scope.db_home = false;
      $scope.importResult = null;
      $scope.setImportResult = function(result) {
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

      // Expects store object not just store name
      $scope.storeSelected = function(store) {
        $scope.selectedStore = {'name': store.store};
      };

      GeoServer.workspace.get(wsName).then(function(result) {
        if (result.success) {
          $scope.workspace = result.data;
        }
      });
    }])
.controller('DataImportFileCtrl', ['$scope', '$upload', '$log',
    'GeoServer', 'AppEvent', '$rootScope', 'storesListModel', '_',
    function($scope, $upload, $log, GeoServer,
      AppEvent, $rootScope, storesListModel, _) {

      var wsName = $scope.workspace.name;
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
          postURL = GeoServer.import.urlToStore(wsName,
            $scope.chosenImportStore.name);
        } else {
          postURL = GeoServer.import.url(wsName);
        }

        $upload.upload({
          url: postURL,
          method: 'POST',
          file: $scope.files
        }).progress(function(e) {
          $scope.progress.percent = parseInt(100.0 * e.loaded / e.total);
        }).success(function(e) {
          $scope.setImportResult(e);
        }).then(function(result) {
          GeoServer.import.wsInfo(wsName).then(function(result) {
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
.controller('DataImportDbCtrl', ['$scope', '$log',
    'GeoServer', '_', '$sce',
    function($scope, $log, GeoServer, _, $sce) {

      var wsName = $scope.workspace.name;
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

        GeoServer.import.post(wsName, content)
          .then(function(result) {
            if (result.success) {
              $scope.error = null;
              if (typeof result.data.id !== 'undefined') {
                $scope.setImportResult(result.data);
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
.controller('DataImportDetailsCtrl', ['$scope',
    '$log', 'GeoServer', '$rootScope', 'AppEvent', 'mapInfoModel',
    'storesListModel', 'importPollingService', '$timeout',
    function($scope, $log, GeoServer, $rootScope,
      AppEvent, mapInfoModel, storesListModel, importPollingService, $timeout) {

      // Initialize scope
      var wsName = $scope.workspace.name;
      $scope.layers.length = 0;
      $scope.selectedLayers.length=0;
      if ($scope.contextInfo) {
        $scope.contextInfo.selectedLayers = $scope.selectedLayers;
      }
      $scope.detailsLoading = true;
      var stopUpdateTimer, stopGetTimer;

      // if mapInfo's not defined it's import not create map workflow
      if (!mapInfoModel.getMapInfo()) {
        GeoServer.maps.get(wsName).then(
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
        selectedItems: $scope.selectedLayers,
        afterSelectionChange: function(rowItem, event) {
          if (mapInfoModel.getMapInfo()) {
            mapInfoModel.setMapInfoLayers($scope.selectedLayers);
          }
        }
      };
      //TODO: Add variable display name for proj and status

      $scope.gridOpts = angular.extend({
        data: 'layers',
        checkboxHeaderTemplate:
          '<input class="ngSelectionHeader" type="checkbox"' +
            'ng-model="allSelected" ' +
              'ng-change="toggleSelectAll(allSelected)"/>',
        sortInfo: {fields: ['name'], directions: ['asc']},
        columnDefs: [
          {
            field: 'name', displayName: 'Name', width: '30%'
          },
          {
            field: 'geometry', displayName: 'Geometry',
            cellTemplate:
              '<div class="ngCellText" ng-switch ' +
                'on="row.entity.geometry==\'none\'">' +
                '<div ng-switch-when="false"><div get-type geometry="{{row.entity.geometry}}"></div></div>'+
                '<div ng-switch-when="true">None *</div>' +
              '</div>',
            width: '20%'},
          {
            field: 'projection', displayName: 'Projection',
            cellTemplate:
              '<div ng-switch on="row.entity.status==\'NO_CRS\'">' +
                '<proj-field ng-switch-when="true" proj="row.entity.proj">' +
                '</proj-field>' +
                '<div ng-switch-when="false" ng-show="!!row.entity.proj.srs" class="ngCellText">' +
                ' {{ row.entity.proj.srs }}'+
                '<div>' +
              '</div>',
            width: '30%'
          },
          {
            field: 'status', displayName: '',
            cellTemplate:
              '<div ng-switch on="row.entity.status">' +
              '<span ng-switch-when="RUNNING" class="loadingField">' +
                '<i class="fa fa-spinner fa-spin"></i> Importing</span>' +
              '<span ng-switch-when="NO_CRS">'+
                '<i class="fa fa-exclamation-triangle"></i>No CRS</span>' +
              '<span ng-switch-when="NO_BOUNDS">'+
                '<i class="fa fa-exclamation-triangle"></i>No Bounds</span>' +
              '<span ng-switch-when="ERROR">'+
                '<i class="fa fa-x"></i>Error: {{row.entity.error.message}}</span>' + //TODO: link to dialog
              '<span ng-switch-when="COMPLETE">'+
                '<i class="fa fa-check"></i>Imported</span>',
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
        totalServerItems: 'layers.length',
        pagingOptions: {
          pageSize: 50,
          currentPage: 1
        },
      }, baseGridOpts);
      
      //Override ng-grid toggleSelectAll
      var gridScopeInit = $scope.$watch('gridOpts.$gridScope', function() {
        if ($scope.gridOpts.$gridScope && $scope.gridOpts.$gridScope.toggleSelectAll ) {
          $scope.gridOpts.$gridScope.toggleSelectAll = function (state) {
            $scope.selectedLayers.length = 0;
            $scope.layers.forEach(function (task) {
              if (state) {
                $scope.selectedLayers.push(task);
              }
            });
            $scope.gridOpts.$gridScope.renderedRows.forEach(function (row) {
              if (state) {
                row.selected = true;
              } else {
                row.selected = false;
              }
            });
          }
          //unregister watch
          gridScopeInit();
        }
      });

      //Function definitions
      $scope.setStoreFromLayername = function(importedLayerName) {
        if (!$scope.selectedStore) {
          GeoServer.layer.get(wsName, importedLayerName).then(
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

          var running = 0;
          if (data.tasks) {
            $scope.ignored = [];
            data.tasks.forEach(function(t) {

              if (t.status == 'RUNNING') {
                running++;
              }
              if (t.status == 'IGNORED') {
                $scope.ignored.push(t);
              }
              //Do an in-place manual copy. Existing local properties (ie. proj) are preserved.
              //(If this is the first import, length will be zero, so we skip this step)
              for (var i=0; i < $scope.layers.length; i++) {
                var l = $scope.layers[i];
                if (t.task == l.task) {
                  Object.keys(t).forEach(function (key) {
                    l[key] = t[key];
                  });
                  break;
                }
              }
            });

            //set global import data
            $scope.import = data;
            //initialize layers list
            if ($scope.layers.length==0) {
              $scope.layers = data.tasks.filter(function(t) {
                return t.status != 'IGNORED';
              }); 
            }
          }
          
          // Completed
          if (data.tasks && running == 0 && data.state != "running") {
          
            // cleanup/reset
            $timeout.cancel(stopGetTimer);
            $scope.pollRetries = 1000;

            $scope.detailsLoading = false;
            $scope.importInProgress = false;

            $scope.imported = [];
            data.tasks.forEach(function(t) {
              if (t.status == 'COMPLETE') {
                $scope.setStoreFromLayername(t.name);
                t.layer.source = t.name;
                $scope.imported.push(t);
              }
            });
            mapInfoModel.setMapInfoLayers($scope.imported);

            //TODO: Compare pre ($scope.import) and post (data) "COMPLETED" to get imported layer count
            if ($scope.layers.length == $scope.ignored.length) {
              $scope.noImportData = true;
            } 
            if ($scope.imported.length > 0) {
              $rootScope.$broadcast(AppEvent.StoreAdded);
            }

          } else { // continue polling
            if (stopGetTimer) { $timeout.cancel(stopGetTimer); }
            if ($scope.pollRetries > 0) {
              $scope.pollRetries--;
              stopGetTimer = $timeout(function() {
                importPollingService.pollGetOnce(wsName, $scope.importId,
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
        $scope.layers.forEach(function(task) {
          if (task.status == 'NO_CRS') {
            task.proj = angular.copy(proj);
          }
        });
      };

      $scope.doImport = function() {
        $scope.importInProgress = true;
        var toImport = {'tasks': []};

        $scope.selectedLayers.filter(function(item) {
            return item.status != 'COMPLETE';
          }).forEach(function(task) {
            if (task.status == 'NO_CRS') {
              toImport.tasks.push({'task': task.task, 'proj': task.proj});
            } else {
              toImport.tasks.push({'task': task.task});
            }
          });

        $scope.pollRetries = 500;
        
        if (toImport.tasks.length > 0) {
          importPollingService.pollUpdateOnce(wsName,
            $scope.importId, angular.toJson(toImport), $scope.pollingGetCallback);
        }
      };

      //make visible to parent
      $scope.childScope.doImport = $scope.doImport;

      $scope.setMap = function(map) {
        $scope.selectedMap = map;
      };

      //Poll for import results
      $scope.pollRetries = 1000;
      
      importPollingService.pollGetOnce(wsName, $scope.importId,
        $scope.pollingGetCallback);

      $scope.$on('destroy', function(event) {
        $timeout.cancel(stopGetTimer);
        $timeout.cancel(stopUpdateTimer);
      });
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

