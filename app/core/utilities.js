/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/**
 * Module for reusable utitlies.
 */
 // http://goo.gl/huaMt1
angular.module('gsApp.core.utilities', [])
.directive('httpPrefix', function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, controller) {
      function ensureHttpPrefix(value) {
        // Need to add prefix if we don't have http:// prefix already
        if (value && !/^(https?):\/\//i.test(value) &&
            'http://'.indexOf(value) === -1) {
          controller.$setViewValue('http://' + value);
          controller.$render();
          return 'http://' + value;
        } else {
          return value;
        }
      }
      controller.$formatters.push(ensureHttpPrefix);
      controller.$parsers.splice(0, 0, ensureHttpPrefix);
    }
  };
})
.directive('popoverHtmlUnsafePopup', function () {
  return {
    restrict: 'EA',
    replace: true,
    scope: { title: '@',
    content: '@',
    placement: '@',
    animation: '&',
    isOpen: '&' },
    templateUrl: '/core/modals/popover-html-unsafe.tpl.html',
  };
})
.directive('popoverHtmlUnsafe', [ '$tooltip', function ($tooltip) {
  return $tooltip('popoverHtmlUnsafe', 'popover', 'click');
}])
/*
 * Filter below partitions data into columns
 */
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
})
/*
 * Filter below trims a long line
 * Adapted from http://goo.gl/GHr4ZN
 */
