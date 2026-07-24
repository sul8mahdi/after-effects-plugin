/*
 * es3lint.test.js — enforces CLAUDE.md §1 on the host engine.
 *
 * ExtendScript is ECMAScript 3. This scans every host .jsx file for banned
 * modern syntax AFTER stripping comments and string literals (so prose and
 * matchName strings never cause false positives). If any real code uses ES6+,
 * the test fails with the file and line.
 */
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var hostDir = path.join(__dirname, '..', 'host');

function listJsx(dir, out) {
  var entries = fs.readdirSync(dir);
  for (var i = 0; i < entries.length; i++) {
    var full = path.join(dir, entries[i]);
    var stat = fs.statSync(full);
    if (stat.isDirectory()) { listJsx(full, out); }
    else if (/\.jsx$/.test(entries[i])) { out.push(full); }
  }
  return out;
}

// Replace comments and string literals with spaces, preserving newlines so
// reported line numbers stay accurate.
function stripCommentsAndStrings(src) {
  var out = '';
  var i = 0;
  var n = src.length;
  var state = 'code';
  while (i < n) {
    var c = src.charAt(i);
    var c2 = src.charAt(i + 1);
    if (state === 'code') {
      if (c === '/' && c2 === '/') { state = 'line'; out += '  '; i += 2; continue; }
      if (c === '/' && c2 === '*') { state = 'block'; out += '  '; i += 2; continue; }
      if (c === '"') { state = 'dq'; out += ' '; i++; continue; }
      if (c === '\'') { state = 'sq'; out += ' '; i++; continue; }
      out += c; i++;
    } else if (state === 'line') {
      if (c === '\n') { state = 'code'; out += '\n'; } else { out += ' '; }
      i++;
    } else if (state === 'block') {
      if (c === '*' && c2 === '/') { state = 'code'; out += '  '; i += 2; continue; }
      out += (c === '\n' ? '\n' : ' '); i++;
    } else if (state === 'dq' || state === 'sq') {
      if (c === '\\') { out += '  '; i += 2; continue; }
      if ((state === 'dq' && c === '"') || (state === 'sq' && c === '\'')) { state = 'code'; out += ' '; i++; continue; }
      out += (c === '\n' ? '\n' : ' '); i++;
    }
  }
  return out;
}

var BANNED = [
  { re: /=>/, msg: 'arrow function' },
  { re: /\blet\s/, msg: 'let' },
  { re: /\bconst\s/, msg: 'const' },
  { re: /`/, msg: 'template literal' },
  { re: /\bclass\s/, msg: 'class' },
  { re: /\.\s*forEach\s*\(/, msg: '.forEach' },
  { re: /\.\s*map\s*\(/, msg: '.map' },
  { re: /\.\s*filter\s*\(/, msg: '.filter' },
  { re: /\.\s*reduce\s*\(/, msg: '.reduce' },
  { re: /\bJSON\s*\./, msg: 'JSON.*' },
  { re: /\bconsole\s*\./, msg: 'console.*' },
  { re: /\.\.\./, msg: 'spread/rest' },
  { re: /\bfor\s*\(\s*(var\s+)?\w+\s+of\s/, msg: 'for...of' }
];

module.exports = {
  'no banned ES6+ syntax in host engine': function () {
    var files = listJsx(hostDir, []);
    assert.ok(files.length > 0, 'expected host .jsx files to scan');
    var violations = [];
    for (var f = 0; f < files.length; f++) {
      var src = stripCommentsAndStrings(fs.readFileSync(files[f], 'utf8'));
      var lines = src.split('\n');
      for (var ln = 0; ln < lines.length; ln++) {
        for (var b = 0; b < BANNED.length; b++) {
          if (BANNED[b].re.test(lines[ln])) {
            violations.push(path.relative(hostDir, files[f]) + ':' + (ln + 1) + ' — ' + BANNED[b].msg);
          }
        }
      }
    }
    assert.deepStrictEqual(violations, [], 'ES3 violations:\n  ' + violations.join('\n  '));
  }
};
