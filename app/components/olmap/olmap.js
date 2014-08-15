angular.module('gsApp.olmap', [])
.factory('MapFactory', ['GeoServer',
    function(GeoServer) {
      return {
        createMap: function(layers, element, options) {
          var mapLayers = layers.map(function(l) {
            return new ol.layer.Image({
              source: new ol.source.ImageWMS({
                url: GeoServer.baseUrl()+'/'+l.workspace+'/wms',
                params: {'LAYERS': l.name},
                serverType: 'geoserver'
              })
            });
          });

          // determine projection from first layer
          var l = layers[0];
          var proj = new ol.proj.Projection({
            code: l.srs,
          //  units: l.proj.unit,
          //  axisOrientation: l.proj.type == 'geographic' ? 'neu' : 'enu'
          });

          var mapOpts = {
            view: new ol.View({
              center: l.center,
              projection: proj
            }),
            layers: mapLayers
          };
          mapOpts = angular.extend(mapOpts, options || {});

          var map = new ol.Map(mapOpts);

          // set initial extent
          var bbox = l.bbox;
          var extent = [bbox.west,bbox.south,bbox.east,bbox.north];
          var size = [element.width(),element.height()];
          map.getView().fitExtent(extent, size);
          return  map;
        }
      };
    }])
.directive('olMap', ['$timeout', 'MapFactory', 'GeoServer', '$log',
    function($timeout, MapFactory, GeoServer, $log) {
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

          $scope.$on('refresh', function() {
            $scope.map.getLayers().getArray().forEach(function(l) {
              var source = l.getSource();
              if (source instanceof ol.source.ImageWMS) {
                source.updateParams({update:Math.random()});
              }
            });
          });
        }
      };
    }]);
