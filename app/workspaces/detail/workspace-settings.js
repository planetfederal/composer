angular.module('gsApp.workspaces.workspace.settings', [
  'gsApp.alertpanel',
  'ngSanitize'
])
.controller('WorkspaceSettingsCtrl', ['$scope', '$stateParams', 'GeoServer',
  '$log', '$sce', 'baseUrl', '$window', '$state', '$location', '$modal',
  '$rootScope', 'AppEvent',
    function($scope, $stateParams, GeoServer, $log, $sce, baseUrl,
      $window, $state, $location, $modal, $rootScope, AppEvent) {

      $scope.wsSettings = {};
      $scope.form = {};
      var originalForm;

      GeoServer.workspace.get($scope.workspace).then(
        function(result) {
          if (result.success) {
            var ws = result.data;
            $scope.wsSettings.name = ws.name;
            $scope.wsSettings.uri= ws.uri;
            $scope.wsSettings.default = ws.default;
            originalForm = angular.copy($scope.wsSettings);
          } else {
            $scope.alerts = [{
              type: 'warning',
              message: 'Workspace could not be loaded.',
              fadeout: true
            }];
          }
        });

      $scope.saveChanges = function() {
        if ($scope.form.settings.$dirty) {
          var patch = {};
          if (originalForm.name !== $scope.wsSettings.name) {
            patch.name = $scope.wsSettings.name;
          }
          if (originalForm.uri !== $scope.wsSettings.uri) {
            patch.uri = $scope.wsSettings.uri;
          }
          if (originalForm.default !== $scope.wsSettings.default) {
            patch.default = $scope.wsSettings.default;
          }

          GeoServer.workspace.update($scope.workspace, patch).then(
            function(result) {
              if (result.success) {
                if (patch.name) { // Update everything
                  $rootScope.$broadcast(AppEvent.WorkspaceNameChanged,
                    { 'original': originalForm.name,
                      'new': $scope.wsSettings.name
                    });
                  $scope.workspace = $scope.wsSettings.name;
                  $state.go('workspace.home.settings', {
                    workspace: $scope.workspace
                  });
                }
                $scope.wsSettings.saved = true;
                originalForm = angular.copy($scope.wsSettings);

              } else {
                // TODO move alerts to top of header nav
                $scope.alerts = [{
                  type: 'warning',
                  message: 'Workspace update failed.',
                  fadeout: true
                }];
              }
            });
        }
      };
      $scope.deleteWorkspace = function() {
        var modalInstance = $modal.open({
          templateUrl: '/workspaces/detail/modals/delete-modal.tpl.html',
          controller: 'DeleteModalControl',
          size: 'md',
          resolve: {
            workspace: function() {
              return $scope.workspace;
            },
            geoserver: function() {
              return GeoServer;
            }
          }
        });
      };

    }]);
