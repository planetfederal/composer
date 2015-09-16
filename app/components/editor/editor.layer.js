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
        url: '/edit/:workspace/:name',
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

      /* initialized in layerlist.js
      $scope.showLayerList  //boolean indicating wheter to display the layer list
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
          templateUrl: '/components/modals/layer/layer.settings.tpl.html',
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

      $rootScope.$on(AppEvent.MapUpdated, function(scope, layer) {
        if ($scope.layer.name == layer.original.name) {
          $scope.layer = layer.new;

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
