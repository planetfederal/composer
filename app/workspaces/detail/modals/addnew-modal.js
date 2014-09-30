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
      //console.log(bytesToSize($files[i].size));
      $files[i].bytes = bytesToSize($files[i].size);
      //console.log($files[i]);
    }
  };

  $scope.crsTooltip = '<h5>Add a projection in EPSG</h5><p>CRS lookup from a .prj file is available at <a href="http://prj2epsg.org/search" target="_blank">http://prj2epsg.org</a></p>';

  $scope.start = function(index) {
    $scope.progress[index] = 0;
    $scope.uploadComplete[index] = false;
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
     // console.log($scope.selectedFiles[index]);
     // console.log(response);
      var r = response.data;

      if (r.imported.length > 0) {
        var upFilename = $scope.selectedFiles[index].name;
        r.imported.forEach(function(item) {
          if (upFilename.indexOf(item.file) > -1) {
            $scope.uploadResult.push(response.statusText);
            $scope.uploadComplete[index] = true;
          }
        });

      } else if (r.pending.length > 0) {
        var rememberTask;
        r.pending.forEach(function(item) {
          rememberTask = item.task;
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
       // console.log("why here");
        // Math.min is to fix IE which reports 200% sometimes
        $scope.progress[index] = Math.min(100, parseInt(100.0 *
         evt.loaded / evt.total));
      });
    $scope.upload[index].xhr(function(xhr){
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
