/*
 * bridge.js — panel -> host communication.
 *
 * Wraps CSInterface.evalScript in promises and parses the JSON string the host
 * returns. Outside After Effects (a plain browser) it runs in MOCK mode and
 * returns canned data so the UI, localization, and layout can be previewed and
 * tested without AE. Mock mode is clearly flagged in the returned payload.
 */
(function (global) {
  'use strict';

  var cs = new CSInterface();
  var isCEP = cs.hostAvailable();
  var extensionRoot = isCEP ? cs.getSystemPath(SystemPath.EXTENSION) : '';

  function evalScript(code) {
    return new Promise(function (resolve) {
      cs.evalScript(code, function (result) { resolve(result); });
    });
  }

  // Call a host function that returns a JSON string; resolve the parsed object.
  function callHost(expr) {
    if (!isCEP) { return Promise.resolve(mockResponse(expr)); }
    return evalScript(expr).then(function (raw) {
      if (typeof raw !== 'string' || raw.indexOf('{') !== 0) {
        return { ok: false, code: 'engine_not_loaded', error: String(raw) };
      }
      try {
        return JSON.parse(raw);
      } catch (e) {
        return { ok: false, code: 'bad_json', error: String(raw) };
      }
    });
  }

  function init() {
    var root = isCEP ? cs.getSystemPath(SystemPath.EXTENSION) : '';
    var arg = JSON.stringify(root);
    return callHost('IMP.api.init(' + arg + ')');
  }

  function ping() { return callHost('IMP.api.ping()'); }
  function analyzeSelection() { return callHost('IMP.api.analyzeSelection()'); }

  // ---- mock data for browser preview / manual UI testing ----
  function mockResponse(expr) {
    if (expr.indexOf('ping') !== -1) {
      return { ok: true, message: 'pong', aeVersion: 'MOCK', mock: true };
    }
    if (expr.indexOf('init') !== -1) {
      return { ok: true, root: '(mock)', aeVersion: 'MOCK', mock: true };
    }
    if (expr.indexOf('analyzeSelection') !== -1) {
      return {
        ok: true, mock: true,
        comp: { name: 'Mock Comp', width: 1920, height: 1080, frameRate: 30, frameDuration: 0.0333, duration: 5 },
        layers: [{
          index: 1, name: 'gear-icon', type: 'ShapeLayer', supported: true,
          counts: { groups: 4, paths: 18, pathsOpen: 2, pathsClosed: 16, pathsEmpty: 2, fills: 3, strokes: 5 },
          colors: ['#1a1a1a', '#f5a623', '#ffffff'],
          strokeWidths: [1, 1.75, 3.5],
          hasOpacityBelow100: false,
          complexity: 'complex',
          warnings: [{ code: 'needs_verified_matchname', detail: 'ADBE Vector Graphic - G-Fill' }]
        }]
      };
    }
    return { ok: false, code: 'exception', error: 'unknown mock expr', mock: true };
  }

  global.IMPBridge = {
    isCEP: isCEP,
    extensionRoot: extensionRoot,
    init: init,
    ping: ping,
    analyzeSelection: analyzeSelection
  };

})(window);
