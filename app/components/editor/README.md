# Editor scope variables

The `$scope` of the editor pages is shared between `editor.map.*` / `editor.layer.*`, 
`olmap.*`, `layerlist.*`, and `styleeditor.*`. As such, care must be taken when adding
or modifying these scope variables.
The following scope variables are used among these modules:


Initialized in `editor.layer.js` or `editor.map.js`:
* `$scope.olMapOpts` - OL Map parameters, used by `olmap.js` to construct `$scope.olMap`.
* `$scope.map` - map object obtained from GeoServer. null for `editor.layer.js`.
* `$scope.map.layers` - list of layers for the map object.
* `$scope.layer` - layer object obtained from geoserver. Represents the current layer for `editor.map.js`.
* `$scope.workspace` - name of the current workspace.
* `$scope.isRendering` - boolean indicating if the map is currently rendering. Used to show the "Rendering map" spinner.
* `$scope.ysldstyle` - text content of the current style. Used by `styleeditor.js` when constructing `$scope.editor`.

Initialized in `olmap.js`:
* `$scope.olMap` - OL3 Map object. Generated from `$scope.olMapOpts`.
* `$scope.hideCtrl` - List of map controls to hide. Set by `tools/display.js` and used by `editor.*.tpl.html`.


Initialized in `styleeditor.js`:
* `$scope.editor` - Codemirror editor object.
* `$scope.generation` - editor generation; used to handle undo.
* `$scope.markers` - List of errors, displayed as line markers in the editor.
* `$scope.popoverElement` - Popover element for error markers.


Initialized in `layerlist.js`:
* `$scope.showLayerList` - boolean indicating wheter to display the layer list.
