angular.module('gsApp.editor.tools.fullscreen', [])
.directive('styleEditorFullscreen', ['AppEvent',
  function(AppEvent) {
    return {
      restrict: 'EA',
      template:
        '<li ng-click="toggleFullscreen()">' +
          '<i ng-class="fullscreen? \'icon-contract\' : \'icon-expand\'"></i>' +
          '<span>Fullscreen</span>' +
        '</li>',
      replace: true,
      controller: function($scope, $element) {
        $scope.toggleFullscreen = function() {
          $scope.$emit(AppEvent.ToggleFullscreen);
        };
      }
    };
  }]);
