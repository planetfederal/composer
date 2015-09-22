/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 * License: BSD
 */
/*global window, document, ZeroClipboard, $ */
angular.module('gsApp.editor.tools.icons', [
  'angularFileUpload',
  'gsApp.core.utilities'
])
.directive('styleEditorIcons', ['$modal', '$log', 'GeoServer', '$rootScope',
    function($modal, $log, GeoServer, $rootScope) {
      return {
        restrict: 'EA',
        scope: {
          editor: '='
        },
        template:
          '<li class="styleeditor-icon"' +
            'ng-click="selectIcon();">'+
            '<i class="icon-flag"></i>'+
            '<span>Icons</span>'+
          '</li>',
        replace: true,
        controller: function($scope, $element, $modal) {

          $scope.icons = [];
          var workspace = $scope.$parent.workspace;

          GeoServer.icons.get(workspace)
            .then(function(result) {
              if (result.success) {
                $scope.icons = result.data;
                //propagate data upstream for easier access by other components
                $scope.$parent.icons = $scope.icons;
              } else {
                $rootScope.alerts = [{
                  type: 'warning',
                  message: 'Cannot load icons.',
                  fadeout: true
                }];
              }
            });

          $scope.selectIcon = function() {
            if ($scope.icons.length===-1) {
              $rootScope.alerts = [{
                type: 'warning',
                message: 'Cannot load icons.',
                fadeout: true
              }];
              return;
            }
            $modal.open({
              templateUrl: '/components/editor/tools/icons.modal.tpl.html',
              controller: 'IconsModalCtrl',
              size: 'lg',
              resolve: {
                workspace: function() {
                  return workspace;
                },
                icons: function() {
                  return $scope.icons;
                }
              }
            });
          };
        }
      };
    }])
.controller('IconsModalCtrl', ['$scope', '$modalInstance', '$upload', '$log',
    'GeoServer', 'workspace', 'icons', '$timeout',
    function($scope, $modalInstance, $upload, $log, GeoServer, workspace,
      icons, $timeout) {

      $scope.workspace = workspace;
      $scope.icons = icons;

      $scope.close = function () {
        $modalInstance.dismiss('cancel');
      };

      $scope.chooseIcon = function(icon) {
        $scope.selectedIconName = icon.name;
        $scope.selectedIconPath = "- external:\n" +
                                  "    url: " + icon.name + "\n" +
                                  "    format: " + icon.mime;
      };

      $scope.uploadIcons = function(files) {
        $scope.uploadRunning = true;
        $upload.upload({
          url: GeoServer.icon.url($scope.workspace),
          method: 'POST',
          file: files[0]
        }).success(function(result) {
          result.forEach(function(icon) {
            icons.push(icon);
          });
          $scope.uploadRunning = false;
        });
      };

      $scope.hasFlash = false;
      $timeout(function() {
        try {
            var swf = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
            if (swf) {
                $scope.hasFlash = true;
            }
        } catch (e) {
            if (navigator.mimeTypes
                && navigator.mimeTypes['application/x-shockwave-flash'] != undefined
                && navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin) {
              $scope.hasFlash = true;
            }
        }
        if ($scope.hasFlash) {
            new ZeroClipboard($('#copyIcon')).on('copy',
              function(event) {
                var clipboard = event.clipboardData;
                if ($scope.selectedIconName) {
                  clipboard.setData('text/plain',
                    $scope.selectedIconPath
                  );
                  $scope.close();
                }
              });
        }
      }, 500);

    }]);
