/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/* globals $ */
angular.module('gsApp.styleditor.display', [
  'gsApp.styleditor.basemap'
])
.directive('styleEditorDisplay', ['$log', '$rootScope', 'AppEvent',
  '$modal',
    function($log, $rootScope, AppEvent, $modal) {
      return {
        restrict: 'EA',
        scope: {
          editor: '=',
        },
        templateUrl: '/components/styleditor/tools/display.tpl.html',
        replace: true,
        controller: function($scope, $element) {

          /* BgColor */

          $scope.bgcolors = {
            'black': 'black',
            'ltblue': 'cornflowerblue',
            'gray': '#333333',
            'ltgray': '#cccccc',
            'white': 'white',
            'sand': 'peru'
          };
          // Set default as white
          $scope.bgcolor = Object.keys($scope.bgcolors)[4];

          $scope.chooseBgcolor = function(color) {
            $scope.bgcolor = $scope.bgcolors[color];
            $rootScope.$broadcast(AppEvent.EditorBackground, $scope.bgcolor);
          };

          /* Font */

          $scope.fonts = {
            'Monospace': 'monospace',
            'Sans Serif': 'sans-serif',
            'Serif': 'serif',
            'Inconsolata': 'Inconsolata',
            'Source Code Pro': 'Source Code Pro'
          };
          // Set default as Inconsolata
          $scope.font = Object.keys($scope.fonts)[3];

          $scope.chooseFont = function(font) {
            var css = $scope.fonts[font];
            $scope.font = css;

            // hack!
            $('.CodeMirror').css('font-family', css);
          };

          /* Font Size */

          $scope.sizes = [
            ['Small', '10px'],
            ['Smaller', '12px'],
            ['Normal', '14px'],
            ['Larger', '16px'],
            ['Large', '18px']
          ];

          $scope.size = 2;
          $scope.chooseSize = function(i) {
            $scope.size = i;

            // hack!
            $('.CodeMirror').css('font-size', $scope.sizes[i][1]);
          };

          /* Map Controls */

          $scope.mapcontrols = {
            'Toggle All': 'all',
            'Toggle LonLat': 'lonlat'
          };

          $scope.chooseControl = function(ctrl) {
            $scope.$emit(AppEvent.MapControls, ctrl);
          };

          $scope.basemapControls = {
            'Add Basemap': 'add',
            'Hide Basemap': 'hide'
          };

          $scope.addBasemap = function() {
            $modal.open({
              templateUrl:
                '/components/styleditor/tools/basemap.modal.tpl.html',
              controller: 'BasemapModalCtrl',
              size: 'md',
              resolve: {
                workspace: function() {
                  return $scope.$parent.workspace;
                },
                map: function() {
                  return $scope.$parent.map;
                }
              }
            });
          };

          $scope.hideBasemap = function() {
            $scope.$parent.basemap = null;
          };

          $scope.chooseBasemapControl = function(ctrl) {
            if (ctrl == 'add') {
              $scope.addBasemap();
            } else if (ctrl == 'hide') {
              $scope.hideBasemap();
            }
          };
        }
      };
    }]);
