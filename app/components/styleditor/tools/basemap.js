/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/* globals $ */
angular.module('gsApp.styleditor.basemap', [])
.controller('BasemapModalCtrl', ['$scope', '$modalInstance', '$upload',
  '$log', 'GeoServer', '$timeout', 'workspace', 'mapOrLayer', '$rootScope',
  'AppEvent',
    function($scope, $modalInstance, $upload, $log, GeoServer,
      $timeout, workspace, mapOrLayer, $rootScope, AppEvent) {

      $scope.workspace = workspace;
      if (mapOrLayer) {
        $scope.mapOrLayer = mapOrLayer;
      } else {
        $scope.mapOrLayer = {};
        $scope.mapOrLayer.isMercator = true;
        $scope.mapOrLayer.proj = {'srs': 'EPSG:3857'};
      }

      var srs = $scope.mapOrLayer.proj.srs;

      if (srs.indexOf('900913') > -1) {
        $scope.mapOrLayer.isMercator = true;
      } else if (srs.indexOf('3857') > -1) {
        $scope.mapOrLayer.isMercator = true;
      }

      $scope.basemapExtraOptions = { 'tiled': true }; // Custom WMS

      $scope.basemapOptions = [
        {
          'type': 'osm',
          'display_type': 'OSM',
          'url_req': false,
          'key_req': false,
          'isMercator': true
        },
        {
          'type': 'stamen',
          'display_type': 'Stamen (Toner Lite)',
          'url_req': false,
          'key_req': false,
          'isMercator': true
        },
        {
          'type': 'bing',
          'display_type': 'Bing',
          'url_req': false,
          'key_req': true,
          'styles': ['Road', 'Aerial', 'AerialWithLabels',
            'collinsBart', 'ordnanceSurvey'],
          'isMercator': true
        },
        {
          'type': 'mapbox',
          'display_type': 'MapBox',
          'url_req': false,
          'key_req': true,
          'isMercator': true
        },
        {
          'type': 'esri',
          'display_type': 'ESRI',
          'url_req': true,
          'isMercator': false
        },
        {
          'type': 'tilewms',
          'display_type': 'WMS (Custom)',
          'url_req': true,
          'key_req': false,
          'isMercator': false,
          'url': 'http://demo.boundlessgeo.com/geoserver/ne/wms',
          'serverType': 'geoserver',
          'layer': 'ne:ne_10m_admin_0_countries',
          'tiled': true,
          'format': 'image/png',
          'version': '1.3.0',
          'tiledwms': true
        }
      ];

      $scope.$watch('basemapExtraOptions.tiled', function(newVal) {
        if (newVal != null) {
          $scope.basemapOptions[5].tiledwms = newVal;
        }
      }, true);

      // mapbox-specific
      $scope.$watch('basemap.mapid', function(newVal) {
        if (newVal && $scope.basemap.type == 'mapbox') {
          $scope.basemap.url = 'http://api.tiles.mapbox.com/v4/' +
            $scope.basemap.mapid + '/{z}/{x}/{y}.png?access_token=' +
            $scope.basemap.key;
        }
      }, true);
      $scope.$watch('basemap.key', function(newVal) {
        if (newVal && $scope.basemap.type == 'mapbox') {
          $scope.basemap.url = 'http://api.tiles.mapbox.com/v4/' +
            $scope.basemap.mapid + '/{z}/{x}/{y}.png?access_token=' +
            $scope.basemap.key;
        }
      }, true);

      $scope.close = function () {
        $modalInstance.dismiss('cancel');
      };

      $scope.add = function() {
        $rootScope.$broadcast(AppEvent.BaseMapChanged, $scope.basemap);
        $scope.close();
      };

    }]);

