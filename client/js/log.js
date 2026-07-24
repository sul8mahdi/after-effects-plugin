/*
 * log.js — panel-side log buffer.
 *
 * Keeps a copyable in-memory log so the user can share errors (brief §17:
 * "make the error log copyable and shareable"). Also mirrors to the console.
 */
(function (global) {
  'use strict';

  var buffer = [];

  function stamp() {
    var d = new Date();
    return d.toISOString();
  }

  function push(level, msg) {
    var line = '[' + stamp() + '] ' + level + ' ' + msg;
    buffer.push(line);
    if (buffer.length > 500) { buffer.shift(); }
    if (global.console) { global.console.log(line); }
    return line;
  }

  global.IMPLog = {
    info: function (m) { return push('INFO ', m); },
    warn: function (m) { return push('WARN ', m); },
    error: function (m) { return push('ERROR', m); },
    getText: function () { return buffer.join('\n'); },
    clear: function () { buffer = []; }
  };

})(window);
