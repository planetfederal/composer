/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.layers.style', [
  'ui.codemirror',
  'gsApp.olmap',
  'gsApp.styleditor',
  'gsApp.featureinfopanel',
  'gsApp.alertpanel'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('layer.style', {
        url: '/style',
        templateUrl: '/layers/detail/style.tpl.html',
        controller: 'LayerStyleCtrl'
      });
    }])
.controller('LayerStyleCtrl', ['$scope', '$rootScope', '$stateParams',
    'GeoServer', 'AppEvent', '$log', '$modal', '$state',
    function($scope, $rootScope, $stateParams, GeoServer, AppEvent, $log,
      $modal, $state) {

      var wsName = $stateParams.workspace;
      $scope.workspace = wsName;
      var layerName = $stateParams.name;

      $rootScope.$broadcast(AppEvent.ToggleSidenav);
      GeoServer.layer.get(wsName, layerName).then(function(result) {
        if (result.success == true) {
          $scope.layer = result.data;

          $scope.mapOpts = {
            workspace: wsName,
            layers: [{name: $scope.layer.name, visible: true}],
            proj: $scope.layer.proj,
            bbox: $scope.layer.bbox.native,
            center: $scope.layer.bbox.native.center,
            error: function(err) {
              $scope.$apply(function() {
                $rootScope.alerts = [{
                  type: 'warning',
                  message: 'Map rendering may take a while...',
                  details: err.exceptions ? err.exceptions[0].text : err,
                  fadeout: true
                }];
              });
            },
            progress: function(state) {
              if (state == 'start') {
                $scope.isRendering = true;
              }
              if (state == 'end') {
                $scope.isRendering = false;
              }
              $scope.$apply();
            },
            activeLayer: $scope.layer,
            featureInfo: function(features) {
              $scope.$broadcast('featureinfo', features);
            }
          };

          GeoServer.style.get(wsName, layerName).then(function(result) {
            if (result.success == true) {
              $scope.style = result.data;
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Could not retrieve style for layer: ' + layerName
              }];
            }
          });

        } else {
          $rootScope.alerts = [{
            type: 'danger',
            message: 'Could not retrieve layer info for : ' + layerName
          }];
        }
      });

      $scope.viewWorkspace = function(workspace) {
        $state.go('workspace', {workspace: workspace});
      };

      $scope.editLayerSettings = function(layer) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/layer.settings.tpl.html',
          controller: 'EditLayerSettingsCtrl',
          backdrop: 'static',
          size: 'md',
          resolve: {
            workspace: function() {
              return layer.workspace;
            },
            layer: function() {
              return layer;
            }
          }
        });
      };

      $scope.$watch('basemap', function(newVal) {
        if (newVal != null && $scope.mapOpts) {
          $scope.mapOpts.basemap = newVal;
        } else if (newVal == null && $scope.mapOpts) {
          $scope.mapOpts.basemap = null;
        }
      });

      $scope.refreshMap = function() {
        $scope.$broadcast('olmap-refresh');
      };
      $scope.saveStyle = function() {
        var content = $scope.editor.getValue();
        GeoServer.style.put(wsName, layerName, content).then(function(result) {
          if (result.success == true) {
            $scope.markers = null;
            $rootScope.alerts = [{
              type: 'success',
              message: 'Styled saved.',
              fadeout: true
            }];
            $scope.refreshMap();
          }
          else {
            if (result.status == 400) {
              // validation error
              $scope.markers = result.data.errors;
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Style not saved due to validation error'
              }];
            }
            else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Error occurred saving style: ' + result.data.message,
                details: result.data.trace
              }];
            }
          }
        });
      };

      $scope.showShortcuts = function() {
        var modalInstance = $modal.open({
          templateUrl: '/components/styleditor/tools/shortcuts.tpl.html',
          controller: 'ShortcutsCtrl',
          backdrop: 'false',
          size: 'md'
        });
      };

      $scope.hideCtrl = {
        'all': false,
        'lonlat': false
      };

      $scope.$on(AppEvent.MapControls, function(scope, ctrl) {
        var val = $scope.hideCtrl[ctrl];
        if (ctrl &&  val !== undefined) {
          $scope.hideCtrl[ctrl] = !val;
        }
      });

      $rootScope.$on(AppEvent.EditorBackground, function(scope, color) {
        $scope.mapBackground = {'background': color};
      });

      $scope.onUpdatePanels = function() {
        $rootScope.$broadcast(AppEvent.SidenavResized); // update map
      };

    }]);
