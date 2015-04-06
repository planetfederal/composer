/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/* globals $ */
angular.module('gsApp.styleditor.basemap', [])
.controller('BasemapModalCtrl', ['$scope', '$modalInstance', '$upload',
  '$log', 'GeoServer', '$timeout', 'workspace', 'map',
    function($scope, $modalInstance, $upload, $log, GeoServer,
      $timeout, workspace, map) {

      $scope.workspace = workspace;
      $scope.map = map;

      $scope.basemap = {
        'url': 'osm'
      };

      $scope.close = function () {
        $modalInstance.dismiss('cancel');
      };

      $scope.add = function() {
        $scope.$parent.basemap = $scope.basemap.url;
      };
    }]);

