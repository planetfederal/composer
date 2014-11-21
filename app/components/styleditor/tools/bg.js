/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/* globals $ */
angular.module('gsApp.styleditor.bg', [])
.directive('styleEditorBg', ['$log', '$rootScope', 'AppEvent',
    function($log, $rootScope, AppEvent) {
      return {
        restrict: 'EA',
        scope: {
          editor: '=',
        },
        template:
          '<li class="dropdown dropdown-toggle">'+
            '<i class="icon-paint-format"></i>'+
            '<span>BgColor</span>'+
            '<ul class="dropdown-menu" style="min-width: 140px;">'+
              '<li style="margin-left: 3px; color: #777;">'+
                '<small>(Screen only - not map)</small></li>'+
              '<li ng-repeat="(b,c) in bgcolors"'+
                'ng-class="{active: b == bgcolor}">'+
                '<a href ng-click="chooseBgcolor(b)">{{b}}</a>'+
              '</li>'+
            '</ul>'+
          '</li>',
        replace: true,
        controller: function($scope, $element) {
          $scope.bgcolors = {
            'black': 'black',
            'blue': '#28728d',
            'ltblue': 'cornflowerblue',
            'gray': '#333333',
            'ltgray': '#cccccc',
            'white': 'white'
          };
          // Set default as white
          $scope.bgcolor = Object.keys($scope.bgcolors)[0];

          $scope.chooseBgcolor = function(color) {
            $scope.bgcolor = $scope.bgcolors[color];
            $rootScope.$broadcast(AppEvent.MapBackground, $scope.bgcolor);
          };
        }
      };
    }]);
