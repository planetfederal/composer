/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 * License: BSD
 */
angular.module('gsApp.styleditor.ysldhinter', [])
.factory('YsldHinter', ['$log',
    function($log) {
      var YsldHinter = function() {
        var scalar = function(name, state, cm) {
          return name + ': ';
        };

        var tuple = scalar;

        var vardef = function(name, state, cm) {
          return name + ': &';
        }

        var mapping = function(name, state, cm) {
          var indent = state.indent + cm.getOption('indentUnit');
          return name+':\n'+ new Array(indent+1).join(' ');
        };

        var sequence = function(name, state, cm) {
          var pos = cm.getCursor();
          var indent = pos.ch;
          return name+':\n'+ new Array(indent+1).join(' ') + '- ';
        };

        //Determines the behavior of key completion
        this.completions = {
          'define': vardef,
          'grid': mapping,
          'name': scalar,
          'title': scalar,
          'abstract': scalar,
          'transform': mapping,
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
          'geometry': scalar,
          'uom': scalar,
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
          'stroke-graphic': mapping,
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
          'shape': scalar,
          'external': mapping,
          'url': scalar,
          'format': scalar,
          'type': scalar,
          'halo': mapping,
          'radius': scalar,
          'params': mapping,
          'x-FirstMatch': scalar,
          'x-composite': scalar,
          'x-composite-base': scalar,
          'x-labelObstacle': scalar,
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
          'x-spaceAround': scalar,
          'x-random': scalar,
          'x-random-tile-size': scalar,
          'x-random-rotation': scalar,
          'x-random-symbol-count': scalar,
          'x-random-seed': scalar
        };

        //Mappings between parent and child keys
        this.mappings = {
          '': ['define', 'grid', 'name', 'title', 'abstract', 'feature-styles'],
          'feature-styles': [
            'name',
            'title',
            'abstract',
            'transform',
            'rules',
            'x-FirstMatch',
            'x-composite',
            'x-composite-base'
          ],
          'rules': [
            'name',
            'title',
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
            'options',
            'geometry',
            'uom',
            'x-labelObstacle'
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
            'stroke-graphic',
            'offset',
            'geometry',
            'uom',
            'x-labelObstacle'
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
            'stroke-graphic',
            'offset',
            'displacement',
            'geometry',
            'uom',
            'x-labelObstacle'
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
          'stroke-graphic-fill': [
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
          'stroke-graphic': [
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
          'fill-graphic': [
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
            'stroke-graphic'
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
          ],
          'grid': [
            'name'
          ],
          'transform': [
            'name',
            'params',
          ],
        };

        //Completion function for attribute values
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

        var bool = ['true', 'false'];
        var mappingValues = {
          'else':bool,
          'uom':[
            'pixel',
            'metre',
            'foot'
          ],
          'shape':[
            'square',
            'circle',
            'triangle',
            'cross',
            'x',
            'star'
          ],
          'stroke-linejoin':[
            'mitre',
            'round',
            'bevel'
          ],
          'stroke-linecap':[
            'butt',
            'round',
            'square'
          ],
          'format':[
            'image/gif',
            'image/jpeg',
            'image/png',
            'image/bmp',
            'image/svg+xml',
            'image/tiff',
          ],
          'font-style':[
            'normal',
            'italic',
            'oblique'
          ],
          'font-weight':[
            'normal',
            'bold'
          ],
          'placement':[
            'point',
            'line'
          ],
          'type':[
            'ramp',
            'interval',
            'values'
          ],
          'mode':[
            'normalize',
            'histogram'
          ],
          'x-FirstMatch':bool,
          'x-composite':[
            'copy',
            'destination',
            'source-over',
            'destination-over',
            'source-in',
            'destination-in',
            'source-out',
            'destination-out',
            'source-atop',
            'destination-atop',
            'xor',
            'multiply',
            'screen',
            'overlay',
            'darken',
            'lighten',
            'color-dodge',
            'color-burn',
            'hard-light',
            'soft-light',
            'difference',
            'exclusion'
          ],
          'x-composite-base':bool,
          'x-labelObstacle':bool,
          'x-allowOverruns': bool,
          'x-conflictResolution': bool,
          'x-followLine': bool,
          'x-forceLeftToRight': bool,
          'x-graphic-resize':[
            'none',
            'proportional',
            'stretch'
          ],
          'x-group': bool,
          'x-labelAllGroup': bool,
          'x-partials': bool,
          'x-polygonAlign': bool,
          'x-random':[
            'free',
            'grid'
          ],
          'x-random-rotation':[
            'none',
            'free'
          ]

        };
        //Completion function for mapped values
        var mappingValue = function(state, cm) {
          var values = mappingValues[state.line.key];

          if (state.line.val.length > 0) {
              // filter out values based on content of line
              values = values.filter(function(value) {
                return value.indexOf(state.line.val) == 0;
              });
          }

          return values.map(function(value) {
              var text = value;
              if (state.line.val.length > 0) {
                // strip off the current element prefix to complete only
                // the rest
                text = text.replace(new RegExp('^'+state.line.val), '');
              }

              return {displayText: value, text: text};
            }).filter(function(value) {
              return value != null;
            });
        };

        var color = function(state, cm) {};
        var icon = function(state, cm) {};
        var font = function(state, cm) {};

        //Constructs a function to display a hint/template for a value
        //The first argument is a string value. Any parts enclosed in <> 
        //are treated as user data. The dialog will display this data in light gray, 
        //and will not insert anything for these parts during autocomplete
        var hint = function(hint) {
          //Split hint on user data '<...>'
          var tokens = hint.split(/<\w*>/g).filter(function(val) {
            return val.length > 0;
          });
          return function(state, cm) {
            //
            var display = hint.replace(/</g,'&lt');
            display = display.replace(/>/g,'&gt');
            display = display.replace(/&lt/g, '<font style="color:gray">&lt');
            display = display.replace(/&gt/g, '&gt</font>');

            var text = '';
            
            if (tokens && tokens.length > 0) {
              text = tokens[0];

              //If there is a partial value, iterate through it 
              //and determine what we should add, if anything
              if (state.line.val.length > 0) {
                text = '';
                if (state.line.val.indexOf(tokens[0] == 0) && state.line.val.length > tokens[0].length) {
                  var index = 0;
                  var lastIndex = 0;
                  for (var i = 1; i < tokens.length; i++) {
                    index = state.line.val.indexOf(tokens[i])
                    //Current token exists
                    if (index > lastIndex) {
                      //If there is already a token at the end of
                      //val, don't add anything
                      if (index == state.line.val.length-1) {
                        text = '';
                        break;
                      }
                      //keep looking
                      lastIndex = index;
                    } else {
                      //not found, use the current token
                      text = tokens[i];
                      break;
                    }
                  }
                } 
              }
            }
            
            return [{displayText: display, text: text,
              render: function(Element, self, data) {
                Element.innerHTML = data.displayText;
                //Hide element selection for hints
                Element.style.color='black';
                Element.style.backgroundColor='transparent';
              }
              //Return an extra item to override completeSingle: false
            }, {text: text, render: function() {}}];
          };
        };

        var hintNumber = hint('<number>');
        var hintText = hint('<text>');


        //Controls the behaviour of value completions
        this.values = {
          'name':hintText,
          'title':hintText,
          'abstract':hintText,
          'filter':hint('${<filter>}'),
          'else':mappingValue,
          'scale':hint('(<min>,<max>)'),
          'zoom':hint('(<min>,<max>)'),
          'label':completeAttribute,
          'priority':completeAttribute,
          'geometry':completeAttribute,
          'uom':mappingValue,
          'shape':mappingValue,
          'size':hintNumber,
          'anchor':hint('(<x>,<y>)'),
          'opacity':hintNumber,
          'rotation':hintNumber,
          'fill-color':color,
          'fill-opacity':hintNumber,
          'stroke-color':color,
          'stroke-width': hintNumber,
          'stroke-opacity': hintNumber,
          'stroke-linejoin':mappingValue,
          'stroke-linecap':mappingValue,
          'stroke-dasharray': hint('"<length> <gap>"'),
          'stroke-dashoffset': hintNumber,
          'offset': hintNumber,
          'displacement':hint('(<x>,<y>)'),
          'url':icon,
          'format':mappingValue,
          'font-family':font,
          'font-style':mappingValue,
          'font-weight':mappingValue,
          'placement':mappingValue,
          'radius':hintNumber,
          'type':mappingValue,
          'mode':mappingValue,
          'gamma':hintNumber,
          'gray':hintNumber,
          'red':hintNumber,
          'green':hintNumber,
          'blue':hintNumber,

          'x-FirstMatch':mappingValue,
          'x-composite':mappingValue,
          'x-composite-base':mappingValue,
          'x-labelObstacle':mappingValue,
          'x-allowOverruns':mappingValue,
          'x-autoWrap': hintNumber,
          'x-conflictResolution':mappingValue,
          'x-followLine':mappingValue,
          'x-forceLeftToRight':mappingValue,
          'x-goodnessOfFit':hintNumber,
          'x-graphic-margin':hintNumber,
          'x-graphic-resize':mappingValue,
          'x-group':mappingValue,
          'x-labelAllGroup':mappingValue,
          'x-labelPriority':hintNumber,
          'x-repeat':hintNumber,
          'x-maxAngleDelta':hintNumber,
          'x-maxDisplacement':hintNumber,
          'x-minGroupDistance':hintNumber,
          'x-partials':mappingValue,
          'x-polygonAlign':mappingValue,
          'x-spaceAround':hintNumber,
          'x-random':mappingValue,
          'x-random-tile-size':hintNumber,
          'x-random-rotation':mappingValue,
          'x-random-symbol-count':hintNumber,
          'x-random-seed':hintNumber
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

        var parentLine = this.findParent(cm);
        if (parentLine != null) {
          state.parent = {
            line: parentLine,
            indent: this.indent(parentLine.raw)
          };

          hints = this.lookupHints(state, cm);
        } else {
          state.parent = {
            line: {key: '', val: ''},
            indent: 0
          };
          hints = this.lookupHints(state, cm);
        }

        return {list:hints, from:cm.getCursor()};
      };

      return new YsldHinter();
    }]);
