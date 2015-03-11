var fs = require('fs');
var path = require('path');
var url = require('url');
var _ = require('lodash');
var glob = require('glob');
var gulp = require('gulp');

var concat = require('gulp-concat');
var flatten = require('gulp-flatten');
var jshint = require('gulp-jshint');
var less = require('gulp-less');
var ngAnnotate = require('gulp-ng-annotate');
var ngTemplateCache = require('gulp-angular-templatecache');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var connect = require('gulp-connect');
var proxy = require('gulp-connect-proxy');

function loadProxyConfig() {
  return fs.existsSync('./proxy.json') ? require('./proxy.json') :
    {host: 'horizon.boundlessgeo.com', port: 80};
}

var config = {
  proxy: loadProxyConfig()
};

var sources = {
  js: ['app/**/*.js', '!app/**/*.spec.js', '!app/loader.js'],
  less: 'app/**/*.less',
  test: 'app/**/*.spec.js',
  tpl: 'app/**/*.tpl.html'
};

var deps = {
  ol: [
    'vendor/openlayers/ol.js',
  ],
  codemirror: [
    'bower_components/codemirror/lib/codemirror.js',
    'bower_components/codemirror/mode/yaml/yaml.js',
    'bower_components/codemirror/addon/hint/show-hint.js',
    'bower_components/codemirror/addon/selection/active-line.js',
    'bower_components/codemirror/addon/fold/foldcode.js',
    'bower_components/codemirror/addon/fold/foldgutter.js',
    'bower_components/codemirror/addon/fold/indent-fold.js'
  ],
  js: [
    'bower_components/jquery/dist/jquery.js',
    'bower_components/jquery-ui/ui/core.js',
    'bower_components/jquery-ui/ui/widget.js',
    'bower_components/jquery-ui/ui/mouse.js',
    'bower_components/jquery-ui/ui/sortable.js',
    'bower_components/js-yaml/dist/js-yaml.js',
    'bower_components/zeroclipboard/dist/ZeroClipboard.js',
    'bower_components/spectrum/spectrum.js',
    'bower_components/angular/angular.js',
    'bower_components/angular-resource/angular-resource.js',
    'bower_components/angular-bootstrap/ui-bootstrap.js',
    'bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
    'bower_components/angular-animate/angular-animate.js',
    'bower_components/angular-sanitize/angular-sanitize.js',
    'bower_components/angular-grid/build/ng-grid.js',
    'bower_components/angular-ui-router/release/angular-ui-router.js',
    'bower_components/angular-ui-select/dist/select.js',
    'bower_components/angular-ui-codemirror/ui-codemirror.js',
    'bower_components/angular-ui-sortable/sortable.js',
    'bower_components/ng-file-upload/angular-file-upload-shim.js',
    'bower_components/ng-file-upload/angular-file-upload.js',
    'bower_components/ng-clip/src/ngClip.js',
    'bower_components/ng-lodash/build/ng-lodash.js',
    'bower_components/proj4/dist/proj4.js',
    'bower_components/angular-ui-utils/scrollfix.js',
    'bower_components/moment/moment.js',
    'bower_components/angular-moment/angular-moment.js'
  ],

  less: [
    'bower_components/bootstrap/less/bootstrap.less'
  ],

  icon: [
    'bower_components/icomoon/dist/**/*',
  ],

  font: [
    'bower_components/font-awesome/fonts/*',
    'bower_components/open-sans-fontface/fonts/**/*',
  ]
};

var prefixDeps = function(deps) {
  return deps.map(function(dep) {
    return dep.indexOf('/') === 0 ? dep.substring(1) : 'bower_components/'+dep;
  });
};

gulp.task('copy-index', function() {
  return gulp.src(['app/index.html'])
          .pipe(gulp.dest('build'));
});

gulp.task('copy-fonts', function() {
  return gulp.src(deps.font)
          .pipe(gulp.dest('build/assets/fonts'));
});

gulp.task('copy-icomoon', function() {
  return gulp.src(deps.icon)
          .pipe(gulp.dest('build/assets/icomoon'));
});

gulp.task('copy-images', function() {
  return gulp.src('images/**/*', {base: 'app'})
          .pipe(gulp.dest('build/assets'));
});

gulp.task('copy-ol', function() {
  return gulp.src(deps.ol)
          .pipe(gulp.dest('build'));
});

gulp.task('less', function() {
  return gulp.src(sources.less)
    .pipe(less())
    .pipe(concat('geoserver.css'))
    .pipe(gulp.dest('build'));
});

gulp.task('lint', function() {
  return gulp.src(['app/**/*.js', '*.js'])
    .pipe(jshint());
});

gulp.task('templates', function() {
  return gulp.src(sources.tpl)
    .pipe(ngTemplateCache({
      module: 'gsApp.templates',
      base: function(file) {
        return file.path.replace(__dirname + '/app', '/');
      },
      standalone: true
    }))
    .pipe(gulp.dest('build'));
});

gulp.task('concat', ['templates'], function() {
 return gulp.src(deps.js.concat(sources.js, 'templates.js'))
  .pipe(concat('geoserver.js'))
  .pipe(gulp.dest('build'));
});

gulp.task('minify', ['concat'], function() {
  return gulp.src('build/geoserver.js')
    .pipe(rename('geoserver.min.js'))
    .pipe(uglify({mangle: false}))
    .pipe(gulp.dest('build'));
});

gulp.task('codemirror', function() {
  return gulp.src(deps.codemirror)
    .pipe(concat('codemirror.js'))
    .pipe(gulp.dest('build'))
    .pipe(rename('codemirror.min.js'))
    .pipe(uglify({mangle: false}))
    .pipe(gulp.dest('build'));
});


function scriptloader(req, res, next) {
  var parts = url.parse(req.url);
  if (_.endsWith(parts.pathname, '/geoserver.min.js')) {
    var template = path.join(__dirname, 'app', 'loader.js');
    fs.readFile(template, 'utf8', function(err, string) {
      if (err) {
        return next(err);
      }

      var scripts = sources.js
        .reduce(function expandGlobs(a, b) {
          return a.concat(glob.sync(b));
        }, [])
        .map(function(script) {
          return '/' + script.split(path.sep).join('/');
        });

      scripts = deps.js.concat(scripts);
      res.setHeader('content-type', 'application/javascript');
      var body = string.replace('{{{ paths }}}', JSON.stringify(scripts));
      res.end(body, 'utf8');

    });
  }
  else {
    next();
  }
}

gulp.task('serve', function() {
  return connect.server({
    port: 8000,
    base: [
      path.join(__dirname, 'build'),
      path.join(__dirname, 'app'),
      __dirname
    ],
    middleware: function(connect, opt) {
      var middlewares = [];

      opt.route = '/geoserver/'
      middlewares.push(new proxy(opt));
      middlewares.push(scriptloader);
      opt.base.forEach(function(base) {
        middlewares.push(connect.static(base));
      });

      return middlewares;
    }
  });
});

gulp.task('copy', ['copy-index', 'copy-fonts', 'copy-icomoon', 'copy-images', 'copy-ol']);
gulp.task('build', ['copy', 'less', 'codemirror', 'minify']);

