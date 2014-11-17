angular.module('gsApp.maps', [
  'ngGrid',
  'ui.select',
  'ngSanitize',
  'gsApp.alertpanel',
  'gsApp.projfield',
  'gsApp.core.utilities',
  'gsApp.maps.compose'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('maps', {
          url: '/maps',
          templateUrl: '/maps/maps.tpl.html',
          controller: 'MapsCtrl'
        })
        .state('map', {
          abstract: true,
          url: '/maps/:workspace/:name',
          templateUrl: '/maps/detail/map.tpl.html'
        });
    }])
.controller('MapsCtrl', ['$scope', 'GeoServer', '$state', '$log', '$rootScope',
    '$modal', '$window', '$stateParams', 'AppEvent', '$timeout', '$sce',
    function($scope, GeoServer, $state, $log, $rootScope, $modal, $window,
      $stateParams, AppEvent, $timeout, $sce) {
      $scope.title = 'All Maps';
      $scope.workspace = $stateParams.workspace;

      $scope.workspaceChanged = function(ws) {
        $rootScope.$broadcast(AppEvent.WorkspaceSelected,
          ws.name);

        GeoServer.maps.get(ws.name).then(
          function(result) {
            if (result.success) {
              $scope.mapData = result.data.maps;
            } else {
              $rootScope.alerts = [{
                type: 'warning',
                message: 'Could not retrieve maps.',
                fadeout: true
              }];
            }
          });
      };

      $scope.newOLWindow = function(map) {
        var baseUrl = GeoServer.map.openlayers.get(
          map.workspace, map.name, 800, 500);
        $window.open(baseUrl);
      };

      $scope.addMap = function(ws) {
        /*var modalInstance = $modal.open({
          templateUrl: '/maps/addnewmap-modal.tpl.html',
          backdrop: 'static',
          controller: ['$scope', '$window', '$modalInstance', '$state',
            '$timeout',
            function($scope, $window, $modalInstance, $state, $timeout) {
              $scope.extents = [{name: 'Autocalc'}, {name: 'Custom'}];
              $scope.workspace = ws;
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

              $scope.layers = [];
              $scope.layerSelections = [];
              $scope.totalServerItems = [];

              $scope.pagingOptions = {
                pageSizes: [10, 50, 100],
                pageSize: 10,
                currentPage: 1
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
                    //$window.location.reload();
                  });
              }; // end createMap

              $scope.createNewLayers = function() {
                $timeout(function() {
                  $rootScope.$broadcast(AppEvent.ImportData, $scope.mapInfo);
                }, 250);
                // go to this state to initiate listener for broadcast above!
                $state.go('workspace.data.import',
                  {workspace: $scope.workspace});
              };

              $scope.cancel = function() {
                $modalInstance.dismiss('cancel');
              };

              $scope.clearError = function() {
                $scope.mapNameError = false;
              };

              $scope.checkName = function(mapName) {
                $scope.mapNameCheck = GeoServer.map.get($scope.workspace,
                  mapName);

                //Check to see if the incoming mapName already exists for this
                //workspace. If it does, show the error, if not, hide the error.
                GeoServer.map.get($scope.workspace, mapName).then(
                  function(result) {
                    if (result.success) {
                      $scope.mapNameCheck = result.data;
                    } else {
                      $scope.alerts = [{
                        type: 'warning',
                        message: 'Maps could not be loaded.',
                        fadeout: true
                      }];
                    }
                    if ($scope.mapNameCheck.name) {$scope.mapNameError = true;}
                    else {$scope.mapNameError = false;}
                  });
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

              $scope.gridOptions = {
                data: 'layers',
                enableCellSelection: false,
                enableRowSelection: true,
                enableCellEdit: false,
                checkboxHeaderTemplate:
                  '<input class="ngSelectionHeader" type="checkbox"' +
                    'ng-model="allSelected"' +
                    'ng-change="toggleSelectAll(allSelected)"/>',
                sortInfo: {fields: ['name'], directions: ['asc']},
                showSelectionCheckbox: true,
                selectWithCheckboxOnly: true,
                selectedItems: $scope.layerSelections,
                multiSelect: true,
                columnDefs: [
                  {field: 'name', displayName: 'Map Name', width: '150'},
                  {field: 'title',
                    displayName: 'Title',
                    enableCellEdit: true,
                    cellTemplate:
                      '<div class="grid-text-padding"' +
                        'alt="{{row.entity.description}}"' +
                        'title="{{row.entity.description}}">'+
                        '{{row.entity.title}}' +
                      '</div>',
                    width: '200'
                  },
                  {field: 'geometry',
                    displayName: 'Type',
                    cellClass: 'text-center',
                    cellTemplate:
                      '<div class="grid-text-padding">' +
                        '{{row.entity.geometry}}' +
                      '</div>',
                    width: '100'
                  },
                  {field: 'srs',
                    displayName: 'SRS',
                    cellClass: 'text-center',
                    cellTemplate:
                      '<div class="grid-text-padding">' +
                        '{{row.entity.proj.srs}}' +
                      '</div>',
                    width: '150'
                  }
                ],
                enablePaging: true,
                enableColumnResize: false,
                showFooter: true,
                footerTemplate: '/components/grid/footer.tpl.html',
                totalServerItems: 'totalServerItems',
                pagingOptions: $scope.pagingOptions,
                filterOptions: {
                  filterText: '',
                  useExternalFilter: true
                }
              };

              $scope.setMap = function(map) {
                $scope.selectedMap = map;
              };

              $scope.mapsToCreate = [$scope.mapInfo];

              $scope.updatePaging = function () {
                var ws = $scope.workspace.selected;
                $scope.refreshLayers(ws);
              };

              $scope.setPage = function (page) {
                $scope.pagingOptions.currentPage = page;
              };

              $scope.$watch('pagingOptions', function (newVal, oldVal) {
                if (newVal != null) {
                  var ws = $scope.workspace.selected;
                  if (ws != null) {
                    $scope.refreshLayers(ws);
                  }
                }
              }, true);
            }],
          size: 'lg'
        });*/

        if ($scope.layers && $scope.layers.length===0) {
          if (! $scope.datastores.length) {
            var nostores_modal = $modal.open({
              templateUrl: '/workspaces/detail/modals/nostores.tpl.html',
              controller: function($scope, $modalInstance) {
                $scope.close = function() {
                  $modalInstance.close('close');
                };
              },
              backdrop: 'static',
              size: 'md'
            });
          } else {
            var nolayer_modal = $modal.open({
              templateUrl: '/workspaces/detail/modals/nolayers.tpl.html',
              controller: function($scope, $modalInstance) {
                $scope.close = function() {
                  $modalInstance.close('close');
                };
              },
              backdrop: 'static',
              size: 'md'
            });
          }
          return;
        }
        var createModalInstance = $modal.open({
          templateUrl: '/workspaces/detail/maps/createnew/map.new.tpl.html',
          controller: 'NewMapCtrl',
          backdrop: 'static',
          size: 'lg',
          resolve: {
            workspace: function() {
              return $scope.ws;
            }
          }
        }).result.then(function(response) {
          if (response.importOrClose==='import') {
            var mapInfo = response.mapInfo;
            $timeout(function() {
              $rootScope.$broadcast(AppEvent.ImportData, mapInfo);
            }, 250);
            // go to this state to initiate listener for broadcast above!
            $state.go('workspace.data.import', {workspace: $scope.ws});
          }
        });
      };

      $scope.deleteMap = function(map, ws) {
        var modalInstance = $modal.open({
          templateUrl: '/maps/deletemap-modal.tpl.html',
          controller: ['$scope', '$window', '$modalInstance', '$state',
            function($scope, $window, $modalInstance, $state) {
              $scope.workspace = ws.name;
              $scope.map = map.name;

              $scope.ok = function() {
                GeoServer.map.remove($scope.workspace, $scope.map).then(
                  function(result) {
                    $modalInstance.dismiss('cancel');
                    if (result.success) {
                      $rootScope.alerts = [{
                        type: 'success',
                        message: 'Map "' + $scope.map + '"" has been deleted ' +
                          'from the workspace "' + $scope.workspace + '".',
                        fadeout: true
                      }];
                    } else {
                      $rootScope.alerts = [{
                        type: 'danger',
                        message: 'Map "' + $scope.map + '"" could not be ' +
                          'deleted from the workspace "' +
                          $scope.workspace + '".',
                        fadeout: true
                      }];
                    }
                    if ($scope.mapNameCheck.name) {$scope.mapNameError = true;}
                    else {$scope.mapNameError = false;}
                  });
                //$window.location.reload();
              };

              $scope.cancel = function() {
                $modalInstance.dismiss('cancel');
              };
            }],
          backdrop: 'static',
          size: 'med'
        });
      };

      $scope.editMapSettings = function(map) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/map.settings.tpl.html',
          controller: 'EditMapSettingsCtrl',
          backdrop: 'static',
          size: 'md',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            map: function() {
              return map;
            }
          }
        });
      };

      // See utilities.js pop directive - 1 popover open at a time
      var openPopoverDownload;
      $scope.closePopovers = function(popo) {
        if (openPopoverDownload || openPopoverDownload===popo) {
          openPopoverDownload.showSourcePopover = false;
          openPopoverDownload = null;
        } else {
          popo.showSourcePopover = true;
          openPopoverDownload = popo;
        }
      };

      $scope.linkDownloads = function(map) {
        var bbox = [map.bbox.west, map.bbox.south, map.bbox.east,
          map.bbox.north];
        bbox = bbox.join();

        var baseurl = GeoServer.baseUrl() + '/' + map.workspace +
          '/wms?service=WMS&amp;version=1.1.0&request=GetMap&layers=' +
          map.name + '&bbox=' + bbox + '&width=700&height=700' +
          '&srs=' + map.proj.srs + '&format=';

        var kml = baseurl + 'application/vnd.google-earth.kml%2Bxml';
        var ol2 = baseurl + 'application/openlayers';
        var png = baseurl + 'image/png';
        var jpeg = baseurl + 'image/jpeg';
        var geotiff = baseurl + 'image/geotiff';

        map.download_urls = '';
        map.download_urls += '<a target="_blank" href="' + ol2 +
          '">OpenLayers</a> <br />';
        map.download_urls += '<a target="_blank" href="' + kml +
          '">KML</a> <br />';
        map.download_urls += '<a target="_blank" href="' + geotiff +
          '">GeoTIFF</a> <br />';
        map.download_urls += '<a target="_blank" href="' + png +
        '">PNG</a> <br />';
        map.download_urls += '<a target="_blank" href="' + jpeg +
        '">JPEG</a> <br />';

        map.urls_ready = true;
        map.download_urls = $sce.trustAsHtml(map.download_urls);
      };

      $scope.onCompose = function(map) {
        $state.go('map.compose', {
          workspace: map.workspace,
          name: map.name
        });
      };

      $scope.$on('ngGridEventEndCellEdit', function(evt){
        var target = evt.targetScope;
        var field = target.col.field;
        var map = target.row.entity;
        var patch = {};
        patch[field] = map[field];

        GeoServer.map.update(map.workspace, map.name, {title: patch[field]});
      });

      $scope.pagingOptions = {
        pageSizes: [15, 50, 100],
        pageSize: 15
      };
      $scope.filterOptions = {
        filterText: ''
      };

      $scope.gridSelections = [];
      $scope.gridOptions = {
        data: 'mapData',
        enableCellSelection: false,
        enableRowSelection: true,
        enableCellEdit: false,
        checkboxHeaderTemplate:
          '<input class="ngSelectionHeader" type="checkbox"' +
            'ng-model="allSelected" ng-change="toggleSelectAll(allSelected)"/>',
        sortInfo: {fields: ['name'], directions: ['asc']},
        showSelectionCheckbox: true,
        selectWithCheckboxOnly: true,
        selectedItems: $scope.gridSelections,
        multiSelect: true,
        columnDefs: [
          {field: 'name', displayName: 'Map Name', width: '15%'},
          {field: 'title',
            displayName: 'Title',
            enableCellEdit: true,
            cellTemplate:
              '<div class="grid-text-padding"' +
                'alt="{{row.entity.description}}"' +
                'title="{{row.entity.description}}">'+
                '{{row.entity.title}}' +
              '</div>',
            width: '20%'
          },
          {field: 'compose',
            displayName: 'Compose',
            cellClass: 'text-center',
            sortable: false,
            cellTemplate:
              '<div class="grid-text-padding" ng-class="col.colIndex()">' +
                '<a ng-click="onCompose(row.entity)">Compose</a>' +
              '</div>',
            width: '10%'
          },
          {field: 'preview',
            displayName: 'Preview',
            cellClass: 'text-center',
            sortable: false,
            cellTemplate:
              '<div ng-class="col.colIndex()">' +
                '<a ng-click="newOLWindow(row.entity)">' +
                  '<img ng-src="images/preview.png" alt="Preview Map"' +
                    'title="Preview Map" />' +
                '</a>' +
              '</div>',
            width: '7%'
          },
          {field: 'settings',
            displayName: 'Settings',
            sortable: false,
            cellClass: 'text-center',
            cellTemplate:
              '<div ng-class="col.colIndex()">' +
                '<a ng-click="editMapSettings(row.entity)">' +
                  '<img ng-src="images/settings.png"' +
                    'alt="Edit Map Settings" title="Edit Map Settings" />' +
                '</a>' +
              '</div>',
            width: '7%'
          },
          {field: 'download',
            displayName: 'Download',
            cellClass: 'text-center',
            sortable: false,
            cellTemplate:
              '<a popover-placement="bottom"' +
              'popover-html-unsafe="{{ row.entity.download_urls }}" pop-show=' +
              '"{{ row.entity.showSourcePopover && row.entity.urls_ready }}"' +
                'ng-click="closePopovers(row.entity);' +
                  'linkDownloads(row.entity);">' +
                '<div class="fa fa-download grid-icons" ' +
                  'alt="Download Map" title="Download Map"></div></a>',
            width: '10%'
          },
          {field: '',
            displayName: '',
            cellClass: 'pull-left',
            sortable: false,
            cellTemplate:
              '<div ng-class="col.colIndex()">' +
                '<a ng-click="deleteMap(row.entity, workspace.selected)">' +
                  '<img ng-src="images/delete.png" alt="Remove Map"' +
                    'title="Remove Map" />' +
                '</a>' +
              '</div>',
            width: '*'
          }
        ],
        enablePaging: true,
        enableColumnResize: false,
        showFooter: true,
        footerTemplate: '/components/grid/footer.tpl.html',
        totalServerItems: 'totalServerItems',
        pagingOptions: $scope.pagingOptions,
        filterOptions: $scope.filterOptions
      };

      $scope.workspace = {};
      $scope.workspaces = [];

      $scope.updatePaging = function () {
        var ws = $scope.workspace.selected;
        $scope.refreshLayers(ws);
      };

      $scope.setPage = function (page) {
        $scope.pagingOptions.currentPage = page;
      };

      $scope.$watch('pagingOptions', function (newVal, oldVal) {
        if (newVal != null) {
          var ws = $scope.workspace.selected;
          if (ws != null) {
            $scope.refreshLayers(ws);
          }
        }
      }, true);

      GeoServer.workspaces.get().then(
        function(result) {
          if (result.success) {
            var workspaces = result.data;
            workspaces.forEach(function(ws) {
              $scope.workspace.selected = ws;
              $scope.workspaceChanged(ws);
            });
            $scope.workspaces = workspaces;
          } else {
            $scope.alerts = [{
              type: 'warning',
              message: 'Workspace update failed.',
              fadeout: true
            }];
          }
        });

    }]);

