/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.workspaces.settings', [
  'gsApp.alertpanel',
  'ngSanitize'
])
.controller('WorkspaceSettingsCtrl', ['$scope', '$rootScope', '$modalInstance',
    '$modal', '$log', 'workspace', 'GeoServer', 'AppEvent',
    function($scope, $rootScope, $modalInstance, $modal, $log, workspace,
      GeoServer, AppEvent) {

      //Workspace name
      $scope.workspace = workspace;
      //workspace details
      $scope.wsSettings = {};
      $scope.form = {};
      var originalForm;

      $scope.defaultDesc = 'If a project workspace is not specified ' +
        'in a GeoServer request, the DEFAULT project is used.';
      $scope.showDefaultDesc = false;

      GeoServer.workspace.get(workspace).then(
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

      $scope.close = function () {
        $modalInstance.dismiss();
      }
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
                }
                $scope.wsSettings.saved = true;
                originalForm = angular.copy($scope.wsSettings);
                $modalInstance.close();
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
    }]);
