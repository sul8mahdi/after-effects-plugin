/*
 * localesSync.test.js — the embedded bundle must match the JSON sources.
 *
 * client/locale/locales.js is generated from ar.json / en.json. If someone
 * edits a JSON file without regenerating (node tools/build-locales.js), the
 * panel would ship stale strings. This test fails on any drift.
 */
'use strict';

var assert = require('assert');
var fs = require('fs');
var builder = require('../tools/build-locales.js');

module.exports = {
  'locales.js is in sync with ar.json / en.json': function () {
    var onDisk;
    try {
      onDisk = fs.readFileSync(builder.outPath, 'utf8');
    } catch (e) {
      throw new Error('client/locale/locales.js missing — run: node tools/build-locales.js');
    }
    assert.strictEqual(
      onDisk,
      builder.expected,
      'locales.js is stale — run: node tools/build-locales.js'
    );
  }
};
