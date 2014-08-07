angular.module('gsApp.sidenav', [
  'gsApp.sidenav.directives'
]);

angular.module('gsApp.sidenav.directives', [])
  .directive('sidenav', function() {
      return {
        restrict: 'EA',
        templateUrl: 'components/sidenav/sidenav.tpl.html',
        replace: true
      };
    });
