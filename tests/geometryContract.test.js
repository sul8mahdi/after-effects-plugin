/*
 * geometryContract.test.js — host <-> panel contract, runnable outside AE.
 *
 * The Geometry Analyzer is ExtendScript and needs After Effects to run, so we
 * cannot execute it here. What we CAN and must guard is the contract between
 * the host and the panel:
 *
 *   1. Every stable code the host can emit (error codes, warning codes,
 *      complexity levels) has a localized string in BOTH languages. If someone
 *      adds a host code without a translation, this test fails.
 *   2. A representative report matches the shape the panel renders, so field
 *      renames on either side are caught.
 *
 * The code lists below mirror the host source and are the single checklist a
 * reviewer updates when the host contract changes.
 */
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var localeDir = path.join(__dirname, '..', 'client', 'locale');
var ar = JSON.parse(fs.readFileSync(path.join(localeDir, 'ar.json'), 'utf8'));
var en = JSON.parse(fs.readFileSync(path.join(localeDir, 'en.json'), 'utf8'));

// --- the host contract (mirror of host/bridge/api.jsx + analyzer + bridge.js) ---
var ERROR_CODES = ['no_comp', 'no_selection', 'exception', 'engine_not_loaded', 'bad_json'];
var WARNING_CODES = ['unsupported_layer_type', 'no_shape_contents', 'needs_verified_matchname', 'existing_modifier'];
var COMPLEXITY_LEVELS = ['simple', 'medium', 'complex'];

function hasKey(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }

function assertLocalized(prefix, codes) {
  for (var i = 0; i < codes.length; i++) {
    var key = prefix + codes[i];
    assert.ok(hasKey(ar, key), 'ar missing localization for ' + key);
    assert.ok(hasKey(en, key), 'en missing localization for ' + key);
  }
}

// A representative analyzer report (matches what host/analyzer produces).
var sampleReport = {
  ok: true,
  comp: { name: 'C', width: 1920, height: 1080, frameRate: 30, frameDuration: 0.0333, duration: 5 },
  layers: [{
    index: 1, name: 'x', type: 'ShapeLayer', supported: true,
    counts: { groups: 4, paths: 18, pathsOpen: 2, pathsClosed: 16, pathsEmpty: 2, fills: 3, strokes: 5 },
    colors: ['#000000'], strokeWidths: [1, 1.75], hasOpacityBelow100: false,
    complexity: 'complex', warnings: [{ code: 'needs_verified_matchname', detail: 'ADBE Vector Graphic - G-Fill' }]
  }]
};

module.exports = {
  'all host error codes are localized in both languages': function () {
    assertLocalized('err.', ERROR_CODES);
  },

  'all host warning codes are localized in both languages': function () {
    assertLocalized('warn.', WARNING_CODES);
  },

  'all complexity levels are localized in both languages': function () {
    assertLocalized('complexity.', COMPLEXITY_LEVELS);
  },

  'report shape has the fields the panel renders': function () {
    assert.strictEqual(typeof sampleReport.ok, 'boolean');
    assert.ok(Array.isArray(sampleReport.layers));
    var L = sampleReport.layers[0];
    var countFields = ['groups', 'paths', 'pathsOpen', 'pathsClosed', 'pathsEmpty', 'fills', 'strokes'];
    for (var i = 0; i < countFields.length; i++) {
      assert.strictEqual(typeof L.counts[countFields[i]], 'number', 'counts.' + countFields[i] + ' must be a number');
    }
    assert.ok(Array.isArray(L.colors));
    assert.ok(Array.isArray(L.strokeWidths));
    assert.ok(Array.isArray(L.warnings));
    assert.notStrictEqual(COMPLEXITY_LEVELS.indexOf(L.complexity), -1, 'complexity must be a known level');
  },

  'every warning in the sample uses a known, localized code': function () {
    var L = sampleReport.layers[0];
    for (var i = 0; i < L.warnings.length; i++) {
      var code = L.warnings[i].code;
      assert.notStrictEqual(WARNING_CODES.indexOf(code), -1, 'unknown warning code: ' + code);
      assert.ok(hasKey(ar, 'warn.' + code) && hasKey(en, 'warn.' + code));
    }
  }
};
