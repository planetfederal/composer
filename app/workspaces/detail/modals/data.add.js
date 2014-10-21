angular.module('gsApp.workspaces.data.add', [
  'ngSanitize', 'angularFileUpload'
])
.controller('WorkspaceAddDataCtrl', ['workspace', '$scope',
  '$modalInstance','$upload', '$timeout', 'GeoServer', 'storeAdded',
  function (workspace, $scope, $modalInstance, $upload, $timeout,
    GeoServer, storeAdded) {

    $scope.title = 'Add Data';

    $scope.workspace = workspace;
    $scope.storeAdded = storeAdded;
    $scope.selected = {
      item: $scope.workspace
    };

    var Complete = Object.freeze({
      'no': 0,
      'yes': 1,
      'pending': 2,
      'error': 3,
      'ignored': 4
    });
    $scope.Complete = Complete;

    $scope.ok = function () {
      $modalInstance.close($scope.selected.item);
    };

    $scope.cancel = function () {
      $scope.abortAll();
      $modalInstance.dismiss('cancel');
    };

    // File Upload - http://goo.gl/9EwrEq

    $scope.usingFlash = false;
    $scope.uploadRightAway = false;
    $scope.hasUploader = function(index) {
      return $scope.upload[index] !== null;
    };
    $scope.abort = function(index) {
      if ($scope.upload[index]) {
        $scope.upload[index].abort();
      }
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

    function bytesToSize(bytes) {
      if (bytes == 0) {
        return '0 Byte';
      }
      var k = 1000;
      var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      var i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
    }

    $scope.onFileSelect = function($files) {
      $scope.selectedFiles = [];
      $scope.progress = [];
      $scope.abortAll();
      $scope.upload = [];
      $scope.uploadResult = [];
      $scope.status = [];
      $scope.selectedFiles = $files;
      $scope.dataUrls = [];
      for (var i = 0; i < $files.length; i++) {
        $scope.progress[i] = -1;
        if ($scope.uploadRightAway) {
          $scope.start(i);
        }
        $files[i].bytes = bytesToSize($files[i].size);
      }
    };

    $scope.crsTooltip =
      '<h5>Add a projection in EPSG</h5>' +
      '<p>CRS lookup from a .prj file is available at ' +
        '<a href="http://prj2epsg.org/search" target="_blank">' +
          'http://prj2epsg.org' +
        '</a>' +
      '</p>';

    $scope.start = function(index) {
      $scope.progress[index] = 0;
      $scope.status[index] = Complete.no;
      $scope.errorMsg = null;
      $scope.loadStarted = false;

      $scope.upload[index] = $upload.upload({
        url: GeoServer.import.getImportUrl($scope.workspace),
        method: 'POST',
        file: $scope.selectedFiles[index]
      });

      $scope.loadStarted = true;
      $scope.uploadResult[index] = [];

      $scope.upload[index].then(function(response) {
        var r = response.data;
        $scope.upload[index].rememberId = r.id;
        $scope.loadStarted = false;

        if (r.imported && r.imported.length > 0) {
          var upFilename = $scope.selectedFiles[index].name;
          r.imported.forEach(function(item) {
            $scope.selectedFiles[index].name = item.name;
            // ** Sometimes names will be different from zip
            // e.g. uploaded allpoints.zip but got points.shp
            $scope.uploadResult[index].push({'result': response.statusText});
            $timeout(function() {
              $scope.status[index] = Complete.yes;
            }, 200);
          });
        } else if (r.pending && r.pending.length > 0) {
          r.pending.forEach(function(item) {
            $scope.upload[index].rememberTask = item.task;
            $scope.uploadResult[index].push({'result': item.problem});
            $scope.status[index] = Complete.pending;
          });
        } else if (r.ignored && r.ignored.length > 0) {
          r.ignored.forEach(function(item) {
            $scope.selectedFiles[index].name = item.name;
            $scope.status[index] = Complete.ignored;
            $scope.uploadResult[index].push({
              'result': 'IGNORED',
              'msg': 'File ignored: incomplete.'
            });
          });
        } else if (r.failed && r.failed.length > 0) {
          r.failed.forEach(function(item) {
            $scope.selectedFiles[index].name = item.name;
            var rMsg = r.failed.problem? (': ' +  r.failed.problem) : '.';
            $scope.status[index] = Complete.error;
            $scope.uploadResult[index].push({
              'result': 'FAILED',
              'msg': 'Upload failed: ' + rMsg
            });
          });
        } else if (response.statusText) {
          $scope.status[index] = Complete.error;
          $scope.uploadResult[index].push({
            'result': 'ERROR',
            'msg': response.statusText
          });
        }

      }, function(response) {
       // if (response.status > 0) {
        //  $scope.errorMsg = response.status + ': ' + response.data;
        //}
      }, function(evt) {
          // Math.min is to fix IE which reports 200% sometimes
          if (evt.loaded) {
            $scope.progress[index] = Math.min(100, parseInt(100.0 *
             evt.loaded / evt.total));
          }
        });
      $scope.upload[index].xhr(function(xhr){
        if (xhr.loaded) {
          $scope.progress[index] = Math.min(100, parseInt(100.0 *
           xhr.loaded / xhr.total));
        }
      });

    }; // end $scope.start(index)

    var lastTriedValue;
    $scope.server = {};
    $scope.crs = {revised: ''};

    $scope.onAddCRS = function(index) {
      if ($scope.upload[index]) {
        lastTriedValue = $scope.upload[index];
      }
      GeoServer.import.update(
        $scope.workspace, lastTriedValue.rememberId,
        {
          'task': lastTriedValue.rememberTask,
          'proj': $scope.crs.revised.toLowerCase()
        }).then(function(response) {
          if (!response.success) {
            $scope.server.response = response.data.message;
          } else {
            $timeout(function() {
              $scope.status[index] = Complete.yes;
              $scope.server.response = '';
            }, 200);
          }
        });
    };
  }]);
