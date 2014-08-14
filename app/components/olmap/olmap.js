angular.module('gsApp.olmap', [])
.factory('MapFactory', ['GeoServer',
    function(GeoServer) {
      return {
        createMap: function(layers, options) {
          var mapLayers = layers.map(function(l) {
            return new ol.layer.Image({
              source: new ol.source.ImageWMS({
                url: GeoServer.baseUrl()+'/'+l.workspace+'/wms',
                params: {'LAYERS': l.name},
                serverType: 'geoserver'
              })
            });
          });
          var mapOpts = {
            view: new ol.View({
              center:[0,0],
              zoom: 2,
              projection: layers[0].proj.srs
            }),
            layers: mapLayers
          };
          mapOpts = angular.extend(mapOpts, options || {});
          return new ol.Map(mapOpts);
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
            var map = MapFactory.createMap($scope.layers);
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
