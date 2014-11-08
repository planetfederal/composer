angular.module('gsApp.workspaces.layers.addtomap', [])
.controller('AddToMapLayerCtrl', ['workspace', 'map', '$scope',
  '$rootScope', '$state', '$log', '$modalInstance', 'GeoServer',
  'AppEvent', 'layersListModel', '_',
    function(workspace, map, $scope, $rootScope, $state, $log,
      $modalInstance, GeoServer, AppEvent, layersListModel, _) {

      $scope.workspace = workspace;
      $scope.map = map;

      layersListModel.fetchLayers(workspace).then(
        function() {
          $scope.layers = layersListModel.getLayers();

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
        });

      $scope.addSelectedToMap = function() {
        var mapInfo = {
          'name': map.name
        };
        mapInfo.layersToAdd = [];
        for (var k=0; k < $scope.layerSelections.length; k++) {
          var layer = $scope.layerSelections[k];
          mapInfo.layersToAdd.push({
            'name': layer.name,
            'workspace': $scope.workspace
          });
        }
        GeoServer.map.layers.add($scope.workspace, mapInfo.name,
          mapInfo.layersToAdd).then(function(result) {
            if (result.success) {
              $rootScope.alerts = [{
                type: 'success',
                message: mapInfo.layersToAdd.length +
                  ' layer(s) added to map ' + mapInfo.name + '.',
                fadeout: true
              }];
              $scope.close();
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
        sortInfo: {fields: ['name'], directions: ['asc']},
        showSelectionCheckbox: false,
        selectWithCheckboxOnly: false,
        selectedItems: $scope.layerSelections,
        multiSelect: true,
        columnDefs: [
          {field: 'select', displayName: 'Select', width: '10%',
          cellTemplate: '<div ng-if="!row.entity.alreadyInMap"' +
            'style="margin: 12px 0 0px 20px; padding: 0;">' +
            '<input type="checkbox" ng-model="row.entity.selected"' +
            'ng-click="row.entity.selected=!row.entity.selected;' +
            'addToLayerSelections(row.entity);"></div>'
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
              'Already in map</div>',
            width: '20%'
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
    }]);
