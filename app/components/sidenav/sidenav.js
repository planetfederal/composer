angular.module('gsApp.sidenav', [])
  .directive('sidenav', function() {
      return {
        restrict: 'EA',
        templateUrl: 'components/sidenav/sidenav.tpl.html',
        controller: 'SideNavCtrl',
        replace: true
      };
    })
  .controller('SideNavCtrl', ['$scope', 'GeoServer', 'AppEvent',
    function($scope, GeoServer, AppEvent) {

      GeoServer.workspaces.get().$promise.then(function(workspaces) {
        workspaces.filter(function(ws) {
          return ws['default'];
        });

        $scope.workspaces = workspaces;
      });

    }]);

