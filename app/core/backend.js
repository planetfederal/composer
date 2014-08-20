/*global $:false */
/**
 * Module for backend api service.
 */
angular.module('gsApp.core.backend',[])
.factory('GeoServer', ['$http', '$resource', '$q', '$log',
    function($http, $resource, $q, $log) {
      var gsRoot = '/geoserver';
      var apiRoot = gsRoot + '/app/backend';

      return {
        baseUrl: function() {
          return gsRoot;
        },

        session: function() {
          var d = $q.defer();
          $http({
            method: 'GET',
            url: apiRoot + '/login',
            headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
          }).success(function(data, status, headers, config) {
            d.resolve({
              success: status == 200,
              status: status,
              data: data
            });
          }).error(function(data, status, headers, config) {
            d.reject();
          });

          return d.promise;
        },

        login: function(username, password) {
          var d = $q.defer();

          $http({
            method: 'POST',
            url: apiRoot + '/login',
            headers : { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: $.param({ username: username, password: password })
          }).success(function(data, status, headers, config) {
            d.resolve({
              success: status == 200,
              status: status,
              data: data
            });
          }).error(function(data, status, headers, config) {
            d.reject({
              status: status,
              data: data
            });
          });

          return d.promise;
        },

        logout: function() {
          var d = $q.defer();
          $http({
            method: 'GET',
            url: apiRoot + '/logout'
          }).success(function(data, status, headers, config) {
            d.resolve();
          }).error(function(data, status, headers, config) {
            d.reject();
          });

          return d.promise;
        },

        serverInfo: $resource(apiRoot+'/serverInfo', {}, {
          get: {
            method: 'GET',
            responseType: 'json'
          }
        }),

        workspaces: $resource(apiRoot+'/workspaces', {}, {
          get: {
            method: 'GET',
            responseType: 'json',
            isArray: true
          }
        }),

        layers: $resource(apiRoot+'/layers/:workspace', {workspace:'default'}, {
          get: {
            method: 'GET',
            responseType: 'json',
            isArray: true
          }
        }),

        layer: $resource(apiRoot+'/layers/:workspace/:name', {}, {
          get: {
            method: 'GET',
            responseType: 'json'
          }
        }),

        style: {
          get: function(workspace, layer) {
            var d = $q.defer();
            $http({
              method: 'GET',
              url: apiRoot+'/layers/'+workspace+'/'+layer+'/style'
            }).success(function(data, status, headers, config) {
              d.resolve({
                success: status == 200,
                status: status,
                data: data
              });
            }).error(function(data, status, headers, config) {
              d.reject({
                status: status,
                data: data
              });
            });
            return d.promise;
          },
          put: function(workspace, layer, content) {
            var d = $q.defer();
            $http({
              method: 'PUT',
              url: apiRoot+'/layers/'+workspace+'/'+layer+'/style',
              data: content,
              headers: {
                'Content-Type': 'application/vnd.geoserver.ysld+yaml'
              }
            }).success(function(data, status, headers, config) {
              d.resolve({
                success: status == 200,
                status: status,
                data: data
              });
            }).error(function(data, status, headers, config) {
              d.reject({
                status: status,
                data: data
              });
            });
            return d.promise;
          }
        },

        maps: $resource(apiRoot+'/maps/:workspace', {workspace:'default'}, {
          get: {
            method: 'GET',
            responseType: 'json',
            isArray: true
          }
        })
      };
    }]);
