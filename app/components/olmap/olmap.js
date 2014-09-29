/*global window, document, ZeroClipboard, $ */
angular.module('gsApp.olmap', [])
.factory('MapFactory',
    ['GeoServer', 'AppEvent', '$timeout', '$rootScope', '$log',
    function(GeoServer, AppEvent, $timeout, $rootScope, $log) {
      function OLMap(mapOpts, element, options) {
        var self = this;
        this.mapOpts = mapOpts;

        var layerNames  = this.visibleLayerNames().reverse().join(',');
        var mapLayer = new ol.layer.Image({
          source: new ol.source.ImageWMS({
            url: GeoServer.baseUrl()+'/'+mapOpts.workspace+'/wms',
            params: {'LAYERS': layerNames, 'VERSION': '1.1.1'},
            serverType: 'geoserver',
          })
        });

        // determine projection from first layer
        var p = mapOpts.proj;
        var proj = new ol.proj.Projection({
          code: p.srs,
          units: p.unit,
          axisOrientation: p.type == 'geographic' ? 'neu' : 'enu'
        });

        // initial extent
        var bbox = mapOpts.bbox;
        var extent = [bbox.west,bbox.south,bbox.east,bbox.north];
        var size = [element.width(),element.height()];

        // scale control
        var scaleControl = $('<div>').addClass('ol-scale')[0];
        new ZeroClipboard(scaleControl).on('copy', function(event) {
          var clipboard = event.clipboardData;
          clipboard.setData('text/plain',
            $(scaleControl).text().split(' : ')[1]);
        });

        // zoom to extent control
        var extentControl = $('<div>').addClass('ol-zoom')[0];

        // copy bounds control

        // tooltip for bounds button
        // OL Tooltips not possible:
        // https://github.com/zeroclipboard/zeroclipboard/issues/369
        var boundsTipTimer = null;
        var tip = $('<span>').addClass('b-tooltip').html('Copy bounds')[0];
        var copiedTip = $('<span>').addClass('b-tooltip')
          .html('Bounds copied to clipboard ')[0];
        var currentTip;

        var boundsTip = function(el, copied) {
          var tipType = copied? copiedTip : tip;
          if (copied) {
            el.parentNode.removeChild(currentTip);
            boundsTipTimer = null;
          }
          if (boundsTipTimer === null) {
            el.parentNode.appendChild(tipType);
            currentTip = tipType;
            boundsTipTimer = $timeout(function() {
              if (tipType.parentNode == el.parentNode) {
                el.parentNode.removeChild(tipType);
              }
              boundsTipTimer = null;
            }, 900);
          }
        };

        var boundsButton = $('<button>')
          .mouseover(function(e) {
            boundsTip(this);
          })
          .click(function(e) {
            boundsTip(this, true);
          });

        var boundsControl = $('<div>')
          .addClass('bounds ol-unselectable ol-control')
          .append(boundsButton)[0];

        ol.control.Control.call(this, {
          element: boundsControl
        });
        ol.inherits(boundsControl, ol.control.Control);

        new ZeroClipboard(boundsButton)
          .on('copy', function(event) {
            var clipboard = event.clipboardData;
            var extent = self.olMap.getView().calculateExtent(map.getSize());
            clipboard.setData('text/plain', extent.toString());
          })
          .on('aftercopy', function(event) {
            $(boundsButton).click();
          });

        var map = new ol.Map(angular.extend({
          target: element[0],
          view: new ol.View({
            center: bbox.center,
            projection: proj
          }),
          layers: [mapLayer],
          controls: new ol.control.defaults({
            attribution: false
          }).extend([
            new ol.control.Control({element: scaleControl}),
            new ol.control.ZoomToExtent({
              element: extentControl,
              extent: extent
            }),
            new ol.control.Control({element: boundsControl})
          ])
        }, options || {}));

        map.getView().on('change:resolution', function(evt) {
          var res = evt.target.get('resolution');
          var units = map.getView().get('projection').getUnits();
          var dpi = 25.4 / 0.28;
          var mpu = ol.proj.METERS_PER_UNIT[units];
          var scale = Math.round(res * mpu * 39.37 * dpi);
          scaleControl.innerHTML =  '1 : ' + scale;
        });

        map.getView().fitExtent(extent, size);
        this.olMap = map;

        // Update map 550 ms after sidebar is resized
        var mapsizeTimer = null;
        $rootScope.$on(AppEvent.SidenavResized, function() {
          if (mapsizeTimer === null) {
            mapsizeTimer = $timeout(function() {
              self.olMap.updateSize();
              mapsizeTimer = null;
            }, 450);
          }
        });
      }

      OLMap.prototype.visibleLayerNames = function() {
        return this.mapOpts.layers.filter(function(l) {
          return l.visible == true;
        }).map(function(l) {
          return l.name;
        });
      };

      OLMap.prototype.update = function() {
        var layerNames = this.visibleLayerNames().reverse().join(',');
        var layer = this.olMap.getLayers().item(0);
        layer.getSource().updateParams({ LAYERS: layerNames });
      };

      OLMap.prototype.refresh = function() {
        this.olMap.getLayers().getArray().forEach(function(l) {
            var source = l.getSource();
            if (source instanceof ol.source.ImageWMS) {
              source.updateParams({update:Math.random()});
            }
          });
      };

      return {
        createMap: function(mapOpts, element, options) {
          return new OLMap(mapOpts, element, options);
        }
      };
    }])
.directive('olMap', ['$timeout', 'MapFactory', 'GeoServer', '$log', '$window',
    function($timeout, MapFactory, GeoServer, $log, $window) {
      return {
        restrict: 'EA',
        scope: {
          mapOpts: '=?'
        },
        templateUrl: '/components/olmap/olmap.tpl.html',
        controller: function($scope, $element) {

          $scope.$watch('mapOpts', function(newVal) {
            if (newVal == null) {
              return;
            }

            $scope.map = MapFactory.createMap($scope.mapOpts, $element);
          });

          $scope.$watch('mapOpts.layers', function(newVal) {
            if (newVal == null) {
              return;
            }

            $scope.map.update();
          }, true);

          $scope.$on('olmap-refresh', function() {
            $scope.map.refresh();
          });
        }
      };
    }]);
