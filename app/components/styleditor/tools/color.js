/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/* global $ */
angular.module('gsApp.styleditor.color', [])
.directive('styleEditorColor', ['$log', 'YsldColors',
    function($log, YsldColors) {
      return {
        restrict: 'EA',
        scope: {
          editor: '=',
        },
        template:
          '<li class="styleditor-color">'+
            '<i class="icon-droplet"></i>'+
            '<span>Color</span>'+
          '</li>',
        replace: true,
        controller: function($scope, $element) {
          $scope.colorPicker = $('.styleditor-color');
          $scope.colorPicker.spectrum({
            showPalette: true,
            showInitial: true,
            hideAfterPaletteSelect: true,
            palette: [],
            beforeShow: function(col) {
              // check selection, if a color initialize the color picker
              var ed = $scope.editor;
              var selection = ed.getSelection();
              if (selection != null) {
                var color = YsldColors.decode(selection);
                if (color != null) {
                  $scope.colorPicker.spectrum('set', color);
                }
              }
              return true;
            },
            change: function(col) {
              $scope.editor.insertOrReplace(("'#"+col.toHex()+"'").toUpperCase());
            }
          });
        }
      };
    }]);
