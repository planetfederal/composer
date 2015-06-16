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
      cmdKey =  navigator.platform.match(/(Mac|iPhone|iPod|iPad)/i) ? 'Cmd' : 'Ctrl';
      $scope.shortcuts = [
        { 'name': 'Save', 'keys': [{'key':cmdKey,'delim':'+'},{'key':'S'}]},
        { 'name': 'Autocomplete', 'keys': [{'key':cmdKey,'delim':'+'},{'key':'Enter'}]},
        { 'name': 'Code fold/unfold', 'keys': [{'key':cmdKey,'delim':'+'},{'key':',','delim':'/'},{'key':'.'}]},
        { 'name': 'Comment/uncomment selection', 'keys':[{'key':cmdKey,'delim':'+'}, {'key':'3'}]},
        { 'name': 'Select line', 'keys': [{'key':'Shift','delim':'+'},{'key':'Up','delim':'/'},{'key':'Down'}]},
        { 'name': 'Increase/reduce indent', 'keys': [{'key':'Tab','delim':'/'},{'key':'Shift','delim':'+'},{'key':'Tab'}]}
      ];
    }]);
