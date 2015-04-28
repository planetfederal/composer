/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.layers.addtomap', [
  'ngGrid'
])
.controller('AddToMapLayerCtrl', ['workspace', 'map', '$scope',
  '$rootScope', '$state', '$log', '$modalInstance', 'GeoServer',
  'AppEvent', 'layersListModel', '_', '$timeout',
    function(workspace, map, $scope, $rootScope, $state, $log,
      $modalInstance, GeoServer, AppEvent, layersListModel, _,
      $timeout) {

      $scope.workspace = workspace;
      $scope.map = map;

      function reinstateVisibility (prevLayers, newLayers) {
        for (var j=0; j < newLayers.length; j++) {
          var newLayer = newLayers[j];
          var prevLayer = _.find(prevLayers, function(prevLayer) {
            return newLayer.name===prevLayer.name;
          });
          if (prevLayer) {
            newLayer.visible = prevLayer.visible;
          } else {
            newLayer.visible = true;
          }
        }
        return newLayers;
      }

      $scope.addSelectedToMap = function() {
        var mapInfo = {
          'name': map.name
        };
        mapInfo.layersToAdd = [];
        for (var k=0; k < $scope.layerSelections.length; k++) {
          var layer = $scope.layerSelections[k];
          mapInfo.layersToAdd.push({
            'name': layer.name,
            'workspace': layer.workspace
          });
        }
        GeoServer.map.layers.add($scope.workspace, mapInfo.name,
          mapInfo.layersToAdd).then(function(result) {
            if (result.success) {
              $scope.map.layers =
                reinstateVisibility($scope.map.layers, result.data);
              $rootScope.alerts = [{
                type: 'success',
                message: mapInfo.layersToAdd.length +
                  ' layer(s) added to map ' + mapInfo.name + '.',
                fadeout: true
              }];
              $scope.close('added');
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Layer(s) could not be added to map ' +
                  mapInfo.name + '.',
                fadeout: true
              }];
            }
          });
      };

      $scope.close = function () {
        $modalInstance.close('close');
      };

      $scope.importDataToNewLayers = function() {
        $modalInstance.close('import');
      };

      $scope.addToLayerSelections = function (layer) {
        if (!layer.selected) {
          $scope.layerSelections = _.remove($scope.layerSelections,
            function(lyr) {
              return lyr.name===layer.name;
            });
        } else {
          $scope.layerSelections.push(layer);
        }
      };

      // Available Layers Table with custom checkbox

      var modalWidth = 800;
      $scope.gridWidth = {'width': modalWidth};


      $scope.opts = {
        paging: {
          pageSizes: [25, 50, 100],
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

      $scope.layerSelections = [];

      $scope.layerOptions = {
        data: 'layers',
        enableCellSelection: false,
        filterOptions: $scope.opts.filter,
        enableRowSelection: false,
        enableCellEdit: false,
        enableRowReordering: false,
        jqueryUIDraggable: false,
        checkboxHeaderTemplate:
          '<input class="ngSelectionHeader" type="checkbox"' +
            'ng-model="allSelected" ng-change="toggleSelectAll(allSelected)"/>',
        int: function() {
          $log('done');
        },
        sortInfo: $scope.opts.sort,
        showSelectionCheckbox: false,
        selectWithCheckboxOnly: false,
        selectedItems: $scope.layerSelections,
        multiSelect: true,
        columnDefs: [
          {field: 'select', displayName: 'Select', width: '10%',
          cellTemplate: '<div ng-if="!row.entity.alreadyInMap"' +
            'style="margin: 12px 0 0px 20px; padding: 0;">' +
            '<input type="checkbox" ng-model="row.entity.selected" ' +
            'ng-click="addToLayerSelections(row.entity);"></div>'
          },
          {field: 'name', displayName: 'Layer', width: '20%'},
          {field: 'title',
            displayName: 'Title',
            enableCellEdit: false,
            cellTemplate:
              '<div class="grid-text-padding"' +
                'alt="{{row.entity.description}}"' +
                'title="{{row.entity.description}}">' +
                '{{row.entity.title}}' +
              '</div>',
            width: '30%'
          },
          {field: 'inMap',
            displayName: 'Status',
            cellClass: 'text-center',
            cellTemplate:
              '<div class="grid-text-padding"' +
                'ng-show="row.entity.alreadyInMap">' +
              'In Map</div>',
            width: '10%',
            sortable: false
          },
          {field: 'modified.timestamp',
            displayName: 'Modified',
            cellClass: 'text-center',
            cellFilter: 'modified.timestamp',
            cellTemplate:
              '<div class="grid-text-padding"' +
                'ng-show="row.entity.modified">' +
              '{{ row.entity.modified.pretty }}</div>',
            width: '20%',
            sortable: false
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
        enablePaging: true,
        enableColumnResize: false,
        showFooter: false,
        totalServerItems: 'totalServerItems',
        pagingOptions: $scope.opts.paging,
        useExternalSorting: true
      };

      $scope.$watch('opts', function(newVal, oldVal) {
        if (newVal && newVal !== oldVal) {
          $scope.refreshLayers();
        }
      }, true);

      var refreshTimer = null;
      $scope.refreshLayers = function() {
        if (refreshTimer) {
          $timeout.cancel(refreshTimer);
        }
        refreshTimer = $timeout(function() {
          $scope.serverRefresh();
        }, 800);
      };

      function disableExistingLayers () {
        // disable layers already in map
        for (var k=0; k < $scope.layers.length; k++) {
          var layer = $scope.layers[k];
          for (var j=0; j < map.layers.length; j++) {
            var mapLayer = map.layers[j];
            if (layer.name===mapLayer.name) {
              layer.alreadyInMap = true;
            }
          }
        }
      }

      $scope.serverRefresh = function() {
        if ($scope.workspace) {
          var opts = $scope.opts;
          GeoServer.layers.get(
            $scope.workspace,
            opts.paging.currentPage-1,
            opts.paging.pageSize,
            opts.sort.fields[0] + ':' +
              opts.sort.directions[0],
            opts.filter.filterText
          ).then(function(result) {
            if (result.success) {
              $scope.layers = result.data.layers;
              disableExistingLayers();
              $scope.totalServerItems = result.data.total;
              $scope.itemsPerPage = opts.paging.pageSize;
              $scope.totalItems = $scope.totalServerItems;
            } else {
              $rootScope.alerts = [{
                type: 'warning',
                message: 'Layers for workspace ' + $scope.workspace +
                  ' could not be loaded.',
                fadeout: true
              }];
            }
          });
        }
      };

    }]);
