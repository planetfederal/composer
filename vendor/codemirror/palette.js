/*
 * Codemirror add-on that displays CSS color palette, by putting
 * bookmarks next to color values with a background matching the
 * value.
 *
 * To enable a plugin pass set `paletteHints` option on editor to
 * `true`. 
 *
 * Source:
 * https://github.com/Gozala/CodeMirror/blob/addon/palette/addon/display/palette.js
 *
 * Requires utilities.js YsldColors factory on window scope: window.YsldColors = YsldColors
 */

(function() {
  var PALETTE_TOKEN = "palette";

  function makeWidget(color) {
    var hint = document.createElement("span");
    hint.innerHTML = "&nbsp;";
    hint.className = "cm-palette-hint";
    hint.style.background = color;

    return hint;
  }

  function isPaletteMark(mark) { return mark.isPaletteMark; }
  function clear(mark) { return mark.clear(); }

  function findMarks(editor, range) {
    var markers = [];
    var from = range.from;
    var to = range.to;
    var firstLine = from.line;
    var lastLine = to.line;
    var lineNumber = from.line;
    while (lineNumber <= lastLine) {
      var line = editor.getLineHandle(lineNumber);
      var spans = line && line.markedSpans;
      if (spans) {
        var isLastLine = lineNumber === lastLine;
        var isFirstLine = lineNumber === firstLine;

        var count = spans.length;
        var index = 0;
        while (index < count) {
          var span = spans[index];
          var isInRange = isFirstLine ? span.from >= from.ch :
                          isLastLine ? span.to <= to.ch :
                          true;

          if (isInRange)
            markers.push(span.marker.parent || span.marker);

          index = index + 1;
        }
      }
      lineNumber = lineNumber + 1;
    }

    return markers;
  }

  function updatePaletteWidgets(editor, range) {
    var doc = editor.getDoc();
    findMarks(editor, range).filter(isPaletteMark).forEach(clear);

    var isFirstLine = true;
    editor.eachLine(range.from.line, range.to.line + 1, function(line) {
      var text = line.text;
      var match = null;
      var offset = 0;
      while ((match = text.match(YsldColors.COLOR_PATTERN))) {
        var color = YsldColors.decode(match[0]);
        var start = text.indexOf(match[0]);
        var index = start + match[0].length;
        var before = text[start - 1];
        var after = text[index];
        offset = offset + index;
        text = text.substr(index);

        if (color && (!after || ", )]'\"".indexOf(after) >= 0) &&
            (!before || "[(,: '\"".indexOf(before)) >= 0) {

          if (!isFirstLine || offset >= range.from.ch) {
            var bookmark = doc.setBookmark({line: doc.getLineNumber(line),
                                            ch: offset},
                                           {widget: makeWidget(color),
                                            insertLeft: true});
            bookmark.isPaletteMark = true;
          }
        }
      }
      isFirstLine = false;
    });
  }

  function batchUpdate(editor, change) {
    while (change) {
      var chEnd = change.text[change.text.length-1].length;
      if (change.text.length == 1) {
        chEnd = chEnd + change.from.ch;
      }
      updatePaletteWidgets(editor, {
        from: change.from,
        to: {line: change.from.line + change.text.length - 1, ch: chEnd}
      });
      change = change.next;
    }
  }

  CodeMirror.defineOption("paletteHints", false, function(editor, current, past) {
    if (current) {
      editor.on("change", batchUpdate);
      updatePaletteWidgets(editor, {
        from: {line: editor.firstLine(), ch: 0},
        to: {line: editor.lastLine() + 1, ch: 0}
      });
    }
    else {
      editor.off("change", batchUpdate);
      editor.getAllMarks().filter(isPaletteMark).forEach(clear);
    }
  });
})();
