/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
angular.module('gsApp.editor.tools.shortcuts', [])
.directive('styleEditorShortcuts', ['$log', '$rootScope', 'AppEvent', '$modal',
    function($log, $rootScope, AppEvent, $modal) {
      return {
        restrict: 'EA',
        scope: {
          editor: '=',
        },
        template:
          '<a ng-click="showShortcuts()">' +
             '<i class="icon-keyboard icon-lg"></i>' +
          '</a>',
        replace: true,
        controller: function($scope, $element) {
          $scope.showShortcuts = function() {
            var modalInstance = $modal.open({
              templateUrl: '/components/editor/tools/shortcuts.modal.tpl.html',
              controller: 'ShortcutsCtrl',
              backdrop: 'false',
              size: 'md'
            });
          };
        }
      };
    }])
.controller('ShortcutsCtrl', ['$scope', '$modalInstance',
    function($scope, $modalInstance) {

      $scope.close = function () {
        $modalInstance.close();
      };

      $scope.chooseIcon = function(iconname) {
        $scope.selectedIconName = iconname;
      };
      var cmdKey =  navigator.platform.match(/(Mac|iPhone|iPod|iPad)/i) ? 'Cmd' : 'Ctrl';
      $scope.shortcuts = [
        { 'name': 'Save', 'keys': [{'key':cmdKey,'delim':'+'},{'key':'S'}]},
        { 'name': 'Autocomplete', 'keys': [{'key':cmdKey,'delim':'+'},{'key':'Enter'}]},
        { 'name': 'Code fold/unfold', 'keys': [{'key':cmdKey,'delim':'+'},{'key':',','delim':'/'},{'key':'.'}]},
        { 'name': 'Comment/uncomment selection', 'keys':[{'key':cmdKey,'delim':'+'}, {'key':'3'}]},
        { 'name': 'Select line', 'keys': [{'key':'Shift','delim':'+'},{'key':'Up','delim':'/'},{'key':'Down'}]},
        { 'name': 'Increase/reduce indent', 'keys': [{'key':'Tab','delim':'/'},{'key':'Shift','delim':'+'},{'key':'Tab'}]}
      ];
    }]);