angular.module('gsApp.workspaces', [
  'ngGrid',
  'gsApp.core.utilities',
  'gsApp.workspaces.list',
  'gsApp.workspaces.new',
  'gsApp.workspaces.delete',
  'gsApp.workspaces.home'
])
.config(['$stateProvider',
    function($stateProvider) {
      $stateProvider
        .state('workspaces', {
          abstract: true,
          url: '/workspaces',
          templateUrl: '/workspaces/workspaces.tpl.html'
        });
    }]);

