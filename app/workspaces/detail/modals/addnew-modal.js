angular.module('gsApp.workspaces.datastores', [
  'ngSanitize', 'angularFileUpload'
])
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
    $scope.uploadComplete = [];
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
    $scope.uploadComplete[index] = false;
    $scope.errorMsg = null;

    //$upload.upload()
    $scope.upload[index] = $upload.upload({
      url: geoserver.import.getImportUrl($scope.workspace),
      method: 'POST',
      //headers: {'my-header': 'my-header-value'},
      data : {
        myModel : $scope.myModel
      },
      file: $scope.selectedFiles[index],
      fileFormDataName: 'myFile'
    });

    $scope.upload[index].then(function(response) {
      var r = response.data;
      $scope.upload[index].rememberId = r.id;

      if (r.imported && r.imported.length > 0) {
        var upFilename = $scope.selectedFiles[index].name;
        r.imported.forEach(function(item) {
          if (upFilename.indexOf(item.file) > -1) {
            $scope.uploadResult.push(response.statusText);
            $timeout(function() {
              $scope.uploadComplete[index] = true;
            }, 200);
          }
        });
      } else if (r.pending && r.pending.length > 0) {
        r.pending.forEach(function(item) {
          $scope.upload[index].rememberTask = item.task;
          $scope.uploadResult.push(item.problem);
        });
      }

      /*
      $timeout(function() {
        $scope.uploadResult.push(response.statusText);
      });*/
    }, function(response) {
      if (response.status > 0) {
        //console.log("Error Msg");
        $scope.errorMsg = response.status + ': ' + response.data;
        //console.log($scope.errorMsg);
      }
    }, function(evt) {
        //console.log(evt);
        //console.log("why is this here");
        // Math.min is to fix IE which reports 200% sometimes
        $scope.progress[index] = Math.min(100, parseInt(100.0 *
         evt.loaded / evt.total));
      });
    $scope.upload[index].xhr(function(xhr){
    });

  }; // end $scope.start(index)

  var lastTriedValue;
  $scope.server = {};
  $scope.crs = {revised: ''};

  $scope.onAddCRS = function(index) {
    if ($scope.upload[index]) {
      lastTriedValue = $scope.upload[index];
    }
    geoserver.import.update(
      $scope.workspace, lastTriedValue.rememberId,
      {
        'task': lastTriedValue.rememberTask,
        'proj': $scope.crs.revised.toLowerCase()
      }).then(function(response) {
        if (!response.success) {
          $scope.server.response = response.data.message;
        } else {
          $timeout(function() {
            $scope.uploadComplete[index] = true;
            $scope.server.response = '';
          }, 200);
        }
      });
  };
}])
.directive('popoverHtmlUnsafePopup', function () {
    return {
      restrict: 'EA',
      replace: true,
      scope: { title: '@',
      content: '@',
      placement: '@',
      animation: '&',
      isOpen: '&' },
      templateUrl: '/workspaces/detail/modals/popover-html-unsafe.tpl.html',
    };
  })
.directive('popoverHtmlUnsafe', [ '$tooltip', function ($tooltip) {
  return $tooltip('popoverHtmlUnsafe', 'popover', 'click');
}]);