.filter('truncate', function () {
  return function (value, byword, max, tailEnd, tail) {
    if (!value) {
      return '';
    }
    max = parseInt(max, 10);
    if (!max) {
      return value;
    }
    if (value.length <= max) {
      return value;
    }
    var newValue = value.substr(0, max);
    if (byword) {
      var lastspace = newValue.lastIndexOf(' ');
      if (lastspace != -1) {
        newValue = newValue.substr(0, lastspace);
      }
    }
    if (tailEnd) { // include tail end of string
      var lastSlash = value.lastIndexOf('/');
      if (lastSlash != -1) {
        tail = value.substring(lastSlash);
      }
    }
    if (!tail) {
      tail = '';
    }
    return newValue + ' … ' + tail;
  };
})
.directive('popPopup', function () {
  return {
    restrict: 'EA',
    replace: true,
    scope: {
      title: '@',
      content: '@',
      placement: '@',
      animation: '&',
      isOpen: '&'
    },
    templateUrl: 'template/popover/popover.html'
  };
})
.directive('pop', function($tooltip, $timeout) {
  var tooltip = $tooltip('pop', 'pop', 'event');
  var compile = angular.copy(tooltip.compile);
  tooltip.compile = function (element, attrs) {
    var parentCompile = compile(element, attrs);
    return function(scope, element, attrs ) {
      var first = true;
      attrs.$observe('popShow', function (val) {
        if (JSON.parse(!first || val || false)) {
          $timeout(function () {
            element.triggerHandler('event');
          });
        }
        first = false;
      });
      parentCompile(scope, element, attrs);
    };
  };
  return tooltip;
})
.filter('bytesize', function() {
  return function(bytes) {
    if (bytes == null || bytes == 0) {
      return '0 Byte';
    }
    var k = 1000;
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
  };
})
.filter('firstCaps', function() {
  return function(str) {
    if (str == null) {
      return null;
    }
    str = str.toLowerCase();
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
})
.directive('focusInit', function($timeout) {
  return {
    restrict: 'A',
    link: function(scope, element) {
      $timeout(function() {
        element[0].focus();
      }, 100);
    }
  };
})
/*
 * Map vs. Editor Resizer bar in composer view
 * Requires function onUpdatePanels() be defined in scope to broadcast
 * update map event.
 */
.directive('resizer', function($document, $window) {
  return function($scope, $element, $attrs) {
    var screenWidth, sideWidth, panelsWidth, rightMin = 0, leftMin = 0;

    $element.on('mousedown', function(event) {
      event.preventDefault();
      $document.on('mousemove', mousemove);
      $document.on('mouseup', mouseup);
      sideWidth = angular.element('#sidebar-wrapper').width();
      screenWidth = $window.innerWidth;
      panelsWidth = screenWidth - sideWidth;
      if ($attrs.rightMin) {
        rightMin = screenWidth - parseInt($attrs.rightMin);
      }
      if ($attrs.leftMin) {
        leftMin = parseInt($attrs.leftMin);
      }
      $element.addClass('active');
    });

    $scope.$watch('fullscreen', function(newVal) {
      if (newVal) {
        lastMapWidth = angular.element('#mapPanel').width();
        lastEditorWidth = angular.element('#editingPanel').width();

        angular.element('#mapPanel').css({
          width: ''
        });
        angular.element('#editingPanel').css({
          width: ''
        });
      } 
    });

    function mousemove(event) {
      event.preventDefault();
      var xPos = event.pageX;

      if (xPos < leftMin) {
        xPos = leftMin;
      }
      if (xPos > rightMin) {
        xPos = rightMin;
      }
      var mapWidth = xPos - sideWidth;
      var editorWidth = screenWidth - xPos;

      angular.element('#mapPanel').css({
        width: 100 * mapWidth/panelsWidth + '%'
      });
      angular.element('#editingPanel').css({
        width: 100 * editorWidth/panelsWidth + '%'
      });
    }
    function mouseup() {
      $element.removeClass('active');
      $document.off('mousemove', mousemove);
      $document.off('mouseup', mouseup);
      $scope.onUpdatePanels();
    }
  };
}).factory('YsldColors', function() {

  //YSLD uses the X11 spec: http://en.wikipedia.org/wiki/X11_color_names
  //Values taken from org.geotools.ysld.Colors
  var namedColors = {
    "aliceblue": "rgb(240,248,255)",
    "yellowgreen": "rgb(154,205,50)",
    "antiquewhite": "rgb(250,235,215)",
    "aqua": "rgb(0,255,255)",
    "aquamarine": "rgb(127,255,212)",
    "azure": "rgb(240,255,255)",
    "beige": "rgb(245,245,220)",
    "bisque": "rgb(255,228,196)",
    "black": "rgb(0,0,0)",
    "blanchedalmond": "rgb(255,235,205)",
    "blue": "rgb(0,0,255)",
    "blueviolet": "rgb(138,43,226)",
    "brown": "rgb(165,42,42)",
    "burlywood": "rgb(222,184,135)",
    "cadetblue": "rgb(95,158,160)",
    "chartreuse": "rgb(127,255,0)",
    "chocolate": "rgb(210,105,30)",
    "coral": "rgb(255,127,80)",
    "cornflowerblue": "rgb(100,149,237)",
    "cornsilk": "rgb(255,248,220)",
    "crimson": "rgb(220,20,60)",
    "cyan": "rgb(0,255,255)",
    "darkblue": "rgb(0,0,139)",
    "darkcyan": "rgb(0,139,139)",
    "darkgoldenrod": "rgb(184,134,11)",
    "darkgray": "rgb(169,169,169)",
    "darkgreen": "rgb(0,100,0)",
    "darkkhaki": "rgb(189,183,107)",
    "darkmagenta": "rgb(139,0,139)",
    "darkolivegreen": "rgb(85,107,47)",
    "darkorange": "rgb(255,140,0)",
    "darkorchid": "rgb(153,50,204)",
    "darkred": "rgb(139,0,0)",
    "darksalmon": "rgb(233,150,122)",
    "darkseagreen": "rgb(143,188,143)",
    "darkslateblue": "rgb(72,61,139)",
    "darkslategray": "rgb(47,79,79)",
    "darkturquoise": "rgb(0,206,209)",
    "darkviolet": "rgb(148,0,211)",
    "deeppink": "rgb(255,20,147)",
    "deepskyblue": "rgb(0,191,255)",
    "dimgray": "rgb(105,105,105)",
    "dodgerblue": "rgb(30,144,255)",
    "firebrick": "rgb(178,34,34)",
    "floralwhite": "rgb(255,250,240)",
    "forestgreen": "rgb(34,139,34)",
    "fuchsia": "rgb(255,0,255)",
    "gainsboro": "rgb(220,220,220)",
    "ghostwhite": "rgb(248,248,255)",
    "gold": "rgb(255,215,0)",
    "goldenrod": "rgb(218,165,32)",
    "gray": "rgb(128,128,128)",
    "green": "rgb(0,128,0)",
    "greenyellow": "rgb(173,255,47)",
    "honeydew": "rgb(240,255,240)",
    "hotpink": "rgb(255,105,180)",
    "indianred": "rgb(205,92,92)",
    "indigo": "rgb(75,0,130)",
    "ivory": "rgb(255,255,240)",
    "khaki": "rgb(240,230,140)",
    "lavender": "rgb(230,230,250)",
    "lavenderblush": "rgb(255,240,245)",
    "lawngreen": "rgb(124,252,0)",
    "lemonchiffon": "rgb(255,250,205)",
    "lightblue": "rgb(173,216,230)",
    "lightcoral": "rgb(240,128,128)",
    "lightcyan": "rgb(224,255,255)",
    "lightgoldenrodyellow": "rgb(250,250,210)",
    "lightgreen": "rgb(144,238,144)",
    "lightgrey": "rgb(211,211,211)",
    "lightpink": "rgb(255,182,193)",
    "lightsalmon": "rgb(255,160,122)",
    "lightseagreen": "rgb(32,178,170)",
    "lightskyblue": "rgb(135,206,250)",
    "lightslategray": "rgb(119,136,153)",
    "lightsteelblue": "rgb(176,196,222)",
    "lightyellow": "rgb(255,255,224)",
    "lime": "rgb(0,255,0)",
    "limegreen": "rgb(50,205,50)",
    "linen": "rgb(250,240,230)",
    "magenta": "rgb(255,0,255)",
    "maroon": "rgb(128,0,0)",
    "mediumaquamarine": "rgb(102,205,170)",
    "mediumblue": "rgb(0,0,205)",
    "mediumorchid": "rgb(186,85,211)",
    "mediumpurple": "rgb(147,112,219)",
    "mediumseagreen": "rgb(60,179,113)",
    "mediumslateblue": "rgb(123,104,238)",
    "mediumspringgreen": "rgb(0,250,154)",
    "mediumturquoise": "rgb(72,209,204)",
    "mediumvioletred": "rgb(199,21,133)",
    "midnightblue": "rgb(25,25,112)",
    "mintcream": "rgb(245,255,250)",
    "mistyrose": "rgb(255,228,225)",
    "moccasin": "rgb(255,228,181)",
    "navajowhite": "rgb(255,222,173)",
    "navy": "rgb(0,0,128)",
    "oldlace": "rgb(253,245,230)",
    "olive": "rgb(128,128,0)",
    "olivedrab": "rgb(107,142,35)",
    "orange": "rgb(255,165,0)",
    "orangered": "rgb(255,69,0)",
    "orchid": "rgb(218,112,214)",
    "palegoldenrod": "rgb(238,232,170)",
    "palegreen": "rgb(152,251,152)",
    "paleturquoise": "rgb(175,238,238)",
    "palevioletred": "rgb(219,112,147)",
    "papayawhip": "rgb(255,239,213)",
    "peachpuff": "rgb(255,218,185)",
    "peru": "rgb(205,133,63)",
    "pink": "rgb(255,192,203)",
    "plum": "rgb(221,160,221)",
    "powderblue": "rgb(176,224,230)",
    "purple": "rgb(128,0,128)",
    "red": "rgb(255,0,0)",
    "rosybrown": "rgb(188,143,143)",
    "royalblue": "rgb(65,105,225)",
    "saddlebrown": "rgb(139,69,19)",
    "salmon": "rgb(250,128,114)",
    "sandybrown": "rgb(244,164,96)",
    "seagreen": "rgb(46,139,87)",
    "seashell": "rgb(255,245,238)",
    "sienna": "rgb(160,82,45)",
    "silver": "rgb(192,192,192)",
    "skyblue": "rgb(135,206,235)",
    "slateblue": "rgb(106,90,205)",
    "slategray": "rgb(112,128,144)",
    "snow": "rgb(255,250,250)",
    "springgreen": "rgb(0,255,127)",
    "steelblue": "rgb(70,130,180)",
    "tan": "rgb(210,180,140)",
    "teal": "rgb(0,128,128)",
    "thistle": "rgb(216,191,216)",
    "tomato": "rgb(255,99,71)",
    "turquoise": "rgb(64,224,208)",
    "violet": "rgb(238,130,238)",
    "wheat": "rgb(245,222,179)",
    "white": "rgb(255,255,255)",
    "whitesmoke": "rgb(245,245,245)",
    "yellow": "rgb(255,255,0)"
  };
  //Values
  var VALUE_PATTERN = /0x([a-f0-9]{6})\b|'\s*#([a-f0-9]{6})\s*'|"\s*#([a-f0-9]{6})\s*"|'\s*([a-f0-9]{6})\s*'|"\s*([a-f0-9]{6})\s*"|'\s*#([a-f0-9]{3})\s*'|"\s*#([a-f0-9]{3})\s*"|'\s*([a-f0-9]{3})\s*'|"\s*([a-f0-9]{3})\s*"|\brgb\(\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*,\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*,\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*\)/i;
  //Values + Names, matches anything that can be decoded
  var COLOR_PATTERN = /0x[a-f0-9]{6}\b|'\s*#[a-f0-9]{6}\s*'|"\s*#[a-f0-9]{6}\s*"|'\s*[a-f0-9]{6}\s*'|"\s*[a-f0-9]{6}\s*"|'\s*#[a-f0-9]{3}\s*'|"\s*#[a-f0-9]{3}\s*"|'\s*[a-f0-9]{3}\s*'|"\s*[a-f0-9]{3}\s*"|\brgb\(\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*,\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*,\s*(?:[0-9]{1,2}|1[0-9]{2}|2[0-4][0-9]|25[0-5])\b\s*\)|aliceblue|yellowgreen|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow/i;
  return {
    decode: function(color) {
      color = color.trim();
      var val = null;
      var match = color.match(VALUE_PATTERN);
      if (match) {
        val = match[0];
        for (var i = 1; i < match.length; i++) {
          if (match[i]) {
            val = '#'+match[i];
            break;
          }
        }
        return val;
      }
      return namedColors[color];
    },
    COLOR_PATTERN: COLOR_PATTERN,
    names: Object.keys(namedColors)
  };
});
