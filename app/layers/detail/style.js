angular.module('gsApp.layers.style', [
  'ui.codemirror',
  'gsApp.olmap',
  'gsApp.styleditor',
  'gsApp.alertpanel'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider.state('layer.style', {
        url: '/style',
        templateUrl: '/layers/detail/style.tpl.html',
        controller: 'LayerStyleCtrl'
      });
    }])
.controller('LayerStyleCtrl', ['$scope', '$rootScope', '$stateParams',
    'GeoServer', '$log',
    function($scope, $rootScope, $stateParams, GeoServer, $log) {
      var wsName = $stateParams.workspace;
      var layerName = $stateParams.name;

      GeoServer.layer.get(wsName, layerName).then(function(result) {
        if (result.success == true) {
          $scope.layer = result.data;

          $scope.mapOpts = {
            workspace: wsName,
            layers: [{name: $scope.layer.name, visible: true}],
            proj: $scope.layer.proj,
            bbox: $scope.layer.bbox.native,
            center: $scope.layer.bbox.native.center
          };

          GeoServer.style.get(wsName, layerName).then(function(result) {
            if (result.success == true) {
              $scope.style = result.data;
            } else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Could not retrieve style for layer: ' + layerName
              }];
            }
          });

        } else {
          $rootScope.alerts = [{
            type: 'danger',
            message: 'Could not retrieve layer info for : ' + layerName
          }];
        }
      });

      $scope.refreshMap = function() {
        $scope.$broadcast('olmap-refresh');
      };
      $scope.saveStyle = function() {
        var content = $scope.editor.getValue();
        GeoServer.style.put(wsName, layerName, content).then(function(result) {
          if (result.success == true) {
            $scope.markers = null;
            $rootScope.alerts = [{
              type: 'success',
              message: 'Styled saved.',
              fadeout: true
            }];
            $scope.refreshMap();
          }
          else {
            if (result.status == 400) {
              // validation error
              $scope.markers = result.data.errors;
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Style not saved due to validation error'
              }];
            }
            else {
              $rootScope.alerts = [{
                type: 'danger',
                message: 'Error occurred saving style: ' + result.data.message,
                details: result.data.trace
              }];
            }
          }
        });
      };
    }]);
