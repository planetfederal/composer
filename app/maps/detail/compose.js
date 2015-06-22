/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.maps.compose', [
  'ui.codemirror',
  'ui.sortable',
  'gsApp.olmap',
  'gsApp.styleditor',
  'gsApp.featureinfopanel',
  'gsApp.styleditor.shortcuts',
  'gsApp.workspaces.maps.layerremove'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('map.compose', {
        url: '/compose',
        templateUrl: '/maps/detail/compose.tpl.html',
        controller: 'MapComposeCtrl',
        params: { workspace: {}, name: {}, hiddenLayers: {} }
      });
    }])
.controller('MapComposeCtrl',
    ['$scope', '$rootScope', '$state', '$stateParams', '$timeout', '$compile',
    '$log', 'AppEvent', 'GeoServer', '$modal', '_', '$window', '$document',
    function($scope, $rootScope, $state, $stateParams, $timeout, $compile,
      $log, AppEvent, GeoServer, $modal, _, $window, $document) {

      var wsName = $stateParams.workspace;
      $scope.workspace = wsName;
      var name = $stateParams.name;
      var hiddenLayers = $stateParams.hiddenLayers;
      if (hiddenLayers && typeof hiddenLayers === 'string') {
        hiddenLayers = hiddenLayers.split(',');
      }
      $rootScope.$broadcast(AppEvent.ToggleSidenav);

      $scope.$on('$stateChangeStart', function(event, state, args){
        if (!$rootScope.editor.isClean($rootScope.generation)){
          event.preventDefault();
          $scope.editorSave('state', state, args);
        }
      });

      $scope.toggleFullscreen = function() {
        $rootScope.broadcast(AppEvent.ToggleFullscreen);
      };

      $scope.editorSave = function(nextWindowType, state, args) {
        $modal.open({
          templateUrl: '/maps/detail/editorsave-modal.tpl.html',
          controller: ['linterIsvalid', '$scope', '$modalInstance',
            function(linterIsvalid, $scope, $modalInstance) {
              $scope.linterIsvalid = linterIsvalid;

              $scope.cancel = function() {
                $modalInstance.dismiss('cancel');
              };

              $scope.saveChanges = function() {
                $modalInstance.close('save');
              };

              $scope.discardChanges = function() {
                $modalInstance.close('discard');
              };
          }],
          backdrop: 'static',
          size: 'med',
          resolve: {
            linterIsvalid: function() {
              return $rootScope.editor.getStateAfter().pair;
            }
          }
        }).result.then(function(result) {
          var nextWindow = function() {
            if (nextWindowType == 'layer') {
              $scope.selectLayer($scope.gotoLayer);
            } else {
              $state.go(state, args);
            }
          };
          if (result == 'save') {
            $scope.saveStyle().then(nextWindow);
          } else {
            $scope.discardChanges();
            nextWindow();
          }
        });
      };

      $scope.discardChanges = function() {
        //Undo all of the changes made to the editor.
        //TODO: Make sure this doesn't revert saves
        for (var i = $rootScope.generation; i >= 0; i--) {
          $rootScope.editor.undo();
        }
        //If you don't explicitly set the value of the editor to the
        //current value, the content reverts back to the last typed
        //entry rather than discarding all of the changes.
        $rootScope.editor.setValue($rootScope.editor.getValue());

        $rootScope.alerts = [{
          type: 'success',
          message: 'Editor changes have been discarded.',
          fadeout: true
        }];
      }

      GeoServer.map.get(wsName, name).then(function(result) {
        var map = result.data;

        //hack, get the detailed version of the layers
        GeoServer.map.layers.get(wsName, map.name).then(
          function(result) {
          if (result.success) {
            map.layers = result.data;
            $scope.activeLayer = map.layers.length > 0 ? map.layers[0] : null;

            // map options, extend map obj and add visible flag to layers
            $scope.map = map;
            $scope.mapOpts = angular.extend(map, {
              layers: map.layers.map(function(l) {
                l.visible = true;
                if (hiddenLayers) { // reinstate visibility
                  var found = _.contains(hiddenLayers, l.name);
                  if (found) {
                    l.visible = false;
                  }
                }
                return l;
              }),
              error: function(err) {
                if (err && typeof err == 'string' && err.startsWith("Delays are occuring in rendering the map.")) {
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
              featureInfo: function(features) {
                $scope.$broadcast('featureinfo', features);
              }
            });
          } else {
            $rootScope.alerts = [{
              type: 'danger',
              message: 'Could not load map ' + name + ': ' +
                result.data.message,
              details: result.data.trace,
              fadeout: true
            }];
          }
        });
      });

      $scope.toggle = true;
      $scope.toggleLayers = function() {
        $scope.toggle = !$scope.toggle;
      };

      $scope.selectLayer = function(layer) {
        var layerState = $scope.layerState;
        var activeLayer = $scope.activeLayer;
        $scope.gotoLayer = layer;

        if (!$rootScope.editor.isClean($rootScope.generation)) {
          $scope.editorSave('layer');
        }
        else {
          if (activeLayer != null) {
            if (!(activeLayer.name in layerState)) {
              layerState[activeLayer.name] = {};
            }
            layerState[activeLayer.name].style = $scope.ysldstyle;
          }
          $scope.activeLayer = layer;
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
          templateUrl: '/workspaces/detail/modals/map.layerremove.tpl.html',
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
            GeoServer.map.layers.delete(wsName, $scope.map.name, layer.name)
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

      $scope.refreshMap = function() {
        $scope.$broadcast('olmap-refresh');
      };

      $scope.saveStyle = function() {
        var l = $scope.activeLayer;
        return GeoServer.style.put(l.workspace, l.name, $scope.ysldstyle, $scope.map)
          .then(function(result) {
            if (result.success == true) {
              $scope.markers = null;
              $rootScope.alerts = [{
                type: 'success',
                message: 'Style saved for layer: '+l.name,
                fadeout: true
              }];
              $rootScope.generation = $rootScope.editor.changeGeneration();
              $scope.refreshMap();
            }
            else {
              if (result.status == 400) {
                // validation error
                $scope.markers = result.data.errors;
                $rootScope.alerts = [{
                  type: 'danger',
                  message: 'Style not saved due to validation error.'
                }];
              }
              else {
                $rootScope.alerts = [{
                  type: 'danger',
                  message: 'Error occurred saving style: ' +
                    result.data.message,
                  details: result.data.trace
                }];
              }
            }
          });
      };

      $scope.layersReordered = function() {
        if ($scope.map != null) {
          GeoServer.map.layers.put(wsName, name, $scope.map.layers)
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
      $scope.layerState = {};
      $scope.$watch('activeLayer', function(newVal) {
        if ($scope.mapOpts) {
          $scope.mapOpts.activeLayer = newVal;
        }
        if (newVal != null) {
          var l = newVal;
          if (l.name in $scope.layerState) {
            $scope.ysldstyle = $scope.layerState[l.name].style;
          }
          else {
            GeoServer.style.get(l.workspace, l.name)
              .then(function(result) {
                $scope.ysldstyle = result.data;
              });
          }
          $timeout(function() {
            $scope.editor.clearHistory();
            $rootScope.editor.clearHistory();

            if($rootScope.popoverElement) {
              $rootScope.popoverElement.remove();
            }

            $rootScope.editor.clearGutter('markers');
          }, 250);
        }
      });

      $scope.viewWorkspace = function(workspace) {
        $rootScope.workspace = workspace;
        $state.go('workspace', {workspace: workspace});
      };

      // Save checkbox state as url parameters
      $scope.getHiddenLayers = function() {
        var hiddenLayers = _.remove($scope.map.layers,
          function(lyr) { return lyr.visible===false; });
        hiddenLayers = _.map(hiddenLayers,
          function(layer) { return layer.name; });
        return hiddenLayers.join();
      };

      $scope.addMapLayer = function(workspace) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/layer.addtomap.tpl.html',
          controller: 'AddToMapLayerCtrl',
          size: 'lg',
          resolve: {
            map: function() {
              return $scope.map;
            },
            workspace: function() {
              return $scope.workspace;
            }
          }
        }).result.then(function(response, args) {
          if (response==='import') {
            $scope.map.hiddenLayers = $scope.getHiddenLayers();
            var mapInfo = $scope.map;
            $timeout(function() {
              $rootScope.$broadcast(AppEvent.ImportData, {
                mapInfo: mapInfo,
                workspace: $scope.workspace
              });
            }, 250);
            // go to this state to initiate listener for broadcast above!
            $state.go('workspace.data.import', {
              workspace: $scope.workspace
            });
          } else if (response==='added') {
            $scope.refreshMap();
          }
        });
      };

      $scope.editMapSettings = function(map) {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/map.settings.tpl.html',
          controller: 'EditMapSettingsCtrl',
          backdrop: 'static',
          size: 'md',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            map: function() {
              return map;
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

      $scope.$on(AppEvent.EditorBackground, function(scope, color) {
        $scope.mapBackground = {'background': color};
      });

      $scope.$on(AppEvent.BaseMapChanged, function(scope, basemap) {
        if ($scope.mapOpts) {
          $scope.mapOpts.basemap = basemap;
        }
      });

      $scope.onUpdatePanels = function() {
        $rootScope.$broadcast(AppEvent.SidenavResized); // update map
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

      $scope.$on(AppEvent.MapUpdated, function(scope, map) {
        if ($scope.map.name == map.original.name) {
          $scope.map = map.new;

          if (map.new.proj != map.original.proj) {
            $scope.mapOpts.proj = map.new.proj;
          }
          if (map.new.bounds!= map.original.bounds) {
            $scope.mapOpts.bounds = map.new.bounds;
          }
        }
      }); 

    }]);
