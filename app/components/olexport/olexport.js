/*global mapcfg */
angular.module('gsApp.olexport', [])
.service('OlExport',
  function($window, $http, $templateCache, GeoServer) {


    /**
     * Wraps javascript in ol3 html template
     * @param {String} js A javascript string
     * @return {String} Html with embedded javascript
     */
    this.wrapHtml = function(js) {
      return $http.get('/components/olexport/ol.tpl.html', {
        cache:$templateCache
      })
        .then(function(res) {
          var html = res.data.replace(/\{\{js\}\}/, js);
          return html;
        });
    };


    /**
     * Given a map object outputs the js for an ol3 map
     * @param {Object} map A geoserver map object
     * @return {String} Generated js code.
     */
    this.fromMapObj = function(mapObj) {
      var workspace = mapObj.workspace,
          layer = mapObj.name,
          bbox = mapObj.bbox,
          extent = [bbox.west,bbox.south,bbox.east,bbox.north],
          proj = mapObj.proj;

      var location = $window.location;
      var baseUrl = location.protocol + '//' +
        location.host + GeoServer.baseUrl();

      var cfg = {
        target: 'map',
        view: {
          center: bbox.center,
          zoom: 1
        },
        layers: [
          {
            type: 'Tile',
            opts: {
              source: {
                type: 'TileWMS',
                opts: {
                  url: baseUrl + '/' + workspace + '/wms',
                  serverType: 'geoserver',
                  params: {
                    'LAYERS': layer,
                    'TILED': true
                  }
                }
              }
            }
          }
        ]
      };

      if (proj && proj.srs) {
        cfg.view.projection = {
          srs: proj.srs,
          def: proj.wkt.replace(/[\r\n]/g, '')
        };

        if (mapObj.projectionExtent) {
          cfg.view.projection.extent = [
            mapObj.projectionExtent.west,
            mapObj.projectionExtent.south,
            mapObj.projectionExtent.east,
            mapObj.projectionExtent.north
          ];
        }
      }

      var js = mapcfg(cfg);

      //TODO: Move to mapcfg lib?
      if (extent) {
        js += '\nvar extent = ol.proj.transformExtent(' +
                  '[' + extent.join(',') + '],' +
                  '"EPSG:4326", map.getView().getProjection());\n';
        js += '\nmap.getView().fitExtent(extent, map.getSize());\n';
      }

      return js;
    };

  });
