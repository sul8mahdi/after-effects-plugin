/*
 * csinterface.js — minimal CSInterface shim.
 *
 * The full official Adobe CSInterface.js can be dropped in to replace this
 * without touching other code; we implement only the surface Icon M Pro
 * uses (evalScript, getSystemPath, host environment). Under CEP the runtime
 * injects window.__adobe_cep__; outside CEP (a plain browser) it is absent,
 * which bridge.js detects to enable mock mode.
 */
(function (global) {
  'use strict';

  var SystemPath = {
    EXTENSION: 'extension',
    USER_DATA: 'userData',
    COMMON_FILES: 'commonFiles',
    MY_DOCUMENTS: 'myDocuments'
  };

  function CSInterface() {}

  CSInterface.prototype.hostAvailable = function () {
    return typeof global.__adobe_cep__ !== 'undefined';
  };

  CSInterface.prototype.evalScript = function (script, callback) {
    if (!this.hostAvailable()) {
      if (callback) { callback('EvalScript error: host unavailable'); }
      return;
    }
    global.__adobe_cep__.evalScript(script, callback || function () {});
  };

  CSInterface.prototype.getSystemPath = function (type) {
    if (!this.hostAvailable()) { return ''; }
    var path = global.__adobe_cep__.getSystemPath(type);
    return decodeURIComponent(path);
  };

  CSInterface.prototype.getHostEnvironment = function () {
    if (!this.hostAvailable()) { return null; }
    try {
      return JSON.parse(global.__adobe_cep__.getHostEnvironment());
    } catch (e) {
      return null;
    }
  };

  global.SystemPath = SystemPath;
  global.CSInterface = CSInterface;

})(typeof window !== 'undefined' ? window : this);
