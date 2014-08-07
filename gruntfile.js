var fs = require('fs');
var path = require('path');
var url = require('url');

var config = {
  proxy: {
    host: 'localhost',
    port: '8080'
  }
};

var sources = {
  js: ['app/**/*.js', '!app/**/*.spec.js', '!app/loader.js'],
  less: 'app/**/*.less',
  test: 'app/**/*.spec.js',
  tpl: 'app/**/*.tpl.html'
};

var vendorDeps = [
  'openlayers/ol.js'
].map(function(dep) {
  return 'vendor/' + dep;
});

var bowerDeps = [
  'jquery/dist/jquery.min.js',
  'codemirror/lib/codemirror.js',
  'codemirror/mode/xml/xml.js',
  'codemirror/addon/hint/show-hint.js',
  'codemirror/addon/hint/xml-hint.js',
  'angular/angular.js',
  'angular-resource/angular-resource.js',
  'angular-bootstrap/ui-bootstrap.js',
  'angular-sanitize/angular-sanitize.js',
  'angular-grid/build/ng-grid.js', 
  'angular-ui-router/release/angular-ui-router.js',
  'angular-ui-select/dist/select.js',
  'angular-ui-select/dist/select.js',
  'angular-ui-codemirror/ui-codemirror.js'
].map(function(dep) {
  return 'bower_components/'+dep;
});

var dependencies = [].concat(vendorDeps).concat(bowerDeps);

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('./package.json'),
    connect: {
      server: {
        options: {
          port: 8000,
          base: [
            path.join(__dirname, 'build'),
            path.join(__dirname, 'app'),
            __dirname
          ],
          livereload: true,
          middleware: function(connect, options) {
            var middlewares = [];

            // proxy
            middlewares.push(require('grunt-connect-proxy/lib/utils').proxyRequest);

            // debug script loader
            middlewares.push(function(req, res, next) {
              var parts = url.parse(req.url);
              var loaderUrl = '/geoserver.min.js';
              if (parts.pathname.substr(-loaderUrl.length) === loaderUrl) {
                var template = path.join(__dirname, 'app', 'loader.js');
                fs.readFile(template, 'utf8', function(err, string) {
                  if (err) {
                    return next(err);
                  }
                  var scripts = grunt.file.expand(dependencies.concat(sources.js))
                      .map(function(script) {
                        return '/' + script.split(path.sep).join('/');
                      });
                  res.setHeader('content-type', 'application/javascript');
                  var body = string.replace('{{{ paths }}}', JSON.stringify(scripts));
                  res.end(body, 'utf8');
                });
              } else {
                next();
              }
            });

            // static files.
            options.base.forEach(function(base) {
              middlewares.push(connect.static(base));
            });

            // directory browsable
            var directory = options.directory || options.base[options.base.length - 1];
            middlewares.push(connect.directory(directory));

            return middlewares;
          }
        },
        proxies: [{
          context: '/geoserver/',
          host: config.proxy.host,
          port: config.proxy.port
        }]
      }
    },
    jshint: {
      options: {
        jshintrc: true
      },
      js: sources.js,
      test: sources.tests
    },
    less: {
      build: {
        cleancss: true,
        files: {
          'build/geoserver.css': [sources.less]
        }
      }
    },
    copy: {
      index: {
        expand: true,
        cwd: 'app/',
        src: 'index.html',
        dest: 'build/'
      }, 
      fonts: {
        files: [{
          expand: true,
          cwd: 'bower_components/bootstrap/fonts',
          dest: 'build/fonts',
          src: ['**']
        }, {
          expand: true,
          cwd: 'bower_components/open-sans-fontface',
          dest: 'build/fonts/open-sans',
          src: ['fonts/**/*', 'open-sans.css'],
          filter: 'isFile'
        }]
        
        // bootstrap: [{
          
        // }], 
        // sans: [{
        
        // }] 
      }
    },
    ngmin: {
      dist: {
        src: sources.js,
        dest: 'build/geoserver.js'
      }
    },
    html2js: {
      all: {
        options: {
          base: 'app',
          module: 'gsApp.templates',
          fileFooterString: 'angular.module("gsApp").requires.push("gsApp.templates");'
        },
        src: sources.tpl,
        dest: 'build/templates.js'
      }
    },
    uglify: {
       dist: {
         files: {
            'build/geoserver.min.js': dependencies.concat('build/geoserver.js', 'build/templates.js')
         }
       }
    },
    concat: {
      dist: {
        src: dependencies.concat('build/geoserver.js', 'build/templates.js'),
        dest: 'build/geoserver.debug.js'
      }
    },
    watch: {
      index: {
        files: ['app/index.html'],
        tasks: ['copy'],
        options: {
          livereload: true
        }
      }, 
      less: {
        files: sources.less,
        tasks: ['less'],
        options: {
          livereload: true
        }
      },
      js: {
        files: sources.js,
        //tasks: ['jshint:src', 'karma:dev:run'],
        tasks: ['jshint:js'],
        options: {
          livereload: true
        }
      },
      tpl: {
        files: sources.tpl,
        tasks: ['html2js:all']
      },
      test: {
        files: sources.test,
        //tasks: ['jshint:spec', 'karma:dev:run']
      }
    },
    clean: {
      build: {
        src: 'build/'
      }
    }
  });

  // plugins
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-connect-proxy');
  grunt.loadNpmTasks('grunt-ngmin');
  grunt.loadNpmTasks('grunt-html2js');

  // tasks
  grunt.registerTask('build', [
    'copy', 'less', 'ngmin', 'html2js', 'concat', 'uglify']);
  grunt.registerTask('start', [
    'less', 'configureProxies:server','connect', 'watch']);
};
