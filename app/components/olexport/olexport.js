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

      //TODO: Add support for proj4js projections.
      if (proj && (proj.srs !== 'EPSG:4326' && proj.srs !== 'EPSG:3857')) {
        throw new Error('Unsupported projection: ' + proj.srs);
      }

      var cfg = mapcfg({
        target: 'map',
        view: {
          center: bbox.center,
          zoom: 1,
          projection: proj.srs
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
      });

      //TODO: Move to mapcfg lib?
      if (extent) {
        cfg += '\nmap.getView().fitExtent([' +
          extent.join(',') +
          '], map.getSize());\n';
      }

      return cfg;
    };

  });