/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/* global $ */
angular.module('gsApp.styleditor.color', [])
.directive('styleEditorColor', ['$log',
    function($log) {
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
                var match = selection.match(/0x([a-f0-9]{6})\b|'\s*#([a-f0-9]{6})\s*'|"\s*#([a-f0-9]{6})\s*"|'\s*([a-f0-9]{6})\s*'|"\s*([a-f0-9]{6})\s*"|'\s*#([a-f0-9]{3})\s*'|"\s*#([a-f0-9]{3})\s*"|'\s*([a-f0-9]{3})\s*'|"\s*([a-f0-9]{3})\s*"|\brgb\(\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*,\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*,\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*\)|\baliceblue\b|\bantiquewhite\b|\baqua\b|\baquamarine\b|\bazure\b|\bbeige\b|\bbisque\b|\bblack\b|\bblanchedalmond\b|\bblue\b|\bblueviolet\b|\bbrown\b|\bburlywood\b|\bcadetblue\b|\bchartreuse\b|\bchocolate\b|\bcoral\b|\bcornflowerblue\b|\bcornsilk\b|\bcrimson\b|\bcyan\b|\bdarkblue\b|\bdarkcyan\b|\bdarkgoldenrod\b|\bdarkgray\b|\bdarkgreen\b|\bdarkgrey\b|\bdarkkhaki\b|\bdarkmagenta\b|\bdarkolivegreen\b|\bdarkorange\b|\bdarkorchid\b|\bdarkred\b|\bdarksalmon\b|\bdarkseagreen\b|\bdarkslateblue\b|\bdarkslategray\b|\bdarkslategrey\b|\bdarkturquoise\b|\bdarkviolet\b|\bdeeppink\b|\bdeepskyblue\b|\bdimgray\b|\bdimgrey\b|\bdodgerblue\b|\bfirebrick\b|\bfloralwhite\b|\bforestgreen\b|\bfuchsia\b|\bgainsboro\b|\bghostwhite\b|\bgold\b|\bgoldenrod\b|\bgray\b|\bgreen\b|\bgreenyellow\b|\bgrey\b|\bhoneydew\b|\bhotpink\b|\bindianred\b|\bindigo\b|\bivory\b|\bkhaki\b|\blavender\b|\blavenderblush\b|\blawngreen\b|\blemonchiffon\b|\blightblue\b|\blightcoral\b|\blightcyan\b|\blightgoldenrodyellow\b|\blightgray\b|\blightgreen\b|\blightgrey\b|\blightpink\b|\blightsalmon\b|\blightseagreen\b|\blightskyblue\b|\blightslategray\b|\blightslategrey\b|\blightsteelblue\b|\blightyellow\b|\blime\b|\blimegreen\b|\blinen\b|\bmagenta\b|\bmaroon\b|\bmediumaquamarine\b|\bmediumblue\b|\bmediumorchid\b|\bmediumpurple\b|\bmediumseagreen\b|\bmediumslateblue\b|\bmediumspringgreen\b|\bmediumturquoise\b|\bmediumvioletred\b|\bmidnightblue\b|\bmintcream\b|\bmistyrose\b|\bmoccasin\b|\bnavajowhite\b|\bnavy\b|\boldlace\b|\bolive\b|\bolivedrab\b|\borange\b|\borangered\b|\borchid\b|\bpalegoldenrod\b|\bpalegreen\b|\bpaleturquoise\b|\bpalevioletred\b|\bpapayawhip\b|\bpeachpuff\b|\bperu\b|\bpink\b|\bplum\b|\bpowderblue\b|\bpurple\b|\bred\b|\brosybrown\b|\broyalblue\b|\bsaddlebrown\b|\bsalmon\b|\bsandybrown\b|\bseagreen\b|\bseashell\b|\bsienna\b|\bsilver\b|\bskyblue\b|\bslateblue\b|\bslategray\b|\bslategrey\b|\bsnow\b|\bspringgreen\b|\bsteelblue\b|\btan\b|\bteal\b|\bthistle\b|\btomato\b|\bturquoise\b|\bviolet\b|\bwheat\b|\bwhite\b|\bwhitesmoke\b|\byellow\b|\byellowgreen\b/i);
                if (match != null) {
                  var color = match[0];
                  for (var i = 1; i < match.length; i++) {
                    if (match[i]) {
                      color = match[i];
                      break;
                    }
                  }
                  $scope.colorPicker.spectrum('set', color);
                }
              }
              return true;
            },
            change: function(col) {
              $scope.editor.insertOrReplace("'#"+col.toHex()+"'");
            }
          });
        }
      };
    }]);
