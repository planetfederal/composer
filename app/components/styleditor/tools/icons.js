/*global window, document, ZeroClipboard, $ */
angular.module('gsApp.styleditor.icons', [])
.directive('styleEditorIcons', ['$log', 'GeoServer', '$modal',
    function($log, GeoServer) {
      return {
        restrict: 'EA',
        scope: {
          click: '='
        },
        template:
          '<li class="dropdown dropdown-toggle icons-dropdown" ng-click="selectIcon();">'+
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
                result.data.forEach(function(item) {
                  $scope.icons.push(
                    { 'name': item.name,
                      'url': $scope.getIconURL(item.name),
                      'selected': false
                    });
                });
                // Set default selected
                $scope.icon = $scope.icons[0];
              } else {
                $scope.$parent.alerts = [{
                  type: 'warning',
                  message: 'Cannot load icons.',
                  fadeout: true
                }];
              }
            });

          $scope.getIconURL = function(iconfile) {
            return GeoServer.icons.getIconURL(workspace, iconfile);
          };

          $scope.selectIcon = function() {
            if ($scope.icons.length===-1) {
              $scope.$parent.alerts = [{
                type: 'warning',
                message: 'Cannot load icons.',
                fadeout: true
              }];
              return;
            }
            var modalInstance = $modal.open({
              templateUrl: '/components/styleditor/tools/icons-modal.tpl.html',
              controller: 'IconsModalCtrl',
              size: 'lg',
              resolve: {
                workspace: function() {
                  return workspace;
                },
                geoserver: function() {
                  return GeoServer;
                },
                icons: function() {
                  return $scope.icons;
                },
                editor: function() {
                  return $scope.$parent.editor;
                }
              }
            });
          };
        }
      };
    }])
.controller('IconsModalCtrl', ['$scope', '$modalInstance',
  'workspace', 'geoserver', 'icons', 'editor', '$timeout',
  function($scope, $modalInstance, workspace, geoserver, icons,
    editor, $timeout) {

    $scope.workspace = workspace;
    $scope.geoserver = geoserver;
    $scope.icons = icons;
    $scope.selectedIconName = null;

    $scope.ok = function () {
      $modalInstance.close($scope.icon);
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
    $scope.chooseIcon = function(i) {
      $scope.selectedIconName = i.name;
    };

    $timeout(function() {
      new ZeroClipboard($('#copyIcon')).on('copy',
      function(event) {
        var clipboard = event.clipboardData;
        if ($scope.selectedIconName) {
          clipboard.setData('text/plain',
            $scope.selectedIconName
          );
        }
      });
    }, 500);

  }])
.filter('partition', function() {
  var cache = {};
  var filter = function(arr, size) {
    if (!arr) { return; }
    var newArr = [];
    for (var i=0; i<arr.length; i+=size) {
      newArr.push(arr.slice(i, i+size));
    }
    var arrString = JSON.stringify(arr);
    var fromCache = cache[arrString+size];
    if (JSON.stringify(fromCache) === JSON.stringify(newArr)) {
      return fromCache;
    }
    cache[arrString+size] = newArr;
    return newArr;
  };
  return filter;
});
