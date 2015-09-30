/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 *
 * editor.layer.js, editor.layer.less, editor.layer.tpl.html
 * Also uses editor.less for styling shared with editor.map.tpl.html
 *
 * Layer view of the style editor. Sets up the layer context and provides links to layer and workspace modals
 *
 * NOTE: This module should only contain logic specific to the layer veiw. 
 * General editor or map functionality should go in styleeditor.js or olmap.js respectively.
 */
angular.module('gsApp.editor.layer', [
  'ui.codemirror',
  'gsApp.editor.olmap',
  'gsApp.editor.styleeditor',
  'gsApp.editor.tools.shortcuts',
  'gsApp.editor.tools.save',
  'gsApp.editor.tools.undo',
  'gsApp.editor.tools.color',
  'gsApp.editor.tools.icons',
  'gsApp.editor.tools.attributes',
  'gsApp.editor.tools.display',
  'gsApp.editor.tools.sld',
  'gsApp.editor.tools.fullscreen',
  'gsApp.alertpanel',
  'gsApp.featureinfopanel'
  
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('editlayer', {
        url: '/editlayer/:workspace/:name',
        templateUrl: '/components/editor/editor.layer.tpl.html',
        controller: 'LayerStyleCtrl',
        params: { workspace: '', name: ''}
      });
    }])
.controller('LayerStyleCtrl', ['$log', '$modal', '$rootScope', '$scope', '$state', '$stateParams',
    'AppEvent', 'GeoServer',
    function($log, $modal, $rootScope, $scope, $state, $stateParams, 
      AppEvent, GeoServer) {
      
      var wsName = $stateParams.workspace;
      var layerName = $stateParams.name;

      /** WARNING: Editor scope variables **/
      /* The $scope of the editor pages is shared between editor.map / editor.layer, 
       * olmap, layerlist, and styleeditor. As such, care must be taken when adding
       * or modifying these scope variables.
       * See app/components/editor/README.md for more details.
       */
      $scope.workspace = wsName;
      $scope.layer = null;
      $scope.map = null
      $scope.mapOpts = null;
      $scope.isRendering = false;
      $scope.ysldstyle = null;

      //Todo - hide sidenav
      $rootScope.$broadcast(AppEvent.ToggleSidenav);

      GeoServer.layer.get(wsName, layerName).then(function(result) {
        if (result.success) {
          var layer = result.data;
          $scope.layer = layer;

          $scope.mapOpts = {
            workspace: wsName,
            layers: [{name: $scope.layer.name, visible: true}],
            proj: $scope.layer.proj,
            bbox: $scope.layer.bbox.native,
            center: $scope.layer.bbox.native.center,
            error: function(err) {
              if (err && typeof err == 'string' && err.lastIndexOf("Delays are occuring in rendering the map.", 0) === 0) {
                $scope.$apply(function() {
                  $rootScope.alerts = [{
                    type: 'warning',
                    message: 'Map rendering may take a while...',
                    details: err,
                    fadeout: true
                  }];
                });
              } else {
                $scope.$apply(function() {
                  $rootScope.alerts = [{
                    type: 'danger',
                    message: 'Map rendering error',
                    details: err.exceptions ? err.exceptions[0].text : err,
                    fadeout: true
                  }];
                });
              }
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
              $scope.ysldstyle = result.data;
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
          templateUrl: '/components/modalform/layer/layer.settings.tpl.html',
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

      $rootScope.$on(AppEvent.LayerUpdated, function(scope, layer) {
        if ($scope.layer && $scope.layer.name == layer.original.name) {
          $scope.layer = layer.new;
          if (layer.new.name != layer.original.name) {
            $scope.mapOpts.layers = [{name: $scope.layer.name, visible: $scope.mapOpts.layers[0].visible}];
          }

          if (layer.new.proj != layer.original.proj) {
            $scope.mapOpts.proj = layer.new.proj;
          }
        }
      }); 

      $scope.onUpdatePanels = function() {
        $rootScope.$broadcast(AppEvent.SidenavResized); // update map
      };

      $scope.toggleFullscreen = function() {
        $rootScope.broadcast(AppEvent.ToggleFullscreen);
      };

    }]);
