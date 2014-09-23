/*global document, ZeroClipboard, $ */
angular.module('gsApp.olmap', [])
.factory('MapFactory', ['GeoServer', '$log',
    function(GeoServer, $log) {
      return {
        createMap: function(layers, element, options) {
          var requestedlayersList = layers[0].layers;
          var mapLayers = [];

          for (var k=requestedlayersList.length-1; k >= 0; k--) {
            var ll = requestedlayersList[k];
            mapLayers.push(new ol.layer.Image({
              source: new ol.source.ImageWMS({
                url: GeoServer.baseUrl()+'/'+ll.workspace+'/wms',
                params: {'LAYERS': ll.name, 'VERSION': '1.1.1'},
                serverType: 'geoserver'
              }),
              name: ll.name
            }));
          }

          // determine projection from first layer
          var l = layers[0];
          var proj = new ol.proj.Projection({
            code: l.proj.srs,
            units: l.proj.unit,
            axisOrientation: l.proj.type == 'geographic' ? 'neu' : 'enu'
          });

          var scaleControl = document.createElement('div');
          scaleControl.setAttribute('class', 'ol-scale');

          var clip = new ZeroClipboard(scaleControl);
          clip.on('copy', function (event) {
            var clipboard = event.clipboardData;
            clipboard.setData('text/plain',
              $(scaleControl).text().split(' : ')[1]);
          });

          var mapOpts = {
            view: new ol.View({
              center: l.bbox.native.center,
              projection: proj
            }),
            layers: mapLayers,
            controls: new ol.control.defaults({
              attribution: false
            }).extend([
              new ol.control.Control({element: scaleControl})
            ])
          };
          mapOpts = angular.extend(mapOpts, options || {});

          var map = new ol.Map(mapOpts);

          // set initial extent
          var bbox = l.bbox.native;
          var extent = [bbox.west,bbox.south,bbox.east,bbox.north];
          var size = [element.width(),element.height()];

          map.getView().on('change:resolution', function(evt) {
            var res = evt.target.get('resolution');
            var units = map.getView().get('projection').getUnits();
            var dpi = 25.4 / 0.28;
            var mpu = ol.proj.METERS_PER_UNIT[units];
            var scale = Math.round(res * mpu * 39.37 * dpi);
            scaleControl.innerHTML =  '1 : ' + scale;
          });

          map.getView().fitExtent(extent, size);
          return map;
        }
      };
    }])
.directive('olMap', ['$timeout', 'MapFactory', 'GeoServer', '$log',
  'olMapService',
    function($timeout, MapFactory, GeoServer, $log, olMapService) {
      return {
        restrict: 'EA',
        scope: {
          layers: '=?',
          center: '=?',
          zoom: '=?'
        },
        templateUrl: '/components/olmap/olmap.tpl.html',
        controller: function($scope, $element) {
          $scope.$watch('layers', function(newVal) {
            if (newVal == null) {
              return;
            }
            var map = MapFactory.createMap($scope.layers, $element);
            olMapService.updateMap(map);
            map.setTarget($element[0]);

            var view = map.getView();

            if ($scope.center) {
              view.setCenter($scope.center);
            }
            if ($scope.zoom) {
              view.setZoom($scope.zoom);
            }

            $scope.map = map;
          });

          $scope.$on('olmap-refresh', function() {
            $scope.map.getLayers().getArray().forEach(function(l) {
              var source = l.getSource();
              if (source instanceof ol.source.ImageWMS) {
                source.updateParams({update:Math.random()});
              }
            });
          });
        }
      };
    }])
.service('olMapService', [function() {
    var map;
    this.updateMap = function(map) {
      this.map = map;
    };
    return {
      map: map,
      updateMap: this.updateMap
    };
  }]);
