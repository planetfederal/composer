/* globals $ */
angular.module('gsApp.styleditor.size', [])
.directive('styleEditorSize', ['$log',
    function($log) {
      return {
        restrict: 'EA',
        scope: {
          editor: '=',
        },
        template:
          '<li class="dropdown dropdown-toggle">'+
            '<i class="icon-text-height"></i>'+
            '<span>Size</span>'+
            '<ul class="dropdown-menu">'+
              '<li ng-repeat="s in sizes" ng-class="{active: $index == size}">'+
                '<a href ng-click="chooseSize($index)">{{s[0]}}</a>'+
              '</li>'+
            '</ul>'+
          '</l>',
        replace: true,
        controller: function($scope, $element) {
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
        }
      };
    }]);