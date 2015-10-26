/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp', [
  'ngResource',
  'ngSanitize',
  'ngAnimate',
  'ngClipboard',
  'ngLodash',
  'ui.router',
  'ui.bootstrap',
  'gsApp.core',
  'gsApp.topnav',
  'gsApp.sidenav',
  'gsApp.login',
  'gsApp.login.modal',
  'gsApp.home',
  'gsApp.layers',
  'gsApp.workspaces',
  'gsApp.maps'
])
.controller('AppCtrl', ['$scope', '$rootScope', '$state', 'AppEvent', 'AppSession', '$window', '$modal', '$modalStack', '$timeout', 'GeoServer',
    function($scope, $rootScope, $state, AppEvent, AppSession, $window, $modal, $modalStack, $timeout, GeoServer) {
      $scope.session = AppSession;
	  $scope.init = true;

      var timeout = null;
      var timeoutWarning = 15;
      //Show a login modal counting down from countdown. No countdown if countdown = 0.
      var loginModal = function(countdown) {
        //If a modal is not already open, we are not currently changing states, and we are not on the login page
        if (!($scope.modal || $scope.stateChange) && ($state.current.url.indexOf('/login') == -1)) {
          $scope.modal = true;
          var modalInstance = $modal.open({
            templateUrl: '/core/login/login.modal.tpl.html',
            controller: 'LoginModalCtrl',
            scope: $scope,
            size: 'md',
            resolve: {
              countdown: function () {
                return countdown;
              },
            }
          });
        }
      }
      //handle fullscreen mode
      $scope.$on(AppEvent.ToggleFullscreen, function(e) {
        $scope.fullscreen = !$scope.fullscreen;
      });

      // On an unauthorized event show a login modal
      $scope.$on(AppEvent.Unauthorized, function(e) {
        loginModal(0);
      });
      $scope.$on(AppEvent.Login, function(e, login) {
        // update global session state
        AppSession.update(login.session, login.user);
        $timeout.cancel(timeout);
        timeout = $timeout(function() {loginModal(timeoutWarning)}, (login.timeout - timeoutWarning)*1000);

      });
      $scope.$on(AppEvent.Logout, function(e) {
        AppSession.clear();
        $timeout.cancel(timeout);
        $state.go('login');
      });

      // track app state changes
      $rootScope.state = {};
      $rootScope.title = "Composer";
      $rootScope.$on('$stateChangeSuccess',
          function(e, to, toParams, from, fromParams) {
              //Whenever we change states, pre-emptively check if we are logged in. If not, go to the login page.
              $scope.stateChange = true;
              //If this is not a login redirect, save curr/prev states
              if (to.url && to.url.indexOf('/login') == -1) {
                $rootScope.state.curr = {name: to, params: toParams};
                $rootScope.state.prev = {name: from, params: fromParams};
              }
              //Update page title
              if (to.url) {
                var title = "Composer";
                switch(to.url) {
                    case '/':
                      if (toParams.workspace) {
                        title += ' | ' + toParams.workspace;
                      }
                      break;
                    case '/editlayer/:workspace/:name':
                    case '/editmap/:workspace/:name':
                      title += ' | Editing: ' + toParams.workspace + ":" + toParams.name;
                      break;
                    case '/layers':
                      title += ' | All Layers';
                      break;
                    case '/list':
                      title += ' | All Workspaces';
                      break;
                    case '/maps':
                      title += ' | All Maps';
                      break;
                  }
                  $rootScope.title = title;
              }

              var slowConnection = $timeout(function() {
                $rootScope.alerts = [{
                  type: 'warning',
                  message: 'Experiencing connection delays. Please verify GeoServer is running.',
                  fadeout: true
                }];
              }, 10000);
              GeoServer.session().then(function(result) {
                $timeout.cancel(slowConnection);
                //if status is 0, request cancelled - check server connectivity
                if (!result.success && result.status == 0) {
                  $rootScope.alerts = [{
                    type: 'danger',
                    message: 'Could not connect to the server',
                    fadeout: true
                  }];
                }

                //If we are in a series of modal windows, don't redirect
                if ($modalStack.getTop()) {
                  $scope.stateChange = false;
                  return result;
                }
                if (result.success) {
                  //not logged in, not on the login page, not in a modal window - redirect to login
                  if (!result.data.user && to.url && to.url.indexOf('/login') == -1) {
                    $state.go('login').then(function() {$scope.stateChange = false;});
                  } else {
                    //Update timout
                    $timeout.cancel(timeout);
                    timeout = $timeout(function() {loginModal(timeoutWarning)}, (result.data.timeout - timeoutWarning)*1000);
                    $scope.stateChange = false;
                  }
                } else {
                  //not authorized
                  AppSession.clear();
                  $state.go('login').then(function() {$scope.stateChange = false;});
                }
                return result;
              });
            });
    }])
.factory('_', ['lodash',
    function(lodash) {
      return lodash;
    }])
.run(['$rootScope', 'GeoServer', 'AppSession', '$timeout',
    function($rootScope, GeoServer, AppSession, $timeout) {
      GeoServer.session().then(function(result) {
        if (result.success) {
          AppSession.update(result.data.id, result.data.user);
        }
        else {
          AppSession.clear();
        }
      });
    }])
.constant('baseUrl', 'http://localhost:8000');
