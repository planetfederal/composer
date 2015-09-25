/*
 * (c) 2015 Boundless, http://boundlessgeo.com
 *
 * Modal Utilities
 */
 angular.module('gsApp.modal', [])
.controller('ModalCtrl', ['$scope',
    function ($scope) {

      //Global for consistincy
      $scope.crsTooltip =
        '<p>Add a projection in EPSG</p>' +
        '<p><small>Coordinate Reference System (CRS) info is available at ' +
          '<a href="http://prj2epsg.org/search" target="_blank">' +
            'http://prj2epsg.org' +
          '</a>' +
          '</small></p>';

      $scope.extentTooltip =
        '<p>Map Extent</p>' +
        '<small class="hint"> The default region visible when rendering ' +
        'the map.<br/>The map extent should be provided in the same units ' +
        'as the projection: degrees for EPSG:4326 or meters for most ' +
        'other EPSG codes.<br/><br/>"Generate Bounds" will calculate the ' +
        'net layer bounds in the current projection.</small>';

      $scope.renderTooltip =
        '<p>Render Timeout</p>' +
        '<small class="hint">Max time to wait for map to render in ' +
        'Composer before the request is cancelled.<br/>A lower number prevents '+
        'overloading GeoServer with resource-monopolizing rendering '+
        'requests.<br/><br/>Minimum is 3 seconds.<br/><br/>Default is ' +
        '120 seconds.<br/>(This is set high so you can still render ' +
        'large datasets, but we recommend reducing this for a more ' +
        'performant or shared GeoServer).</small>';
}])
.directive('formNameLayer', ['$controller', '$log', 'GeoServer', '$rootScope',
    function ($controller, $log, GeoServer, $rootScope) {
      return {
        restrict: 'EA',
        scope: {
          label: '=',
          form: '=',
          model: '='
        },
        templateUrl: '/components/modalform/modal.form.name.layer.tpl.html',
        replace: true,
        controller: function($scope, $element) {
          angular.extend(this, $controller('ModalCtrl', {$scope: $scope}));

          $scope.setInvalid = function(invalid) {
            $scope.form.layerName.invalid = invalid;
          }

          $scope.$watch('form.layerName', function(newVal) {
            if (newVal != null && $scope.form.layerName) {
              $scope.setInvalid($scope.form.layerName.$dirty && 
                ($scope.form.layerName.$error.required || 
                  $scope.$scope.form.layerName.$error.pattern || 
                  $scope.form.layerName.$error.maxlength));
            }
          });
        }
      };
    }])
.directive('formNameMap', ['$controller', '$log', 'GeoServer', '$rootScope',
    function ($controller, $log, GeoServer, $rootScope) {
      return {
        restrict: 'EA',
        scope: {
          label: '=',
          form: '=',
          model: '='
        },
        templateUrl: '/components/modalform/modal.form.name.map.tpl.html',
        replace: true,
        controller: function($scope, $element) {
          angular.extend(this, $controller('ModalCtrl', {$scope: $scope}));

          $scope.setInvalid = function(invalid) {
            $scope.form.mapName.invalid = invalid;
          }

          $scope.$watch('form.mapName', function(newVal) {
            if (newVal != null && $scope.form.mapName) {
              $scope.setInvalid($scope.form.mapName.$dirty && 
                ($scope.form.mapName.$error.required || 
                  $scope.$scope.form.mapName.$error.pattern || 
                  $scope.form.mapName.$error.maxlength));
            }
          });
        }
      };
    }])
.directive('formNameWorkspace', ['$controller', '$log', 'GeoServer', '$rootScope',
    function ($controller, $log, GeoServer, $rootScope) {
      return {
        restrict: 'EA',
        scope: {
          label: '=',
          form: '=',
          model: '='
        },
        templateUrl: '/components/modalform/modal.form.name.ws.tpl.html',
        replace: true,
        controller: function($scope, $element) {
          angular.extend(this, $controller('ModalCtrl', {$scope: $scope}));

          $scope.setInvalid = function(invalid) {
            $scope.form.workspaceName.invalid = invalid;
          }

          $scope.$watch('form.workspaceName', function(newVal) {
            if (newVal != null && $scope.form.workspaceName) {
              $scope.setInvalid($scope.form.workspaceName.$dirty && 
                ($scope.form.workspaceName.$error.required || 
                  $scope.$scope.form.workspaceName.$error.pattern || 
                  $scope.form.workspaceName.$error.maxlength));
            }
          });
        }
      };
    }])
.directive('formCrs', ['$controller', '$log', 'GeoServer', '$rootScope',
    function ($controller, $log, GeoServer, $rootScope) {
      return {
        restrict: 'EA',
        scope: {
          label: '=',
          form: '=',
          model: '='
        },
        templateUrl: '/components/modalform/modal.form.crs.tpl.html',
        replace: true,
        controller: function($scope, $element) {
          angular.extend(this, $controller('ModalCtrl', {$scope: $scope}));

          $scope.setInvalid = function(invalid) {
            $scope.form.crs.invalid = invalid;
          }

          $scope.$watch('form.crs', function(newVal) {
            if (newVal != null && $scope.form.proj && $scope.form.crs) {
              $scope.setInvalid($scope.form.crs.$dirty && 
                ($scope.form.proj.srs.$error.required || 
                  $scope.form.crs.$error.pattern || 
                  $scope.form.crs.$error.required));
            }
          });
        }
      };
    }])
.directive('formTitle', ['$log', 'GeoServer', '$rootScope',
    function ($log, GeoServer, $rootScope) {
      return {
        restrict: 'EA',
        scope: {
          label: '=',
          form: '=',
          model: '='
        },
        templateUrl: '/components/modalform/modal.form.title.tpl.html',
        replace: true,
      };
    }])
.directive('formDescription', ['$log', 'GeoServer', '$rootScope',
    function ($log, GeoServer, $rootScope) {
      return {
        restrict: 'EA',
        scope: {
          label: '=',
          form: '=',
          model: '='
        },
        templateUrl: '/components/modalform/modal.form.description.tpl.html',
        replace: true,
      };
    }]);