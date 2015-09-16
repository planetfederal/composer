/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 * License: BSD
 *
 * layerlist.js, layerlist.less, layerlist.tpl.html
 * Fullscreen styling for layer list is in editor.less
 *
 * A list of layers in a map, that can be shown/hidden, rearanged, and deleted. 
 * Used by editor.map.js 
 */
angular.module('gsApp.editor.layerlist', [])
.directive('layerList', ['$log', '$modal', '$rootScope', '$timeout', 'GeoServer',
  function($log, $modal, $rootScope, $timeout, GeoServer) {
    return {
      restrict: 'EA',
      templateUrl: '/components/editor/layerlist/layerlist.tpl.html',
      controller: function($scope, $element) {

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

        /* Initialized in layerlist.js
        $scope.showLayerList  //boolean indicating wheter to display the layer list
        */
        $scope.showLayerList = true;

        $scope.selectLayer = function(layer) {
          var activeLayer = $scope.layer;

          if (!$scope.editor.isClean($scope.generation)) {
            $scope.goToLayer = layer;
            $scope.editorSave('layer');
          } else {
            $scope.layer = layer;
          }
        };

        $scope.zoomToLayer = function(layer) {
          $scope.mapOpts.bounds = {
            bbox: layer.bbox,
            proj: layer.proj
          };
        };

        $scope.removeLayer = function(layer, index) {
          var modalInstance = $modal.open({
            templateUrl: '/components/editor/layerlist/layerremove.tpl.html',
            controller: 'MapRemoveLayerCtrl',
            size: 'md',
            resolve: {
              map: function() {
                return $scope.map;
              },
              layer: function() {
                return layer;
              }
            }
          }).result.then(function(response) {
            if (response==='remove') {
              GeoServer.map.layers.delete($scope.workspace, $scope.map.name, layer.name)
                .then(function(result) {
                  if (result.success) {
                    $scope.map.layers.splice(index, 1);
                    $scope.map.layer_count--;
                  }
                  else {
                    var err = result.data;
                    $rootScope.alerts = [{
                      type: 'danger',
                      message: 'Unable to delete layer '+layer.name+' from map'+$scope.map.name+': ' + err.message,
                      details: err
                    }];
                  }
                });
            }
          });
        };

        $scope.layersReordered = function() {
          if ($scope.map != null) {
            GeoServer.map.layers.put($scope.workspace, $scope.map.name, $scope.map.layers)
              .then(function(result) {
                if (result.success) {
                  $scope.refreshMap();
                }
                else {
                  $log.log(result);
                }
              });
          }
        };
        $scope.$watch('layer', function(newVal) {
          if ($scope.mapOpts) {
            $scope.mapOpts.activeLayer = newVal;
          }
          if (newVal != null) {
            var l = newVal;
            GeoServer.style.get(l.workspace, l.name)
              .then(function(result) {
                $scope.ysldstyle = result.data;
              });
            $timeout(function() {
              $scope.editor.clearHistory();

              if($scope.popoverElement) {
                $scope.popoverElement.remove();
              }

              $scope.editor.clearGutter('markers');
            }, 250);
          }
        });

        $scope.toggleLayers = function() {
          $scope.showLayerList = !$scope.showLayerList;
        };
      }
    };
  }]);