angular.module('gsApp.data.import', [
  'ngGrid',
  'angularFileUpload',
  'gsApp.core.utilities',
  'gsApp.projfield'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('data.import', {
        url: '/:workspace/import',
        templateUrl: '/data/import.tpl.html',
        controller: 'DataImportCtrl'
      });
      $stateProvider.state('data.import.file', {
        url: '/file',
        templateUrl: '/data/import.file.tpl.html',
        controller: 'DataImportFileCtrl'
      });
      $stateProvider.state('data.import.db', {
        url: '/db',
        templateUrl: '/data/import.db.tpl.html',
        controller: 'DataImportDbCtrl'
      });
      $stateProvider.state('data.import.details', {
        url: '/details/:import',
        templateUrl: '/data/import.details.tpl.html',
        controller: 'DataImportDetailsCtrl'
      });
    }])
.controller('DataImportCtrl', ['$scope', '$state', '$stateParams', 'GeoServer',
    function($scope, $state, $stateParams, GeoServer) {
      $scope.title = 'Import Data';

      var wsName = $stateParams.workspace;

      $scope.is = function(route) {
        return $state.is('data.import'+(route!=null?'.'+route:''));
      };

      $scope.go = function(route) {
        $state.go('data.import.'+route);
      };

      $scope.next = function(imp) {
        $state.go('data.import.details', {'import': imp.id});
      };

      GeoServer.workspace.get(wsName).then(function(result) {
        if (result.success) {
          $scope.workspace = result.data;
          $scope.go('file');
        }
      });
    }])
.controller('DataImportFileCtrl', ['$scope', '$state', '$upload', '$log',
    'GeoServer',
    function($scope, $state, $upload, $log, GeoServer) {
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
        });
      };
      $scope.progress = {percent: 0};
    }])
.controller('DataImportDbCtrl', ['$scope', '$state', '$stateParams',
    function($scope, $state, $stateParams) {
      $scope.workspace = $stateParams.workspace;
    }])
.controller('DataImportDetailsCtrl', ['$scope', '$state', '$stateParams',
    '$log', 'GeoServer',
    function($scope, $state, $stateParams, $log, GeoServer) {
      $scope.workspace = $stateParams.workspace;

      var baseGridOpts = {
        enableCellSelection: false,
        enableRowSelection: false,
        enableCellEdit: false,
        showSelectionCheckbox: false,
        selectWithCheckboxOnly: false,
        multiSelect: false,
      };
      $scope.completedGridOpts = angular.extend({
        data: 'importedLayers',
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
            });
        });
      };

    }]);
