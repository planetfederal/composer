/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 * License: BSD
 */
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
      $scope.mac = navigator.platform.match(/(Mac|iPhone|iPod|iPad)/i)
      cmdKey =  $scope.mac ? 'Cmd-' : 'Ctrl-';
      $scope.shortcuts = [
        { 'name': 'Save', 'keys': cmdKey+'S'},
        { 'name': 'Autocomplete', 'keys': cmdKey+'Spacebar' + ($scope.mac ? '*' : '')},
        { 'name': 'Code fold/unfold', 'keys': cmdKey+'F'},
        { 'name': 'Select line', 'keys': 'Shift-Up/Down'},
        { 'name': 'Increase/reduce indent', 'keys': 'Tab/Shift-Tab'}
      ];
    }]);
