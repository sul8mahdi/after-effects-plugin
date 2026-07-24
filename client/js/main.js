/*
 * main.js — panel application logic (Phase 1).
 *
 * Responsibilities:
 *   - Load locale files, boot the i18n engine (Arabic default, RTL).
 *   - Language toggle that re-renders all strings and flips direction.
 *   - Three-step Home flow; Phase 1 wires step 2 (Inspect) end-to-end.
 *   - Call the host analyzer, render a human-readable report.
 *   - Surface errors and warnings honestly; keep a copyable error log.
 *
 * Motion / appearance actions are present but disabled with a "coming soon"
 * note — we do not pretend features exist before their phase.
 */
(function () {
  'use strict';

  var i18n = IMPi18n.createI18n();
  var lastReport = null;

  // ---- locale loading (works under CEP and in a plain browser) ----
  function loadLocale(code) {
    return fetch('./locale/' + code + '.json').then(function (r) { return r.json(); });
  }

  function boot() {
    Promise.all([loadLocale('ar'), loadLocale('en')]).then(function (res) {
      i18n.setLocales({ ar: res[0], en: res[1] });
      i18n.setLang('ar');
      applyLanguage();
      wireEvents();
      showMockBadgeIfNeeded();
      checkEngine();
    }).catch(function (e) {
      document.getElementById('status').textContent = 'Locale load failed: ' + e;
    });
  }

  // ---- rendering ----
  function t(key, params) { return i18n.t(key, params); }

  function applyLanguage() {
    var dir = i18n.dir();
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', i18n.getLang());
    document.body.classList.toggle('rtl', dir === 'rtl');

    setText('appTitle', t('app.title'));
    setText('appTagline', t('app.tagline'));
    setText('phaseBadge', t('badge.phase'));
    setText('langToggle', t('lang.switchTo'));

    setText('step1', t('home.step1'));
    setText('step2', t('home.step2'));
    setText('step3', t('home.step3'));
    setText('selectHint', t('home.selectHint'));
    setText('phaseNote', t('phase.note'));

    setText('btnAnalyze', t('btn.analyze'));
    setText('btnAnimate', t('btn.animate'));
    setText('btnCopyLog', t('btn.copyLog'));

    if (lastReport) { renderReport(lastReport); }
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) { el.textContent = text; }
  }

  function showMockBadgeIfNeeded() {
    if (!IMPBridge.isCEP) {
      var b = document.getElementById('mockBadge');
      b.textContent = t('badge.mock');
      b.style.display = 'inline-block';
    }
  }

  function setStatus(key) { setText('status', t(key)); }

  // ---- engine check ----
  function checkEngine() {
    setStatus('status.engineCheck');
    IMPBridge.init().then(function () {
      return IMPBridge.ping();
    }).then(function (res) {
      if (res && res.ok) {
        setStatus('status.ready');
        IMPLog.info('engine ready, AE ' + res.aeVersion);
      } else {
        setStatus('err.engine_not_loaded');
        IMPLog.error('engine check failed: ' + JSON.stringify(res));
      }
    });
  }

  // ---- analyze flow ----
  function onAnalyze() {
    setStatus('status.analyzing');
    document.getElementById('btnAnalyze').disabled = true;
    IMPBridge.analyzeSelection().then(function (res) {
      document.getElementById('btnAnalyze').disabled = false;
      if (!res || !res.ok) {
        var code = res && res.code ? res.code : 'exception';
        var msgKey = 'err.' + code;
        setStatus('status.ready');
        showError(t(msgKey), res ? res.error : '');
        IMPLog.error('analyze failed [' + code + ']: ' + (res ? res.error : ''));
        return;
      }
      lastReport = res;
      renderReport(res);
      setStatus('status.done');
      IMPLog.info('analyze ok: ' + res.layers.length + ' layer(s)');
    });
  }

  function showError(message, detail) {
    var box = document.getElementById('errorBox');
    box.style.display = 'block';
    box.querySelector('.msg').textContent = message;
    if (detail) { IMPLog.error(detail); }
  }

  function clearError() {
    document.getElementById('errorBox').style.display = 'none';
  }

  function renderReport(res) {
    clearError();
    var host = document.getElementById('report');
    host.innerHTML = '';

    var title = document.createElement('h2');
    title.textContent = t('report.title');
    host.appendChild(title);

    for (var i = 0; i < res.layers.length; i++) {
      host.appendChild(renderLayer(res.layers[i]));
    }
  }

  function renderLayer(layer) {
    var card = document.createElement('div');
    card.className = 'layer-card';

    var h = document.createElement('div');
    h.className = 'layer-head';
    h.textContent = t('report.layer') + ' ' + layer.index + ': ' + layer.name +
      ' — ' + t('report.type') + ': ' + layer.type;
    card.appendChild(h);

    if (!layer.supported) {
      var u = document.createElement('div');
      u.className = 'unsupported';
      u.textContent = t('report.unsupported');
      card.appendChild(u);
      appendWarnings(card, layer.warnings);
      return card;
    }

    var c = layer.counts;
    var summary = document.createElement('p');
    summary.className = 'summary';
    summary.textContent = t('report.summary', {
      paths: c.paths, groups: c.groups, colors: layer.colors.length,
      widths: layer.strokeWidths.length, empty: c.pathsEmpty
    });
    card.appendChild(summary);

    var grid = document.createElement('div');
    grid.className = 'stat-grid';
    addStat(grid, t('report.paths'), c.paths + ' (' + t('report.open') + ' ' + c.pathsOpen +
      ' / ' + t('report.closed') + ' ' + c.pathsClosed + ' / ' + t('report.empty') + ' ' + c.pathsEmpty + ')');
    addStat(grid, t('report.groups'), c.groups);
    addStat(grid, t('report.fills'), c.fills);
    addStat(grid, t('report.strokes'), c.strokes);
    addStat(grid, t('report.complexity'), t('complexity.' + layer.complexity));
    card.appendChild(grid);

    if (layer.colors.length) { card.appendChild(renderSwatches(t('report.colors'), layer.colors)); }
    if (layer.strokeWidths.length) {
      var w = document.createElement('p');
      w.className = 'widths';
      w.textContent = t('report.strokeWidths') + ': ' + layer.strokeWidths.join(', ');
      card.appendChild(w);
    }

    appendWarnings(card, layer.warnings);
    return card;
  }

  function addStat(grid, label, value) {
    var cell = document.createElement('div');
    cell.className = 'stat';
    cell.innerHTML = '<span class="k"></span><span class="v"></span>';
    cell.querySelector('.k').textContent = label;
    cell.querySelector('.v').textContent = value;
    grid.appendChild(cell);
  }

  function renderSwatches(label, colors) {
    var wrap = document.createElement('div');
    wrap.className = 'swatches';
    var l = document.createElement('span');
    l.className = 'swatch-label';
    l.textContent = label + ':';
    wrap.appendChild(l);
    for (var i = 0; i < colors.length; i++) {
      var s = document.createElement('span');
      s.className = 'swatch';
      s.style.background = colors[i];
      s.title = colors[i];
      wrap.appendChild(s);
    }
    return wrap;
  }

  function appendWarnings(card, warnings) {
    if (!warnings || !warnings.length) { return; }
    var box = document.createElement('div');
    box.className = 'warnings';
    var h = document.createElement('div');
    h.className = 'warn-head';
    h.textContent = t('report.warnings');
    box.appendChild(h);
    for (var i = 0; i < warnings.length; i++) {
      var w = warnings[i];
      var line = document.createElement('div');
      line.className = 'warn-line';
      line.textContent = t('warn.' + w.code, { detail: w.detail });
      box.appendChild(line);
    }
    card.appendChild(box);
  }

  // ---- events ----
  function wireEvents() {
    document.getElementById('langToggle').addEventListener('click', function () {
      i18n.setLang(i18n.getLang() === 'ar' ? 'en' : 'ar');
      applyLanguage();
    });
    document.getElementById('btnAnalyze').addEventListener('click', onAnalyze);
    document.getElementById('btnCopyLog').addEventListener('click', function () {
      var text = IMPLog.getText();
      if (navigator.clipboard) { navigator.clipboard.writeText(text); }
      IMPLog.info('log copied');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
