angular.module('gsApp.workspaces.workspace', [
  'ngGrid', 'ngSanitize', 'angularFileUpload'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('workspace.home', {
        url: '/home',
        templateUrl: '/workspaces/detail/workspace-home.tpl.html',
        controller: 'WorkspaceHomeCtrl'
      })
      .state('workspace.home.data', {
          url: '#data',
          templateUrl: '/workspaces/detail/workspace-home.tpl.html',
        })
      .state('workspace.home.maps', {
          url: '#maps',
          templateUrl: '/workspaces/detail/workspace-home.tpl.html',
        });
    }])
.controller('WorkspaceHomeCtrl', ['$scope', '$stateParams',
  'GeoServer', '$log', '$sce', 'baseUrl', '$window', '$state',
  '$location', '$modal',
    function($scope, $stateParams, GeoServer, $log, $sce, baseUrl,
      $window, $state, $location, $modal) {

      $scope.tabs = {'data': false, 'maps': true};
      $scope.$on('$stateChangeSuccess', function(event, toState,
        toParams, fromState, fromParams) {
          if ($location.hash() === 'data') {
            $scope.tabs.data = true;
          } else {
            $scope.tabs.maps = true;
          }
        });

      var wsName = $stateParams.workspace;
      $scope.workspace = wsName;
      $scope.title = wsName;
      $scope.thumbnails = {};
      $scope.olmaps = {};

      // Maps

      GeoServer.maps.get({workspace: wsName}).$promise
        .then(function(maps) {

          $scope.maps = maps;

          // load all map thumbnails & metadata
          for (var i=0; i < $scope.maps.length; i++) {
            var map = $scope.maps[i];
            var layers = '';

            $scope.maps[i].workspace = wsName;
            $scope.maps[i].layergroupname = wsName + ':' + map.name;
            $scope.maps[i].layerCount = map.layers.length;
            var bbox = $scope.maps[i].bbox = '&bbox=' + map.bbox.west +
             ',' + map.bbox.south + ',' + map.bbox.east + ',' +
             map.bbox.north;

            var url = GeoServer.map.thumbnail.get(map.workspace, map,
              map.layergroupname, 250, 250);
            var srs = '&srs=' + map.proj.srs;

            $scope.thumbnails[map.name] = url + bbox +
              '&format=image/png' + srs;
          }
        });

      $scope.sanitizeHTML = function(description) {
        return $sce.trustAsHtml(description);
      };

      $scope.newOLWindow = function(map) {
        var baseUrl = GeoServer.map.openlayers.get(map.workspace,
          map.name, map.bbox, 800, 500);
        $window.open(baseUrl);
      };

      $scope.onEdit = function(map) {
        $state.go('map.compose', {
          workspace: map.workspace,
          name: map.name
        });
      };

      // Data

      /*GeoServer.alldata.get().$promise.then(function(data) {
        $scope.data = data;
      });*/
      $scope.datastores = GeoServer.datastores.get().datastores;

      $scope.selectStore = function(store) {
        $scope.selectedStore = store;
        $scope.selectedStore.imported = store.layers_imported.length;
        $scope.selectedStore.unimported = store.layers_unimported.length;
      };

      // Modals

      $scope.addNewStore = function() {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/addnew-modal.tpl.html',
          controller: 'AddNewModalCtrl',
          size: 'md',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            geoserver: function() {
              return GeoServer;
            }
          }
        });

      };

    }])
.controller('AddNewModalCtrl', ['$scope', '$modalInstance', 'workspace',
  'geoserver', '$upload', '$timeout', '$sce', '$http', '$window',
  function ($scope, $modalInstance, workspace, geoserver, $upload, $timeout,
   $sce, $http, $window) {

  $scope.workspace = workspace;
  $scope.geoserver = geoserver;

  $scope.selected = {
    item: $scope.workspace
  };

  $scope.ok = function () {
    $modalInstance.close($scope.selected.item);
  };

  $scope.cancel = function () {
    $scope.abortAll();
    $modalInstance.dismiss('cancel');
  };

  // File Upload - https://github.com/danialfarid/angular-file-upload/blob/master/demo/war/js/angular-file-upload.js

  $scope.usingFlash = false;
  $scope.uploadRightAway = false;
  $scope.hasUploader = function(index) {
    return $scope.upload[index] !== null;
  };
  $scope.abort = function(index) {
    $scope.upload[index].abort();
    $scope.upload[index] = null;
  };

  $scope.abortAll = function() {
    if ($scope.upload && $scope.upload.length > 0) {
      for (var k = 0; k < $scope.upload.length; k++) {
        if ($scope.upload[k] != null) {
          $scope.upload[k].abort();
        }
      }
    }
  };

  $scope.onFileSelect = function($files) {
    $scope.selectedFiles = [];
    $scope.progress = [];
    $scope.abortAll();
    $scope.upload = [];
    $scope.uploadResult = [];
    $scope.selectedFiles = $files;
    $scope.dataUrls = [];
    for (var i = 0; i < $files.length; i++) {
      $scope.progress[i] = -1;
      if ($scope.uploadRightAway) {
        $scope.start(i);
      }
    }
  };

  $scope.start = function(index) {
    $scope.progress[index] = 0;
    $scope.errorMsg = null;
    //$upload.upload()
    $scope.upload[index] = $upload.upload({
        url: geoserver.import.getUrl($scope.workspace),
        method: 'POST',
        //headers: {'my-header': 'my-header-value'},
        data : {
          myModel : $scope.myModel,
          errorCode: $scope.generateErrorOnServer && $scope.serverErrorCode,
          errorMessage: $scope.generateErrorOnServer && $scope.serverErrorMsg
        },
        file: $scope.selectedFiles[index],
        fileFormDataName: 'myFile'
      });
    $scope.upload[index].then(function(response) {
      $timeout(function() {
        $scope.uploadResult.push(response.statusText);
      });
    }, function(response) {
      if (response.status > 0) {
        $scope.errorMsg = response.status + ': ' + response.data;
      }
    }, function(evt) {
      // Math.min is to fix IE which reports 200% sometimes
      $scope.progress[index] = Math.min(100, parseInt(100.0 *
       evt.loaded / evt.total));
    });
    $scope.upload[index].xhr(function(xhr){
    });

  };

}]);
