angular.module('gsApp.workspaces.new', [])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('workspaces.new', {
          url: '/new',
          templateUrl: '/workspaces/new.tpl.html',
          controller: 'WorkspaceNewCtrl'
        });
    }])
.controller('WorkspaceNewCtrl', ['$scope', '$rootScope', '$state',
    '$stateParams', '$log', 'GeoServer',
    function($scope, $rootScope, $state, $stateParams, $log, GeoServer) {

      $scope.title = 'New Workspace';
      $scope.workspace = {
        default: false
      };
      $scope.workspaceCreated = false;

      $scope.cancel = function() {
        $state.go('workspaces');
      };

      $scope.updateUri = function() {
        $scope.workspace.uri = 'http://' + $scope.workspace.name;
      };

      $scope.create = function() {
        var workspace = $scope.workspace;
        GeoServer.workspace.create(workspace).then(
          function(result) {
            if (result.success || result.status===201) {
              $scope.workspaceCreated = true;
              $rootScope.alerts = [{
                type: 'success',
                message: 'Workspace '+ workspace.name +' created.',
                fadeout: true
              }];
            } else {
              var msg = result.data.message?
                result.data.message : result.data;
              $rootScope.alerts = [{
                type: 'warning',
                message: msg,
                fadeout: true
              }];
            }
          });
      };
    }]);