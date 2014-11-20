/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
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
          'zoom': tuple,
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
          'priority': scalar,
          'placement': mapping,
          'color-map': mapping,
          'contrast-enhancement': mapping,
          'mark': mapping,
          'external': mapping,
          'url': scalar,
          'format': scalar,
          'type': scalar,
          'halo': mapping,
          'radius': scalar,
          'x-allowOverruns': scalar,
          'x-autoWrap': scalar,
          'x-conflictResolution': scalar,
          'x-followLine': scalar,
          'x-forceLeftToRight': scalar,
          'x-goodnessOfFit': scalar,
          'x-graphic-margin': scalar,
          'x-graphic-resize': scalar,
          'x-group': scalar,
          'x-labelAllGroup': scalar,
          'x-repeat': scalar,
          'x-maxAngleDelta': scalar,
          'x-maxDisplacement': scalar,
          'x-minGroupDistance': scalar,
          'x-partials': scalar,
          'x-polygonAlign': scalar,
          'x-spaceAround': scalar
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
            'zoom',
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
            'priority',
            'placement',
            'x-allowOverruns',
            'x-autoWrap',
            'x-conflictResolution',
            'x-followLine',
            'x-forceLeftToRight',
            'x-goodnessOfFit',
            'x-graphic-margin',
            'x-graphic-resize',
            'x-group',
            'x-labelAllGroup',
            'x-repeat',
            'x-maxAngleDelta',
            'x-maxDisplacement',
            'x-minGroupDistance',
            'x-partials',
            'x-polygonAlign',
            'x-spaceAround'
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

        var completeAttribute = function(state, cm) {
          var atts = state.options.layer.schema.attributes;

          // filter by current value
          var line = state.line;
          if (line.val && line.val.length > 0) {
            atts = atts.filter(function(att) {
              return att.name.indexOf(line.val) == 0;
            });
          }

          return atts.map(function(att) {
            //text = text.replace(new RegExp('^'+state.line.key), '');
            return {displayText: att.name, text: '${' + att.name + '}'};
          });
        };

        this.values = {
          'label': completeAttribute,
          'priority': completeAttribute
        };
      };

      YsldHinter.prototype.parseLine = function(line) {
        // preparse, remove sequence '-'
        var pre = line.replace(/^[ -]*/,'');

        // ignore any comments
        pre = pre.replace(/ *#.*/g, '');

        // split into key / value
        return {
          raw: line,
          key: pre.replace(/:.*/,''),
          val: pre.replace(/.*:/,'').trim()
        };
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
          var line = this.parseLine(cm.getLine(i));

          if (this.indent(line.raw) < indent && line.key != '') {
            return line;
          }
        }
      };

      YsldHinter.prototype.lookupHints = function(state, cm) {
        var self = this;
        if (state.parent.line.key in this.mappings) {
          var children = this.mappings[state.parent.line.key];
          if (children != null) {
            if (state.line.key.length > 0) {
              // filter out children based on content of line
              children = children.filter(function(child) {
                return child.indexOf(state.line.key) == 0;
              });
            }

            if (children.length == 1 && children[0] == state.line.key) {
              // look for a value mapping
              var complete = self.values[state.line.key];
              return complete ? complete(state, cm) : [];
            }

            return children.map(function(child) {
              var complete = self.completions[child];
              var text = complete ? complete(child, state, cm) : child;
              if (state.line.key.length > 0) {
                // strip off the current element prefix to complete only
                // the rest
                text = text.replace(new RegExp('^'+state.line.key), '');
              }
              // if (text.match(/^\s*:\s*$/)) {
              //   // full completion, just return null
              //   return null;
              // }

              return {displayText: child, text: text};
            }).filter(function(child) {
              return child != null;
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
          line: this.parseLine(line),
          indent: this.indent(line),
          options: options
        };

        if (cursor.ch == 0) {
          state.parent = {
            line: {key: null, val: null},
            indent: 0
          };
          hints = this.lookupHints(state, cm);
        }
        else {
          var parentLine = this.findParent(cm);
          if (parentLine != null) {
            state.parent = {
              line: parentLine,
              indent: this.indent(parentLine.raw)
            };

            hints = this.lookupHints(state, cm);
          }
        }

        return {list:hints, from:cm.getCursor()};
      };

      return new YsldHinter();
    }]);
