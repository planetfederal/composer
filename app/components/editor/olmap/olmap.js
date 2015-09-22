/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 * License: BSD
 *
 * olmap.js, olmap.less, olmap.tpl.html
 *
 * Composer map viewer. Includes an OL3 Map view with dynamic response to map, layer, and style changes
 */
angular.module('gsApp.editor.olmap', [])
.factory('MapFactory',
    ['$log', '$rootScope', '$timeout', 'AppEvent', 'GeoServer',
    function($log, $rootScope, $timeout, AppEvent, GeoServer) {
      function OLMap(mapOpts, element, options) {
        var self = this;
        this.mapOpts = mapOpts;
        // for ol3 request timeout
        var renderTimeout = mapOpts.renderTimeout || 3000;
        // for GeoServer request timeout (partial)
        self.timeout = mapOpts.timeout || 120;
        var progress = mapOpts.progress || function() {};
        var error = mapOpts.error || function() {};
        var xhr, timer;

        var layerNames  = this.visibleLayerNames().reverse().join(',');

        var mapLayer = new ol.layer.Image({
          source: new ol.source.ImageWMS({
            url: GeoServer.baseUrl()+'/'+mapOpts.workspace+'/wms',
            params: {'LAYERS': layerNames, 'VERSION': '1.1.1',
                'EXCEPTIONS': 'application/vnd.gs.wms_partial',
                'FORMAT': 'image/png'
            },
            serverType: 'geoserver',
            imageLoadFunction: function(image, src) {
              //FIXME Instead of this src hack, set FORMAT_OPTIONS:timeout in
              // PARAMS when we upgrade to Openlayers >= 3.5.0
              if (src.indexOf('FORMAT_OPTIONS=') > 0) {
                src = src.replace('FORMAT_OPTIONS=', 'FORMAT_OPTIONS=timeout:' +
                    (self.timeout * 1000) + ';');
              } else {
                src += '&FORMAT_OPTIONS=timeout:' + (self.timeout * 1000);
              }
              progress('start');
              var img = image.getImage();
              var loaded = false;
              if (timer) {
                window.clearTimeout(timer);
              }
              timer = window.setTimeout(function() {
                if (!loaded) {
                  error('Delays are occuring in rendering the map.\n\n'+
                    'RECOMMENDATIONS:\n\n- Zoom in\n\n- If there are multiple '+
                    'layers, turn off (uncheck) some layers '+
                    'to see the map.\n\n- Create a style that limits features '+
                    'displayed at this zoom level/resolution.\n\n' +
                    '- If the map still never renders, its projection or '+
                    'extent may be incorrect.\n\n' +
                    'The Composer map rendering timeout for GeoServer can be '+
                    'set in Map Settings (gear icon, upper right).');
                }
              }, renderTimeout);
              if (typeof window.btoa == 'function') {
                if (xhr) {
                  xhr.abort();
                }
                xhr = new XMLHttpRequest();
                xhr.open('GET', src, true);
                xhr.responseType = 'arraybuffer';
                xhr.onload = function(e) {
                  loaded = true;
                  if (this.status == 200) {
                    var uInt8Array = new Uint8Array(this.response);
                    var i = uInt8Array.length;
                    var binaryString = new Array(i);
                    while (i--) {
                      binaryString[i] = String.fromCharCode(uInt8Array[i]);
                    }
                    var data = binaryString.join('');
                    var type = xhr.getResponseHeader('content-type');
                    if (type.indexOf('image') === 0) {
                      //Image or partial image
                      img.src = 'data:' + type + ';base64,' +
                          window.btoa(data);
                    } else {
                      //XML exception; parse out text data
                      var xml = $.parseXML(data);
                      var err = {exceptions:[]};

                      var parseXMLErr = function(element) {
                        for (var i = 0; i < element.childNodes.length; i++) {
                          var child = element.childNodes[i];
                          if (child.nodeName == "#text") {
                            if (child.data.trim() != "") {
                              err.exceptions.push({text:child.data});
                            }
                          } else {
                            parseXMLErr(child);
                          }
                        }
                      };
                      parseXMLErr(xml);
                      error(err);
                    }
                  } else {
                    error(this.statusText);
                  }
                  progress('end');
                };
                xhr.send();
              } else {
                img.onload = function() {
                  loaded = true;
                  progress('end');
                };
                img.onerror = function() {
                  loaded = true;
                  progress('end');
                  error();
                };
                img.src = src;
              }
            }
          })
        });

        // determine projection from first layer
        var p = mapOpts.proj, prjExt = mapOpts.projectionExtent;
        var proj;
        try {
          proj4.defs(p.srs, p.wkt);
          proj = ol.proj.get(p.srs);
          if (!proj.getExtent() && prjExt) {
            proj.setExtent([prjExt.west, prjExt.south, prjExt.east,
              prjExt.north]);
          }
        } catch(e) {
          $rootScope.alerts = [{
            type: 'danger',
            message: 'Error rendering map with projection: ' + e,
            details: e.message,
            fadeout: true
          }];
        }

        // initial extent
        var bbox = mapOpts.bbox;
        var extent = [bbox.west,bbox.south,bbox.east,bbox.north];

        // scale control
        var scaleControl = $('<div>')
          .addClass('ol-scale ol-control ol-unselectable')
          .prop('title', 'Copy scale denominator')
          [0];
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
          .addClass('ol-bounds ol-unselectable ol-control')
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

        var ZoomLevelControl = function() {
          ol.control.Control.call(this, {
            element: $('<div>')
              .addClass('ol-zoomlevel ol-unselectable ol-control')
              .prop('title', 'Current zoom level')
              [0]
          });
        };
        ol.inherits(ZoomLevelControl, ol.control.Control);
        ZoomLevelControl.prototype.setMap = function(map) {
          map.on('postrender', function() {
            $(this.element).html('Z' + map.getView().getZoom());
          }, this);
          ol.control.Control.prototype.setMap.call(this, map);
        };

        // Mouse lonlat control
        var mousePositionControl = $('<div>')
          .addClass('ol-mouse-position ol-control ol-unselectable')
          .prop('title', 'Current lonlat of mouse')[0];

        ol.control.Control.call(this, {
          element: mousePositionControl
        });
        ol.inherits(mousePositionControl, ol.control.MousePosition);

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
            new ol.control.Control({element: boundsControl}),
            new ZoomLevelControl(),
            new ol.control.MousePosition({
              className: 'ol-mouse-position ol-control ol-unselectable',
              projection: proj,
              coordinateFormat: ol.coordinate.createStringXY(6)
            })
          ])
        }, options || {}));

        map.getView().on('change:resolution', function(evt) {
          var res = evt.target.getResolution();
          var units = map.getView().getProjection().getUnits();
          var dpi = 25.4 / 0.28;
          var mpu = ol.proj.METERS_PER_UNIT[units];
          var scale = Math.round(res * mpu * 39.37 * dpi);
          scaleControl.innerHTML =  '1 : ' + scale;
        });

        map.getView().fit(extent, map.getSize());
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

        $rootScope.$on(AppEvent.ToggleFullscreen, function() {
          if (mapsizeTimer === null) {
            mapsizeTimer = $timeout(function() {
              self.olMap.updateSize();
              mapsizeTimer = null;
            }, 50);
          }
        });

        if (typeof(Storage) !== "undefined") {
          var savedExtent = null;

          //map
          if (mapOpts.name) {
            savedExtent = JSON.parse("[" + localStorage.getItem("bounds.maps."
              +mapOpts.workspace+"."+mapOpts.name) + "]");
          //layer
          } else {
            savedExtent = JSON.parse("[" + localStorage.getItem("bounds.layers."
              +mapOpts.workspace+"."+mapOpts.layers[0].name) + "]");
          }
          if (savedExtent && !isNaN(savedExtent[0]) && !isNaN(savedExtent[1]) &&
                  !isNaN(savedExtent[2]) && !isNaN(savedExtent[3])) {
            map.getView().fit(savedExtent, map.getSize());
          }
          //Fix for SUITE-1031 - wait until the map loads before registering this listener
          $timeout(function() {
            map.on('moveend', function(evt) {
              var map = evt.map;
              var extent = map.getView().calculateExtent(map.getSize());
              if (mapOpts.name) {
                localStorage.setItem("bounds.maps."+mapOpts.workspace+"."+mapOpts.name, extent);
              } else {
                localStorage.setItem("bounds.layers."+mapOpts.workspace+"."+mapOpts.layers[0].name, extent);
              }
            }
          )}, 100);
        }

        if (mapOpts.featureInfo) {
          map.on('singleclick', function(evt) {
            if (mapOpts.activeLayer) {
              var view = map.getView();
              var gfi = mapLayer.getSource().getGetFeatureInfoUrl(
                  evt.coordinate,
                  view.getResolution(), view.getProjection(),
                  {'INFO_FORMAT': 'application/json', 'FEATURE_COUNT': 50,
                      'QUERY_LAYERS': mapOpts.activeLayer.name});
              $.ajax(gfi).then(function(response) {
                if (response && response.features && response.features.length) {
                  mapOpts.featureInfo(response.features);
                }
              });
            }
          });
        }
      }

      OLMap.prototype.getNumLayers = function() {
        return this.mapOpts.layers.length;
      };

      OLMap.prototype.visibleLayerNames = function() {
        return this.mapOpts.layers.filter(function(l) {
          return l.visible == true;
        }).map(function(l) {
          return l.name;
        });
      };

      OLMap.prototype.update = function() {
        var visibleLayerNames = this.visibleLayerNames();
        var layerNames = visibleLayerNames.reverse().join(',');
        var numMapLayers = this.olMap.getLayers().getLength();
        var layer;
        if (numMapLayers > 1) { // basemap exists at 0
          layer = this.olMap.getLayers().item(1);
        } else {
          layer = this.olMap.getLayers().item(0);
        }
        var visible = visibleLayerNames.length > 0;
        layer.setVisible(visible);
        if (visible) {
          layer.getSource().updateParams({ LAYERS: layerNames });
        }
      };
      OLMap.prototype.updateTimeout = function(val) {
        this.timeout = val;
      };
      OLMap.prototype.hideBasemap = function() {
        // if null, remove any existing basemap
        if (this.mapOpts.basemap == null) {
          var mapLayers = this.olMap.getLayers();
          if (mapLayers.getLength() > 1) {
            mapLayers.removeAt(0);
          }
        }
      };

      OLMap.prototype.addBasemap = function() {
        var basemap = this.mapOpts.basemap;
        var bLayer;
        var mapLayers = this.olMap.getLayers();

        try {
          if (basemap.type == 'tilewms') {
            if (!basemap.url && !basemap.layer) {
              throw new Error('URL and Layer required.' +
                ' Please enter them.');
            }
            if (!basemap.serverType) {
              throw new Error('ServerType is required. Please enter one.');
            }
            // TiledwMS or ImageWMS?
            if (basemap.tiledwms) {
              bLayer = new ol.layer.Tile({group: 'background'});
              bLayer.setSource(new ol.source.TileWMS({
                url: basemap.url,
                serverType: basemap.serverType,
                params: {
                  'LAYERS': basemap.layer,
                  'VERSION': basemap.version,
                  'TILED': basemap.tiled,
                  'FORMAT': basemap.format
                },
                crossOrigin: 'anonymous'
              }));
            } else { //imageWMS
              bLayer = new ol.layer.Image({group: 'background'});
              bLayer.setSource(new ol.source.ImageWMS({
                url: basemap.url,
                serverType: basemap.serverType,
                params: {
                  'LAYERS': basemap.layer,
                  'VERSION': basemap.version,
                  'FORMAT': basemap.format,
                },
                crossOrigin: 'anonymous'
              }));
            }

          } else if (basemap.type == 'osm') {
            bLayer = new ol.layer.Tile({group: 'background'});
            bLayer.setSource(new ol.source.OSM({
              'projection': 'EPSG:3857',
              crossOrigin: 'anonymous'
            }));

          } else if (basemap.type == 'stamen') {
            bLayer = new ol.layer.Tile({group: 'background'});
            bLayer.setSource(new ol.source.Stamen({
              'projection': 'EPSG:3857',
              crossOrigin: 'anonymous',
              layer: 'toner-lite'
            }));

          } else if (basemap.type == 'mapbox') {
            if (!basemap.key && !basemap.mapid) {
              throw new Error('Map ID and Access Token required.' +
                ' Please enter them.');
            }
            bLayer = new ol.layer.Tile({group: 'background'});
            bLayer.setSource(new ol.source.XYZ({
              'projection': 'EPSG:3857',
              url: basemap.url,
              crossOrigin: 'anonymous'
            }));

          } else if (basemap.type == 'bing') {
            if (!basemap.key) {
              throw new Error('Bing Maps requires an API key.' +
                ' Please enter one.');
            }
            bLayer = new ol.layer.Tile({
              group: 'background',
            });
            bLayer.setSource(new ol.source.BingMaps({
              key: basemap.key,
              'projection': 'EPSG:3857',
              imagerySet: basemap.style,
              crossOrigin: 'anonymous'
            }));

          } else if (basemap.type == 'esri') {
            if (!basemap.url) {
              throw new Error('URL required. Please enter one.');
            }
            bLayer = new ol.layer.Tile({group: 'background'});
            bLayer.setSource(new ol.source.XYZ({
              url: basemap.url,
              crossOrigin: 'anonymous'
            }));

          }
        } catch(e) {
          var error = e;
          if (!error) {
            error = new Error('Error loading basemap.');
          }
          $rootScope.alerts = [{
            type: 'danger',
            message: error.message,
            fadeout: true
          }];
          return;
        }

        if (bLayer) {
          // if creating a layer successful then remove
          // any current basemap then add requested one
          if (mapLayers.getLength() > 1) {
            mapLayers.removeAt(0);
          }
          mapLayers.insertAt(0, bLayer);
        } else {
          $rootScope.alerts = [{
            type: 'danger',
            message: 'Basemap not loaded',
            fadeout: true
          }];
        }
      };

      OLMap.prototype.refresh = function() {
        this.olMap.getLayers().getArray().forEach(
          function(l) {
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
.directive('olMap', ['$log', '$timeout', '$window', 'AppEvent', 'GeoServer', 'MapFactory',
    function($log, $timeout, $window, AppEvent, GeoServer, MapFactory) {
      return {
        restrict: 'EA',
        templateUrl: '/components/editor/olmap/olmap.tpl.html',
        controller: function($scope, $element) {

          /** Editor scope variables **/
          /* The $scope of the editor pages is shared between editor.map / editor.layer, 
           * olmap, layerlist, and styleeditor. As such, care must be taken when adding
           * or modifying these scope variables.
           * The following scope variables are used among these modules:
           */

          /* Initialized in editor.layer.js or editor.map.js
          $scope.olMapOpts    //OL Map parameters, used by olmap.js to construct $scope.olMap
          $scope.map          //map object obtained from GeoServer. null for editor.layer.js
          $scope.map.layers   //list of layers for the map object
          $scope.layer        //layer object obtained from geoserver. Represents the current layer for editor.map.js
          $scope.workspace    //name of the current workspace
          $scope.isRendering  //boolean indicating if the map is currently rendering. Used to show the "Rendering map" spinner
          $scope.ysldstyle    //text content of the current style. Used by styleeditor.js when constructing $scope.editor
          */

          /* Initialized in olmap.js
          $scope.olMap      //OL3 Map object. Generated from $scope.olMapOpts
          $scope.hideCtrl   //List of map controls to hide. Set by tools/display.js and used by editor.*.tpl.html
          */

          /* Initialized in styleeditor.js
          $scope.editor           //Codemirror editor object
          $scope.generation       //editor generation; used to handle undo
          $scope.markers          //List of errors, displayed as line markers in the editor
          $scope.popoverElement   //Popover element for error markers
          */

          /* Initialized in layerlist.js
          $scope.showLayerList  //boolean indicating wheter to display the layer list
          */
          $scope.olMap = null;
          $scope.hideCtrl = {
            'all': false,
            'lonlat': false
          };

          var timer = null;

          $scope.$watch('mapOpts.layers', function(newVal, oldVal) {
            if (newVal == null) {
              return;
            } if (!$scope.olMap) {
              $scope.olMap = MapFactory.createMap($scope.mapOpts, $element);
            } else {
              if (timer) {
                $timeout.cancel(timer);
              }
              timer = $timeout(function() {
                $scope.olMap.update();
                timer = null;
              }, 750);
            }
          }, true);

          $scope.$watch('mapOpts.bounds', function(newVal, oldVal) {
            if (newVal && newVal !== oldVal) {
              var map = $scope.olMap.olMap;
              var bounds = newVal.bbox.lonlat;
              var extent = ol.proj.transformExtent(
                  [bounds.west, bounds.south, bounds.east, bounds.north],
                  'EPSG:4326', map.getView().getProjection());
              if (!isNaN(extent[0]) && !isNaN(extent[1]) &&
                  !isNaN(extent[2]) && !isNaN(extent[3])) {
                map.getView().fit(extent, map.getSize());
              }
            }
          });

          $scope.$watch('mapOpts.timeout', function(newVal, oldVal) {
            if (newVal && newVal !== oldVal) {
              $scope.olMap.updateTimeout(newVal);
            }
          });

          $scope.$watch('mapOpts.basemap', function(newVal) {
            if (!$scope.olMap) {
              return;
            }
            if (newVal == null) {
              $scope.olMap.hideBasemap();
              return;
            }
            if (timer) {
              $timeout.cancel(timer);
            }
            timer = $timeout(function() {
              $scope.olMap.addBasemap();
              timer = null;
            }, 500);
          }, true);

          $scope.$watch('mapOpts.proj', function(newVal, oldVal) {
            if (newVal && oldVal && newVal != oldVal) {
              
              //Reset any stored extent
              if (typeof(Storage) !== "undefined") {
                if ($scope.mapOpts.name) {
                  localStorage.setItem("bounds.maps."+$scope.mapOpts.workspace+"."+$scope.mapOpts.name, null);
                } else {
                  localStorage.setItem("bounds.layers."+$scope.mapOpts.workspace+"."+$scope.mapOpts.layers[0].name, null);
                }
              }
              //Need to re-create the map if the projection changes
              //Delete the current map element, else new one will be appended offscreen
              $scope.olMap.olMap.getViewport().remove();
              $scope.olMap = MapFactory.createMap($scope.mapOpts, $element);
              $scope.olMap.refresh();
            }
          });

          $scope.$watch('basemap', function(newVal) {
            if (newVal != null && $scope.mapOpts) {
              $scope.mapOpts.basemap = newVal;
            } else if (newVal == null && $scope.mapOpts) {
              $scope.mapOpts.basemap = null;
            }
          });



          $scope.$on(AppEvent.MapControls, function(scope, ctrl) {
            var val = $scope.hideCtrl[ctrl];
            if (ctrl &&  val !== undefined) {
              $scope.hideCtrl[ctrl] = !val;
            }
          });

          $scope.$on(AppEvent.EditorBackground, function(scope, color) {
            $scope.mapBackground = {'background': color};
          });

          $scope.refreshMap = function() {
            $scope.olMap.refresh();
          }
        }
      };
    }]);
