/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.home', [
  'gsApp.editor.map',
  'gsApp.workspaces.maps',
  'gsApp.workspaces.layers',
  'gsApp.workspaces.data',
  'gsApp.workspaces.settings',
  'gsApp.alertpanel',
  'gsApp.import',
  'ngSanitize'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('workspace', {
          url: '/workspace/:workspace',
          templateUrl: '/workspaces/detail/workspace.tpl.html',
          controller: 'WorkspaceHomeCtrl'
        });
    }])
.controller('WorkspaceHomeCtrl', ['$scope','$state', '$stateParams', '$log',
  '$modal', 'GeoServer', 'AppEvent', '$timeout', '$location', '$rootScope',
  '_',
    function($scope, $state, $stateParams, $log, $modal, GeoServer,
      AppEvent, $timeout, $location, $rootScope, _) {

      var wsName = $stateParams.workspace;
      $scope.workspace = wsName;

      var loc = $location.path();

      function isActive(tab) {
        if (loc.indexOf(tab) > -1) {
          return true;
        }
        return false;
      }

      GeoServer.workspace.get(wsName).then(function(result) {
        if (!result.success) {
          $rootScope.alerts = [{
            type: 'danger',
            message: result.data.message + '. Please create it first.',
            fadeout: true
          }];
          $state.go('workspaces.list');
          return;
        }

        $scope.tabs = [
          { heading: 'Maps',
            icon: 'icon-map',
            routeCategory: 'workspace.maps',
            route: 'workspace.maps.main',
            active: isActive('maps')},
          { heading: 'Layers',
            icon: 'icon-stack',
            routeCategory: 'workspace.layers',
            route: 'workspace.layers.main',
            active: isActive('layers')},
          { heading: 'Data',
            icon: 'fa fa-database',
            routeCategory: 'workspace.data',
            route: 'workspace.data.main',
            active: isActive('data')}
        ];

        $scope.go = function(route) {
          $state.go(route, {workspace:wsName});
        };

        $scope.workspaceSettings = function () {
          $modal.open({
            templateUrl: '/components/modalform/workspace/workspace.settings.tpl.html',
            controller: 'WorkspaceSettingsCtrl',
            backdrop: 'static',
            size: 'md',
            resolve: {
              workspace: function() {
                return $scope.workspace;
              }
            }
          });
        }

        // hack to deal with strange issue with tabs being selected
        // when they are destroyed
        // https://github.com/angular-ui/bootstrap/issues/2155
        var destroying = false;
        $scope.$on('$destroy', function() {
          destroying = true;
        });

        $scope.selectTab = function(t) {
          if (!destroying) {
            $scope.go(t.route);
          }
        };

        $scope.workspaceHome = function() {
          $scope.selectTab($scope.tabs[0]);
          $scope.tabs[0].active = true;
        };

        $scope.createMap = function() {
          $scope.selectTab($scope.tabs[0]);
          $scope.tabs[0].active = true;
          $timeout(function() {
            $rootScope.$broadcast(AppEvent.CreateNewMap);
          }, 100);
        };

        $scope.importData = function() {
          $scope.selectTab($scope.tabs[2]);
          $scope.tabs[2].active = true;
          $timeout(function() {
            $modal.open({
              templateUrl: '/components/import/import.tpl.html',
              controller: 'DataImportCtrl',
              backdrop: 'static',
              size: 'lg',
              resolve: {
                workspace: function() {
                  return $scope.workspace;
                },
                mapInfo: function() {
                  return null;
                },
                contextInfo: function() {
                  return null;
                }
              }
            }).result.then(function(param) {
              //TODO: Add store select (implement as state param)
              $state.go('workspace.data.main');
            });
          }, 100);
        };

        $scope.$on('$stateChangeSuccess',
          function(e, to, toParams, from, fromParams) {
            $scope.tabs.forEach(function(tab) {
              if ($state.is(tab.routeCategory)) {
                tab.active = $state.is(tab.routeCategory);
              }
            });
            if (to.name == 'workspace') {
              $state.go($scope.tabs[0].route, toParams);
            }
          });
      });

      $rootScope.$on(AppEvent.WorkspaceTab, function(scope, tabname) {
        if (tabname) {
          var tab = _.find($scope.tabs, function(t) {
            return t.heading.toLowerCase() === tabname.toLowerCase();
          });
          if (tab) {
            $scope.selectTab(tab);
          }
        }
      });

      $rootScope.$on(AppEvent.WorkspaceNameChanged, function(scope, names) {
        if ($scope.workspace == names.original) {
          $scope.workspace = names.new;
          wsName = names.new;
        }
      });

      // if no tab is active go to maps tab
      if (!isActive('maps') && !isActive('layers') && !isActive('data') && !isActive('settings')) {
        $state.go('workspace.maps.main');
      }
    }]);

