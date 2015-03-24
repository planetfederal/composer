/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/* globals $ */
angular.module('gsApp.styleditor.display', [])
.directive('styleEditorDisplay', ['$log', '$rootScope', 'AppEvent',
    function($log, $rootScope, AppEvent) {
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
            $rootScope.$broadcast(AppEvent.MapBackground, $scope.bgcolor);
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
        }
      };
    }]);
