/* 
 * (c) 2014 Boundless, http://boundlessgeo.com
 * License: BSD
 */
angular.module('gsApp.styleditor.ysldhinter', [])
.factory('YsldHinter', ['$log', 'YsldColors','GeoServer',
    function($log, YsldColors, GeoServer) {
      var YsldHinter = function() {
        var self = this;
        //Escape strings in regexes
        var escapeForRegExp = function(s) {
          return s.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&');
        };

        var completion = function(text, partial) {
          if (partial && partial.length > 0) {
            return text.replace(new RegExp('^'+escapeForRegExp(partial)), '');
          }
          return text;
        };

        var hint = function(display, text, partial) {
          if (partial) {
            text = completion(text, partial);
          }
          return {displayText:display, text:text};
        }
        this.hint = hint;


        var scalar = function(name, state, cm) {
          return hint(name, name + ': ', state.line.key);
        };

        var tuple = scalar;

        var vardef = function(name, state, cm) {
          return hint(name, name + ': &', state.line.key);
        }
        var varval = function(name, state, cm) {
          return hint(name, name + ': *', state.line.key);
        }

        var mapping = function(name, state, cm) {
          var indent = cm.getOption('indentUnit');
          if (state.indent > -1) {
            indent = indent + state.indent;
          } else if (state.parent.indent != 0 || state.parent.line.key != '') {
            indent = indent + state.parent.indent + cm.getOption('indentUnit');
          }
          return hint(name, name+':\n'+ new Array(indent+1).join(' '), state.line.key);
        };

        var sequence = function(name, state, cm) {
          var pos = cm.getCursor();
          var indent = pos.ch;
          return hint(name, name+':\n'+ new Array(indent+1).join(' ') + '- ', state.line.key);
        };
        
        //Constructs a function to display a hint/template for a value
        //Can take any number of hint templates as arguments. Any parts enclosed in <> 
        //are treated as user data. The dialog will display this data in light gray, 
        //and will not insert anything for these parts during autocomplete
        var hintTemplate = function() {
          var hints = []
          for (var i = 0; i < arguments.length; i++) {
            hints[i] = { hint:arguments[i], 
              tokens: arguments[i].split(/<\w*>/g).filter(function(val) {
                return val.length > 0;
              })};
          }
          return function(state, cm) {
            var values = []
            for (var i = 0; i < hints.length; i++) {
              var hint = hints[i]['hint'];
              var tokens = hints[i]['tokens'];
              var display = hint.replace(/</g,'&lt');
              display = display.replace(/>/g,'&gt');
              display = display.replace(/&lt/g, '<font style="color:silver">&lt');
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
                    for (var j = 1; j < tokens.length; j++) {
                      index = state.line.val.indexOf(tokens[j])
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
                        text = tokens[j];
                        break;
                      }
                    }
                  } 
                }
              }
              values.push({displayText: display, text: text,
              render: function(Element, self, data) {
                Element.innerHTML = data.displayText;
                //Hide element selection for hints
                //Element.style.color='black';
                //Element.style.backgroundColor='transparent';
                Element.style['max-width']='none';
              }});
            }
            if (values.length == 1) {
              values.push({text: values[0]['text'], render: function() {}});
            }
            
            return values;
          };
        };

        var hintNumber = hintTemplate('<number>');
        var hintText = hintTemplate('<text>');

        this.hintTemplate = hintTemplate;

        //Workaround to allow custom hints for mapping values
        var mappingHintTemplate = function(hint) {
          var hintFunction = hintTemplate(hint);
          return function (name, state, cm) {
            return hintFunction(state, cm);
          }
        }

        //Determines the behavior of key completion
        this.completions = {
          'define': vardef,
          '<<': varval,
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
          'placement': scalar,
          'color-map': mapping,
          'entries': sequence,
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
          'data':scalar,
          'radiusPixels':scalar,
          'weightAttr':scalar,
          'cellSize':scalar,
          'valueAttr':scalar,
          'dataLimit':scalar,
          'convergence':scalar,
          'passes':scalar,
          'minObservations':scalar,
          'maxObservationDistance':scalar,
          'noDataValue':scalar,
          'pixelsPerCell':scalar,
          'queryBuffer':scalar,
          'outputBBOX':scalar,
          'outputWidth':scalar,
          'outputHeight':scalar,
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
          '': [
            'point',
            'line',
            'polygon',
            'raster',
            'symbolizers',
            'rules',
            'define',
            'grid',
            'name',
            'title',
            'abstract',
            'feature-styles'],
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
            'x-labelObstacle',
            'x-random',
            'x-random-tile-size',
            'x-random-rotation',
            'x-random-symbol-count',
            'x-random-seed'
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
          'color-map': [
            'type',
            'entries'
          ],
          'entries': [],
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
          'params': [
            'outputBBOX',
            'outputWidth',
            'outputHeight'
          ]
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
            //text = text.replace(new RegExp('^'+escapeForRegExp(state.line.key)), '');
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

        var buildHints = function(state, cm, values) {
          var self = this;
          if (state.line.val.length > 0) {
              // filter out values based on content of line
              values = values.filter(function(value) {
                return value.indexOf(state.line.val) == 0;
              });
          }
          return values.map(function(value) {
              return hint(value, value, state.line.val);
            }).filter(function(value) {
              return value != null;
            });
        };
        this.buildHints = buildHints;

        var mappingValue = function(state, cm) {
          return buildHints(state, cm, mappingValues[state.line.key]);
        };

        var color = function(state, cm) {
          //Try text completion
          if (state.line.val.length > 0) {
            var hints = buildHints(state, cm, YsldColors.names);
            if (hints && hints.length > 0) {
              return hints;
            }
          }

          //If no completions, open the color picker
          var selection = cm.getSelection();
          //If nothing is selected, select val
          if (!selection && state.line.val.length > 0) {
            var cur = cm.getCursor();
            var line = cm.getCursor().line;
            var selstart = state.line.raw.indexOf(state.line.val);
            var selstop = selstart +  state.line.val.length;
            cm.setSelection({line:line, ch:selstart}, {line:line, ch:selstop});
          }
          //Show the color dialog
          $('.styleditor-color').click();
        };

        var icon = function(state, cm) {
          //Show the icon uploader
          //$('.styleditor-icon').click();
          //Show the list of icons
          var icons = angular.element($('.styleditor-icon')).scope().icons;
          var self = this;

          return icons.map(function(icon) {
            var text = icon.name;
            if (state.line.val.length > 0) {
              text = text.replace(new RegExp('^'+escapeForRegExp(state.line.val)), '');
            }
            return {displayText:icon.name, text:text};
          }).filter(function(icon) {
            return icon.displayText.indexOf(state.line.val) == 0;
          });

        };
        //TODO, blocked by SUITE-229
        var font = function(state, cm) {};

        


        //Controls the behaviour of value completions
        this.values = {
          'define':hintTemplate('&<var> <value>', '&<varblock>\n  <mappings>'),

          'name':hintText,
          'title':hintText,
          'abstract':hintText,
          'filter':hintTemplate('${<filter>}'),
          'else':mappingValue,
          'scale':hintTemplate('[<min>,<max>]'),
          'zoom':hintTemplate('[<min>,<max>]'),
          'label':completeAttribute,
          'priority':completeAttribute,
          'geometry':completeAttribute,
          'uom':mappingValue,
          'shape':mappingValue,
          'size':hintNumber,
          'anchor':hintTemplate('[<x>,<y>]'),
          'opacity':hintNumber,
          'rotation':hintNumber,
          'fill-color':color,
          'fill-opacity':hintNumber,
          'stroke-color':color,
          'stroke-width': hintNumber,
          'stroke-opacity': hintNumber,
          'stroke-linejoin':mappingValue,
          'stroke-linecap':mappingValue,
          'stroke-dasharray': hintTemplate('"<length> <gap>"'),
          'stroke-dashoffset': hintNumber,
          'offset': hintNumber,
          'displacement':hintTemplate('[<x>,<y>]'),
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
          'x-random-seed':hintNumber,

          'data':completeAttribute,
          'radiusPixels':hintNumber,
          'weightAttr':completeAttribute,
          'cellSize':hintNumber,
          'valueAttr':completeAttribute,
          'dataLimit':hintNumber,
          'convergence':hintNumber,
          'passes':hintNumber,
          'minObservations':hintNumber,
          'maxObservationDistance':hintNumber,
          'noDataValue':hintNumber,
          'pixelsPerCell':hintNumber,
          'queryBuffer':hintNumber,
          'outputBBOX':hintTemplate('${<envelope>}'),
          'outputWidth':hintNumber,
          'outputHeight':hintNumber
        };

        //rendering transforms
        this.transform = {};
        this.transform.mappingValues = {
          'name': [
            'vec:Heatmap',
            'vec:PointStacker',
            'vec:BarnesSurface',
          ]
        };

        this.transform.params = {
          'vec:Heatmap':[
            'data',
            'radiusPixels',
            'weightAttr',
            'pixelsPerCell',
          ],
          'vec:PointStacker':[
            'data',
            'cellSize',
          ],
          'vec:BarnesSurface':[
            'valueAttr',
            'dataLimit',
            'scale',
            'convergence',
            'passes',
            'minObservations',
            'maxObservationDistance',
            'noDataValue',
            'pixelsPerCell',
            'queryBuffer',
          ],
        };

        //gridsets
        this.gridsets = [];

        this.getGridsets = function() {
          GeoServer.gridsets.getAll().then(function(result) {
            if (result.success) {
              self.gridsets = result.data.map(function(entry) {
                return entry.name;
              }).filter(function(entry) {
                return entry != 'EPSG:4326' && entry != 'EPSG:3857';
              }).sort();
            }
          });
        };

        this.getGridsets();

      };

      YsldHinter.prototype.parseLine = function(line) {
        // preparse, remove sequence '-'
        var pre = line.replace(/^[ -]*/,'');

        // ignore any comments (but not color strings)
        pre = pre.replace(/ *#.*/g, function(match, offset) {
          if (offset > 0 && pre.indexOf('\'#') == offset-1) {
            return match
          }
          return '';
        });

        // split into key / value
        return {
          raw: line,
          key: pre.replace(/:.*/,''),
          val: pre.replace(/[^:]*:/,'').trim()
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

      //Find variable definitions
      YsldHinter.prototype.findVariables = function(cm) {
        //Traverse the editor content for top-level elements
        //Indent should match that of first non-comment line -> just check all lines...
        var variables = [];
        for (var i = 0; i < cm.lineCount(); i++) {
          var line = this.parseLine(cm.getLine(i));

          if (line.key == 'define') {
            if (i+1 < cm.lineCount() && this.indent(cm.getLine(i)) < this.indent(cm.getLine(i+1))) {
              line.varblock = true;
            } else {
              //remove the variable definition from the value
              line.val = line.val.split(' ')[0];
            }
            variables.push(line); 
          }
        }
        return variables;
      }

      //Find matching parameters for a rendering transform
      YsldHinter.prototype.findParams = function(state, cm) {
        var cur = cm.getCursor();
        
        if (state.parent.line.key == 'params') {
          var indent = this.indent(state.parent.line.raw);
          var currentIndent;
          //search up
          for (var i = cur.line-1; i >= 0; i--) {
            currentIndent = this.indent(cm.getLine(i));
            if (currentIndent == indent) {
              var line = this.parseLine(cm.getLine(i));
              if (line.key == 'name') {
                return this.transform.params[line.val];
              }
            } else if (currentIndent < indent) {
              break;
            }
          }
          //search down
          for (var i = cur.line+1; i < cm.lineCount(); i++) {
            currentIndent = this.indent(cm.getLine(i));
            if (currentIndent == indent) {
              line = this.parseLine(cm.getLine(i));
              if (line.key == 'name') {
                return this.transformParams[line.val];
              }
            } else if (currentIndent < indent) {
              break;
            }
          }
        }
        return [];
      }
      //Mappings that depend on more than just the parent
      YsldHinter.prototype.contextMappings = function(state, cm) {
        var keys = []
        //varblock
        var varblocks = this.findVariables(cm).filter(function(line) {
          return !!line.varblock;
        });

        if (varblocks.length > 0) {
          keys.push("<<");
        }

        //transform: param (depends on name)
        if (state.parent.line.key == 'params') {
          keys = this.findParams(state, cm).concat(keys);
        }
        return keys;
      }
      //Custom hints for mapping values
      YsldHinter.prototype.contextChildren = function(state, cm, children) {
        var self = this;
        var values = children.map(function(child) {
          var complete = self.completions[child];
          return complete ? complete(child, state, cm) : 
                            self.hint(child, child, state.line.key);
        }).filter(function(child) {
          return child != null;
        });

        if (state.parent.line.key == 'entries') {
           var hint = self.hintTemplate('[<color>, <opacity>, <band_value>, <text_label>]');
           return hint(state, cm).concat(values);
        }
        return values;
      };

      //Values that depend on more than just the key
      YsldHinter.prototype.contextValues = function(state, cm, valueFunction) {
        var values = [];
        var hints = [];

        //variables
        var variables = this.findVariables(cm);

        for (var i = 0; i < variables.length; i++) {
          if (state.line.key == '<<' && variables[i].varblock) {
            values.push('*'+ variables[i].val.substr(1));
          } 
          if (state.line.key != '<<' && !variables[i].varblock){
            values.push('*'+ variables[i].val.substr(1));
          }
        }
        var numVariables = values.length;

        //grid: name - default gridsets
        if (state.line.key == 'name' && state.parent.line.key == 'grid') {
          values = values.concat(['EPSG:3857', 'EPSG:4326']).concat(this.gridsets);
        }

        //transform: name
        if (state.line.key == 'name' && state.parent.line.key == 'transform') {
          values = values.concat(this.transform.mappingValues['name']);
        }

        if (values.length > 0) {
          hints = this.buildHints(state, cm, values)
        }

        if (hints.length > 0 && valueFunction) {
          hints = hints.concat(valueFunction(state, cm));
        } else if (valueFunction) {
          hints = valueFunction(state, cm);
        }


        //If variables are the only suggestion, we are either:
        //  1. At a top-level mapping (such as feature-styles:), in which case we do not suggest anything
        //  2. At a varblock, in which case we return possible varblocks
        if (hints.length == numVariables && state.line.key != '<<') {
          return [];
        } else {
          return hints;
        }
        
      }

      YsldHinter.prototype.lookupHints = function(state, cm) {
        var self = this;
        if (state.parent.line.key in this.mappings) {
          var children = this.mappings[state.parent.line.key];
          //add special context-sensitive mappings
          children = children.concat(this.contextMappings(state, cm));
          if (children != null) {
            if (state.line.key.length > 0) {
              // filter out children based on content of line
              children = children.filter(function(child) {
                return child.indexOf(state.line.key) == 0;
              });
            }

            if (children.length == 1 && children[0] == state.line.key || state.line.val.trim() != state.line.key.trim()) {
              // look for a value mapping
              var complete = self.values[state.line.key];
              //also grab any context-sensitive completions
              return this.contextValues(state, cm, complete);
              //return complete ? complete(state, cm) : [];
            }
            return this.contextChildren(state, cm, children);     
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
