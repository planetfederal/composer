/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/*global $:false */
/**
 * Module for backend api service.
 */
angular.module('gsApp.core.backend',['gsApp.config'])
.factory('GeoServer', ['$http', '$resource', '$q', '$log',
  'AppEvent', 'AppConfig', '$rootScope',
    function($http, $resource, $q, $log, AppEvent, AppConfig, $rootScope) {
      var gsRoot = '/geoserver';
      var apiRoot = gsRoot + '/app/api';
      var importRoot = apiRoot + '/imports/';
      var restRoot = gsRoot+ '/rest/';

      /*
       * simple wrapper around $http to set up defer/promise, etc...
       */
      var http = function(config) {
        var d = $q.defer();
        $http(config)
          .success(function(data, status, headers, config) {
            d.resolve({
              success: status >= 200 && status < 300,
              status: status,
              data: data
            });
          })
          .error(function(data, status, headers, config) {
            $rootScope.$broadcast(AppEvent.ServerError,
              {status: status, data: data});
            d.reject({status: status, data: data});
          });
        return d.promise;
      };

      var getRemote = function (url) {
        return $q(function (resolve, reject) {
          var result = {success: false, status: 0, data: {}};
          $.ajax({
            type : "HEAD",
            url : url,
            timeout:3000,
            dataType : "jsonp",
            jsonp : "jsonp",

            success : function (response, message, xhr) {
              result.status = xhr.status;
              result.success = (xhr.status >= 200 && xhr.status < 304)
              result.data.message = message;
              resolve(result);
            },
            error : function (xhr, message, errorThrown) {
              result.status = xhr.status;
              result.success = (xhr.status >= 200 && xhr.status < 304)
              result.data.message = message;
              result.data.trace = errorThrown;
              resolve(result);
            }
          });
        });
      };

      return {
        baseUrl: function() {
          return gsRoot;
        },

        docUrl: function() {
          var url = '/suite-docs/';
          return getRemote(url).then(function (result) {
            if (result.success) {
              result.data.url = url;
              return result;
            } else {
              url = 'http://suite.opengeo.org/docs/'+AppConfig.SuiteVersion+'/';
              return getRemote(url);
            }
          }).then(function (result) {
            if (result.success) {
              result.data.url = url;
              return result;
            } else {
              url = 'http://suite.opengeo.org/docs/latest/';
              return getRemote(url);
            }
          }).then(function (result) {
            if (result.success) {
              result.data.url = url;
            }
            return result;
          });
        },
        serverInfo: {
          get: function() {
            return http({
              method: 'GET',
              url: apiRoot + '/serverInfo'
            });
          },
          renderingTransforms: function() {
            return http({
              method: 'GET',
              url: apiRoot + '/serverInfo/renderingTransforms'
            });
          }
        },
        import: {
          url: function(workspace) {
            return importRoot + workspace;
          },
          urlToStore: function(workspace, store) {
            return importRoot + workspace + '/' + store;
          },
          post: function(workspace, content) {
            return http({
              method: 'POST',
              url: importRoot + workspace,
              data: content
            });
          },
          wsInfo: function(workspace) {
            return http({
              method: 'GET',
              url: importRoot + workspace
            });
          },
          get: function(workspace, id) {
            return http({
              method: 'GET',
              url: importRoot + workspace + '/' + id
            });
          },
          update: function(workspace, id, content) {
            return http({
              method: 'PUT',
              url: importRoot + workspace + '/' + id,
              data: content
            });
          }
        },

        session: function() {
          return http({
            method: 'GET',
            url: apiRoot + '/login',
            headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
          });
        },

        login: function(username, password) {
          return http({
            method: 'POST',
            url: apiRoot + '/login',
            headers : { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: $.param({ username: username, password: password })
          });
        },

        logout: function() {
          return http({
            method: 'GET',
            url: apiRoot + '/logout'
          });
        },

        workspaces: {
          get: function(cacheBool) {
            return http({
              cache: cacheBool,
              method: 'GET',
              url: apiRoot+'/workspaces'
            });
          },

          recent: function() {
            return http({
              method: 'GET',
              url: apiRoot+'/workspaces/recent'
            });
          }
        },

        workspace: {
          get: function(workspace) {
            return http({
              method: 'GET',
              url: apiRoot+'/workspaces/'+workspace
            });
          },
          create: function(content) {
            return http({
              method: 'POST',
              url: apiRoot+'/workspaces',
              data: content
            });
          },
          update: function(workspace, patch) {
            return http({
              method: 'PUT',
              url: apiRoot+'/workspaces/'+workspace,
              data: patch
            });
          },
          delete: function(workspace) {
            return http({
              method: 'DELETE',
              url: apiRoot+'/workspaces/'+workspace
            });
          }
        },

        datastores: {
          get: function(workspace, page, count, sort, filter) {
            if (workspace) {
              if (workspace.name) {
                workspace = workspace.name;
              }
            } else {
              workspace = 'default';
            }
            page = page? page : 0;
            count = count? count : 25;
            sort = sort? '&sort='+sort : '';
            filter = filter? '&filter='+filter.replace(/#/g, '%23') : '';

            return http({
              method: 'GET',
              url: apiRoot+'/stores/'+workspace+'?page='+page+
                '&count='+count + sort + filter
            });
          },
          getDetails: function(workspace, store) {
            return http({
              method: 'GET',
              url: apiRoot+'/stores/'+workspace+'/'+store
            });
          },
          create: function(workspace, format, content) {
            return http({
              method: 'POST',
              url: apiRoot+'/stores/'+workspace+'/'+format,
              data: content
            });
          },
          update: function(workspace, store, patch) {
            return http({
              method: 'PATCH',
              url: apiRoot+'/stores/'+workspace+'/'+store,
              data: patch
            });
          },
          delete: function(workspace, store) {
            return http({
              method: 'DELETE',
              url: apiRoot+'/stores/'+workspace+'/'+store + '?recurse=true'
            });
          },
          getResource: function(workspace, store, resource) {
            return http({
              method: 'GET',
              url: apiRoot+'/stores/'+workspace+'/'+store+'/'+resource
            });
          },
          getAttributes: function(workspace, store, resource, count) {
            count = count ? count : 10;
            return http({
              method: 'GET',
              url: apiRoot+'/stores/'+workspace+'/'+store+'/'+resource+'/attributes?count='+count
            });
          },
        },

        layers: {
          get: function(workspace, page, count, sort, filter) {
            if (workspace) {
              if (workspace.name) {
                workspace = workspace.name;
              }
            } else {
              workspace = 'default';
            }
            page = page? page : 0;
            count = count? count : 25;
            sort = sort? '&sort='+sort : '';
            filter = filter? '&filter='+filter.replace(/#/g, '%23') : '';
            return http({
              method: 'GET',
              url: apiRoot+'/layers/'+workspace+'?page='+page+
                '&count='+count + sort + filter
            });
          },
          getAll: function(workspace) {
            workspace = workspace? workspace : 'default';
            return http({
              method: 'GET',
              url: apiRoot+'/layers/'+workspace
            });
          },
          recent: function() {
            return http({
              method: 'GET',
              url: apiRoot+'/layers/recent'
            });
          },
          thumbnail: {
            get: function(workspace, layer, width, height) {
              var url = apiRoot+'/thumbnails/layers/'+workspace+'/'+layer;
              return url;
            }
          },
        },

        layer: {
          get: function(workspace, layer) {
            return http({
              method: 'GET',
              url: apiRoot+'/layers/'+workspace+'/'+layer
            });
          },
          create: function(workspace, layerInfo) {
            return http({
              method: 'POST',
              url: apiRoot+'/layers/'+workspace,
              data: layerInfo
            });
          },
          update: function(workspace, layer, patch) {
            return http({
              method: 'PATCH',
              url: apiRoot+'/layers/'+workspace+'/'+layer,
              data: patch
            });
          },
          delete: function(workspace, layer) {
            return http({
              method: 'DELETE',
              url: apiRoot+'/layers/'+workspace+'/'+layer
            });
          }
        },

        style: {
          get: function(workspace, layer) {
            return http({
              method: 'GET',
              url: apiRoot+'/layers/'+workspace+'/'+layer+'/style'
            });
          },
          put: function(workspace, layer, content, map) {
            var url = apiRoot+'/layers/'+workspace+'/'+layer+'/style';
            if (map) {
              url += '?map=' + map.name;
            }
            return http({
              method: 'PUT',
              url: url,
              data: content,
              headers: {
                'Content-Type': 'application/vnd.geoserver.ysld+yaml'
              }
            });
          },
          getSLD: function(workspace, style, pretty) {
            var url;
            if (workspace != null) {
              url = restRoot+'workspaces/'+workspace+'/styles/'+style+'.sld';
            } else {
              url = restRoot+'styles/'+style+'.sld';
            }
            if (pretty) {
                url += "?pretty="+pretty;
            }
            return http({
              method: 'GET',
              url: url,
              data: '',
              dataType: 'xml',
              headers: {
                'Content-Type': 'application/xml',
                'Accept': 'application/xml'
              }
            });
          }
        },

        maps: {
          get: function(workspace, page, count, sort, filter) {
            if (workspace) {
              if (workspace.name) {
                workspace = workspace.name;
              }
            } else {
              workspace = 'default';
            }
            page = page? page : 0;
            count = count? count : 25;
            sort = sort? '&sort='+sort : '';
            filter = filter? '&filter='+filter.replace(/#/g, '%23') : '';
            return http({
              method: 'GET',
              url: apiRoot+'/maps/'+workspace+'?page='+page+
                '&count='+count + sort + filter
            });
          },
          getAll: function(workspace) {
            return http({
              method: 'GET',
              url: apiRoot+'/maps/'+workspace
            });
          },
          post: function(workspace, name) {
            return http({
              method: 'GET',
              url: apiRoot+'/maps/'+workspace+'/'+name
            });
          },
          recent: function() {
            return http({
              method: 'GET',
              url: apiRoot+'/maps/recent'
            });
          }
        },

        map: {
          get: function(workspace, name) {
            return http({
              method: 'GET',
              url: apiRoot+'/maps/'+workspace+'/'+name
            });
          },

          // requires at least one layer
          create: function(workspace, mapData) {
            return http({
              method: 'POST',
              url: apiRoot+'/maps/'+workspace,
              data: mapData
            });
          },

          update: function(workspace, name, patch) {
            return http({
              method: 'PATCH',
              url: apiRoot+'/maps/'+workspace+'/'+name,
              data: patch
            });
          },

          delete: function(workspace, name) {
            return http({
              method: 'DELETE',
              url: apiRoot+'/maps/'+workspace+'/'+name,
            });
          },

          // calculate bounds
          bounds: function(workspace, name, proj) {
            return http({
              method: 'PUT',
              url: apiRoot+'/maps/'+workspace+'/'+name+'/bounds',
              data: proj
            });
          },

          // map.thumbnail
          thumbnail: {
            get: function(workspace, map, width, height) {
              var url = apiRoot+'/thumbnails/maps/'+workspace+'/'+map;
              return url;
            }
          },

          // map.openlayers
          // return an openlayers map URL via wms reflector
          openlayers: {
            get: function(workspace, layergroup, width, height) {
              var url = gsRoot + '/' + workspace +
               '/wms/reflect?layers=' + layergroup + '&width=' + width +
               '&height=' + height + '&format=application/openlayers';
              return url;
            }
          },

          /* map.layers - For modifying layers in a specific map */
          layers: {
            get: function(workspace, map, layer) {
              return http({
                method: 'GET',
                url: apiRoot+'/maps/'+workspace+'/'+map+'/layers'
              });
            },

            add: function(workspace, map, layerData) { // adds to top
              return http({
                method: 'POST',
                url: apiRoot+'/maps/'+workspace+'/'+map+'/layers',
                data: layerData
              });
            },

            delete: function(workspace, map, layerName) {
              return http({
                method: 'DELETE',
                url: apiRoot+'/maps/'+workspace+'/'+map+'/layers/'+layerName
              });
            },

            put: function(workspace, map, layers) {
              return http({
                method: 'PUT',
                url: apiRoot+'/maps/'+workspace+'/'+map+'/layers',
                data: JSON.stringify(layers)
              });
            }
          },
        },

        icons: {
          get: function(workspace) {
            return http({
              method: 'GET',
              url: apiRoot+'/icons/list/'+workspace
            });
          }
        },
        
        icon: {
          get: function(workspace, name) {
            return http({
              method: 'GET',
              url: apiRoot+'/icons/'+workspace+'/'+name
            });
          },
          url: function(workspace) {
            return apiRoot+'/icons/'+workspace;
          }
        },

        proj: {
          recent: function() {
            return http({
              method: 'GET',
              url: apiRoot+'/projections/recent'
            });
          },

          get: function(srs) {
            return http({
              method: 'GET',
              url: apiRoot+'/projections/' + srs
            });
          }
        },

        formats: {
          get: function() {
            return http({
              method: 'GET',
              url: apiRoot + '/formats/'
            });
          },
          getFormat: function(format) {
            return http({
              method: 'GET',
              url: apiRoot+'/formats/'+format
            });
          },
        },

        format: {
          get: function(name) {
            return http({
              method: 'GET',
              url: apiRoot + '/formats/' + name
            });
          }
        },

        gridsets: {
          getAll: function() {
            return http({
              method: 'GET',
              url: apiRoot+'/gwc/gridsets'
            });
          },
        }
      };
    }]);
