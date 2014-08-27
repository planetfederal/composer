angular.module('gsApp.styleditor.ysldhinter', [])
.factory('YsldHinter', ['$log',
    function($log) {
      var YsldHinter = function() {
        var scalar = function(name, state, cm) {
          return name + ': ';
        };

        var tuple = scalar;

        var mapping = function(name, state, cm) {
          var indent = state.indent + cm.getOption('indentUnit');
          return name+':\n'+ new Array(indent+1).join(' ');
        };

        var sequence = function(name, state, cm) {
          var pos = cm.getCursor();
          var indent = pos.ch;
          return name+':\n'+ new Array(indent+1).join(' ') + '- ';
        };

        this.completions = {
          'name': scalar,
          'title': scalar,
          'abstract': scalar,
          'feature-styles': sequence,
          'rules': sequence,
          'scale': tuple,
          'filter': scalar,
          'else': scalar,
          'symbolizers': sequence,
          'point': mapping,
          'line': mapping,
          'polygon': mapping,
          'text': mapping,
          'raster': mapping,
          'symbols': sequence,
          'anchor': tuple,
          'displacement': tuple,
          'opacity': scalar,
          'rotation': scalar,
          'size': scalar,
          'gap': scalar,
          'initial-gap': scalar,
          'options': mapping,
          'offset': scalar,
          'stroke-color': scalar,
          'stroke-width': scalar,
          'stroke-opacity': scalar,
          'stroke-linejoin': scalar,
          'stroke-linecap': scalar,
          'stroke-dasharray': scalar,
          'stroke-dashoffset': scalar,
          'stroke-graphic-fill': mapping,
          'stroke-graphic-stroke': mapping,
          'fill-color': scalar,
          'fill-opacity': scalar,
          'fill-graphic': mapping,
          'label': scalar,
          'font-family': scalar,
          'font-size': scalar,
          'font-style': scalar,
          'font-weight': scalar,
          'placement': mapping,
          'color-map': mapping,
          'contrast-enhancement': mapping,
          'mark': mapping,
          'external': mapping,
          'url': scalar,
          'format': scalar,
          'type': scalar,
          'halo': mapping,
          'radius': scalar
        };

        this.mappings = {
          '': ['name', 'title', 'abstract', 'feature-styles'],
          'feature-styles': [
            'name',
            'title',
            'abstract',
            'rules'
          ],
          'rules': [
            'scale',
            'filter',
            'else',
            'symbolizers'
          ],
          'symbolizers': [
            'point',
            'line',
            'polygon',
            'text',
            'raster'
          ],
          'point': [
            'symbols',
            'anchor',
            'displacement',
            'opacity',
            'rotation',
            'size',
            'gap',
            'initial-gap',
            'options'
          ],
          'line': [
            'stroke-color',
            'stroke-width',
            'stroke-opacity',
            'stroke-linejoin',
            'stroke-linecap',
            'stroke-dasharray',
            'stroke-dashoffset',
            'stroke-graphic-fill',
            'stroke-graphic-stroke',
            'offset',
            'options'
          ],
          'polygon': [
            'fill-color',
            'fill-opacity',
            'fill-graphic',
            'stroke-color',
            'stroke-width',
            'stroke-opacity',
            'stroke-linejoin',
            'stroke-linecap',
            'stroke-dasharray',
            'stroke-dashoffset',
            'stroke-graphic-fill',
            'stroke-graphic-stroke',
            'offset',
            'displacement',
            'options'
          ],
          'text': [
            'label',
            'font-family',
            'font-size',
            'font-style',
            'font-weight',
            'halo',
            'placement',
          ],
          'raster': [
            'color-map',
            'opacity',
            'contrast-enhancement',
            'options'
          ],
          'symbols': [
            'mark',
            'external'
          ],
          'mark': [
            'shape',
            'fill-color',
            'fill-opacity',
            'fill-graphic',
            'stroke-color',
            'stroke-width',
            'stroke-opacity',
            'stroke-linejoin',
            'stroke-linecap',
            'stroke-dasharray',
            'stroke-dashoffset',
            'stroke-graphic-fill',
            'stroke-graphic-stroke'
          ],
          'external': [
            'url',
            'format'
          ],
          'placement': [
            'type',
            'offset',
            'anchor',
            'displacement',
            'rotation'
          ],
          'halo': [
            'fill-color',
            'fill-opacity',
            'fill-graphic',
            'radius'
          ]
        };
      };

      YsldHinter.prototype.strip = function(line) {
        return line.replace(/^[ -]*/,'').replace(/:.*/,'')
          .replace(/ *#.*/g, '');
      };

      YsldHinter.prototype.indent = function(line) {
        for (var i = 0; i < line.length; i++) {
          if (line[i] != ' ' && line[i] != '-') {
            return i;
          }
        }
        return -1;
      };

      YsldHinter.prototype.findParent = function(cm) {
        var i = cm.getCursor().line;
        // var indent = cm.getCursor().ch;
        var indent = this.indent(cm.getLine(i));
        indent = indent > -1 ? indent : cm.getCursor().ch;
        while (i > 0) {
          i--;
          var line = cm.getLine(i);

          if (this.indent(line) < indent && this.strip(line) != '') {
            return line;
          }
        }
      };

      YsldHinter.prototype.lookupHints = function(state, cm) {
        var self = this;
        if (state.parent.line in this.mappings) {
          var children = this.mappings[state.parent.line];
          if (children != null) {
            if (state.line.length > 0) {
              // filter out children based on content of line
              children = children.filter(function(child) {
                return child.indexOf(state.line) == 0;
              });
            }

            return children.map(function(child) {
              var complete = self.completions[child];
              var text = complete ? complete(child, state, cm) : child;
              if (state.line.length > 0) {
                text = text.replace(new RegExp('^'+state.line), '');
              }
              return {displayText: child, text: text};
            });
            
          }
        }
        return [];
      };

      YsldHinter.prototype.hints = function(cm, options) {
        var hints = [];
        var cursor = cm.getCursor();

        var line = cm.getLine(cursor.line);
        var state = {
          line: this.strip(line),
          indent: this.indent(line)
        };

        if (cursor.ch == 0) {
          state.parent = {
            line: '',
            indent: 0
          };
          hints = this.lookupHints(state, cm);
        }
        else {
          var parentLine = this.findParent(cm);
          if (parentLine != null) {
            state.parent = {
              line: this.strip(parentLine),
              indent: this.indent(parentLine)
            };
            
            hints = this.lookupHints(state, cm);
          }
        }

        return {list:hints, from:cm.getCursor()};
      };

      return new YsldHinter();
    }]);