/*
 * i18n.js — localization engine (UMD: browser global + Node module).
 *
 * Flat string keys (e.g. "home.step1"). Arabic is the default language and is
 * RTL; English is LTR. Pure and framework-free so it can be unit-tested in Node
 * without a browser: main.js loads the JSON locale files and injects them via
 * setLocales(); tests do the same with fs.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.IMPi18n = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_LANG = 'ar';

  function langDir(code) { return code === 'ar' ? 'rtl' : 'ltr'; }

  function createI18n() {
    var locales = {};   // { ar: {key:val}, en: {key:val} }
    var current = DEFAULT_LANG;

    function setLocales(map) { locales = map || {}; }

    function setLang(code) {
      if (locales[code]) { current = code; }
      return current;
    }

    function getLang() { return current; }

    function dir() { return langDir(current); }

    function interpolate(str, params) {
      if (!params) { return str; }
      return str.replace(/\{(\w+)\}/g, function (m, name) {
        return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m;
      });
    }

    // Look up key in current lang; fall back to default lang; then the key.
    function t(key, params) {
      var table = locales[current] || {};
      var val = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : null;
      if (val === null) {
        var def = locales[DEFAULT_LANG] || {};
        val = Object.prototype.hasOwnProperty.call(def, key) ? def[key] : key;
      }
      return interpolate(val, params);
    }

    return {
      setLocales: setLocales,
      setLang: setLang,
      getLang: getLang,
      dir: dir,
      t: t
    };
  }

  // keys present in `a` but missing from `b`
  function missingKeys(a, b) {
    var out = [];
    for (var k in a) {
      if (Object.prototype.hasOwnProperty.call(a, k) &&
          !Object.prototype.hasOwnProperty.call(b, k)) {
        out.push(k);
      }
    }
    return out;
  }

  return {
    DEFAULT_LANG: DEFAULT_LANG,
    langDir: langDir,
    createI18n: createI18n,
    missingKeys: missingKeys
  };
});
