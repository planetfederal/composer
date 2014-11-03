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

      $scope.title = 'New Project';
      $scope.workspace = {
        default: false
      };
      $scope.workspaceCreated = false;

      $scope.defaultDesc = 'If no project is specified in a GeoServer request,'+
        'the DEFAULT is used. In map or layer requests, for example.';
      $scope.showDefaultDesc = false;

      $scope.cancel = function() {
        $state.go('workspaces.list');
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
              $state.go('workspace', {workspace: $scope.workspace.name});
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

      $scope.viewWorkspace = function() {
        $state.go('workspace', {workspace: $scope.workspace});
      };
    }]);
