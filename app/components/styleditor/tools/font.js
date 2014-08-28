/* globals $ */
angular.module('gsApp.styleditor.font', [])
.directive('styleEditorFont', ['$log',
    function($log) {
      return {
        restrict: 'EA',
        scope: {
          editor: '=',
        },
        template:
          '<li class="dropdown dropdown-toggle">'+
            '<i class="icon-font"></i>'+
            '<span>Font</span>'+
            '<ul class="dropdown-menu">'+
              '<li ng-repeat="(f,v) in fonts" ng-class="{active: f == font}">'+
                '<a href ng-click="chooseFont(f)">{{f}}</a>'+
              '</li>'+
            '</ul>'+
          '</l>',
        replace: true,
        controller: function($scope, $element) {
          $scope.fonts = {
            'Monospace': 'monospace',
            'Sans Serif': 'sans-serif',
            'Serif': 'serif'
          };
          
          $scope.font = Object.keys($scope.fonts)[0];
          $scope.chooseFont = function(font) {
            $scope.font = font;
            var css = $scope.fonts[font];

            // hack!
            $('.CodeMirror').css('font-family', css);
          };
        }
      };
    }]);