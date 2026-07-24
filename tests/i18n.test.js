/*
 * i18n.test.js — localization correctness, runnable outside After Effects.
 *
 * Guards the bilingual contract:
 *   - ar and en define exactly the same key set (no missing translations).
 *   - Each key's interpolation tokens ({paths}, {detail}, ...) match across
 *     languages, so params never break in one language.
 *   - The i18n engine interpolates, falls back, and reports direction correctly.
 */
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var i18n = require('../client/js/i18n.js');

var localeDir = path.join(__dirname, '..', 'client', 'locale');
var ar = JSON.parse(fs.readFileSync(path.join(localeDir, 'ar.json'), 'utf8'));
var en = JSON.parse(fs.readFileSync(path.join(localeDir, 'en.json'), 'utf8'));

function tokensOf(str) {
  var set = {};
  var re = /\{(\w+)\}/g;
  var m;
  while ((m = re.exec(str)) !== null) { set[m[1]] = true; }
  return Object.keys(set).sort();
}

module.exports = {
  'ar and en have identical key sets': function () {
    var missingInEn = i18n.missingKeys(ar, en);
    var missingInAr = i18n.missingKeys(en, ar);
    assert.deepStrictEqual(missingInEn, [], 'keys missing from en: ' + missingInEn.join(', '));
    assert.deepStrictEqual(missingInAr, [], 'keys missing from ar: ' + missingInAr.join(', '));
  },

  'interpolation tokens match across languages': function () {
    for (var key in ar) {
      if (!Object.prototype.hasOwnProperty.call(ar, key)) { continue; }
      var a = tokensOf(ar[key]);
      var e = tokensOf(en[key]);
      assert.deepStrictEqual(a, e, 'token mismatch for "' + key + '": ar[' + a + '] en[' + e + ']');
    }
  },

  'default language is Arabic and RTL': function () {
    assert.strictEqual(i18n.DEFAULT_LANG, 'ar');
    assert.strictEqual(i18n.langDir('ar'), 'rtl');
    assert.strictEqual(i18n.langDir('en'), 'ltr');
  },

  'engine interpolates params': function () {
    var e = i18n.createI18n();
    e.setLocales({ ar: ar, en: en });
    e.setLang('ar');
    var out = e.t('report.summary', { paths: 18, groups: 4, colors: 3, widths: 5, empty: 2 });
    assert.ok(out.indexOf('18') !== -1, 'expected paths count in output');
    assert.ok(out.indexOf('{') === -1, 'no unresolved tokens should remain');
  },

  'engine falls back to default language for missing key in a table': function () {
    var e = i18n.createI18n();
    // en missing a key -> should fall back to ar value
    e.setLocales({ ar: { greeting: 'مرحبا' }, en: {} });
    e.setLang('en');
    assert.strictEqual(e.t('greeting'), 'مرحبا');
  },

  'switching language flips direction': function () {
    var e = i18n.createI18n();
    e.setLocales({ ar: ar, en: en });
    e.setLang('ar');
    assert.strictEqual(e.dir(), 'rtl');
    e.setLang('en');
    assert.strictEqual(e.dir(), 'ltr');
  }
};
