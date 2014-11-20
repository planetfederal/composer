/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
(function(global) {

  var paths = {{{ paths }}};

  for (var i = 0, ii = paths.length; i < ii; ++i) {
    document.write(
      '<script type="text/javascript" src="' + paths[i] + '"></script>');
  }

}(this));

