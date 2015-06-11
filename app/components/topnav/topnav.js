/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 * License: BSD
 */
angular.module('gsApp.topnav', ['gsApp.alertlist'])
.directive('topNav',
  function() {
    return {
      restrict: 'EA',
      templateUrl: '/components/topnav/topnav.tpl.html'
    };
  })
.controller('TopNavCtrl', ['$scope', '$rootScope', 'GeoServer', 'AppEvent', '$modal',
    function($scope, $rootScope, GeoServer, AppEvent, $modal) {
      $scope.logout = function() {
        GeoServer.logout()
          .then(function() {
            $rootScope.$broadcast(AppEvent.Logout);
          });
      };
      $scope.errors = function() {
        //Show errors modal.
        $modal.open({
          templateUrl: '/components/alertpanel/alertlist.tpl.html',
          controller: 'AlertListCtrl',
          backdrop: 'static',
          size: 'md',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            maps: function() {
              return $scope.maps;
            }
          }
        })
        // - Details - collapsable
        // - Errors - highlight in error color.
        // - 
      }
      $scope.adminLink = GeoServer.baseUrl();
    }]);
