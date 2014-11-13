/*global window, document, ZeroClipboard, $ */
angular.module('gsApp.styleditor.shortcuts', [])
.controller('ShortcutsCtrl', ['$scope', '$modalInstance',
    function($scope, $modalInstance) {

      $scope.close = function () {
        $modalInstance.close();
      };

      $scope.chooseIcon = function(iconname) {
        $scope.selectedIconName = iconname;
      };

      $scope.shortcuts = [
        { 'name': 'Save', 'keys': 'Ctrl-S'},
        { 'name': 'Autocomplete', 'keys': 'Ctrl-Spacebar'},
        { 'name': 'Code fold/unfold', 'keys': 'Ctrl-F'},
        { 'name': 'Select line', 'keys': 'Shift-Up/Down'}
      ];
    }]);
