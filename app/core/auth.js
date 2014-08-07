/**
 * Module for app authentication.
 */
angular.module('gsApp.core.auth', [])
.factory('AppSession',
    function() {
      var Session = function() {
      };

      Session.prototype.update = function(id, user) {
        this.active = true;
        this.id = id;
        this.user = user;
      };

      Session.prototype.clear = function() {
        this.active = false;
        this.id = null;
        this.user = null;
      };

      var session = new Session();
      session.clear();
      return session;
    })
.config(
    function($httpProvider) {
      $httpProvider.interceptors.push([
        '$injector', function($injector) {
          return $injector.get('GeoServerAuth');
        }
      ]);
    })
.factory('GeoServerAuth', ['$rootScope', '$q', 'AppEvent', '$log',
    function($rootScope, $q, AppEvent, $log) {
      return {
        request: function(config) {
          return config;
        },

        responseError: function(response) {
          if (response.status == 401) {
            // don't broadcast if already trying to login 
            if (response.config.url.indexOf('/login') == -1) {
              $rootScope.$broadcast(AppEvent.Unauthorized);
            }
          }
          return response;
        }
      };
    }]);