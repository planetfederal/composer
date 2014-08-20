angular.module('gsApp.maps.compose', [
  'ui.codemirror',
  'gsApp.olmap',
  'gsApp.styleditor'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('map.compose', {
        url: '/compose',
        templateUrl: '/maps/detail/compose.tpl.html',
        controller: 'MapComposeCtrl'
      });
    }])
.controller('MapComposeCtrl', ['$scope', '$stateParams', 'GeoServer', '$log',
    function($scope, $stateParams, GeoServer, $log) {
      $scope.title = 'Map ' + $stateParams.name;
    }]);