/*
 * validate.mjs — validates a Smart Motion suggestions object against the
 * vocabulary and (optionally) the parts present in the icon report.
 *
 * This is the gate that makes Smart Motion trustworthy: it proves every
 * suggestion is executable by the engine (known motions/easings/styles, in
 * range) and grounded (only references parts the icon actually has). Used by
 * both the live adapter (try-smart-motion.mjs) and the test suite.
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));

export function loadVocabulary() {
  return JSON.parse(fs.readFileSync(path.join(here, 'vocabulary.json'), 'utf8'));
}

function flattenMotions(vocab) {
  const out = [];
  for (const cat of Object.keys(vocab.motions)) out.push(...vocab.motions[cat]);
  return out;
}

function bilingualOk(v) {
  return v && typeof v.ar === 'string' && v.ar.length > 0 &&
         typeof v.en === 'string' && v.en.length > 0;
}

// Returns { ok: boolean, problems: string[] }
export function validateSuggestions(output, vocab, allowedParts) {
  const problems = [];
  const motions = flattenMotions(vocab);
  const dRange = vocab.param_ranges.duration_s;

  if (!output || typeof output !== 'object') {
    return { ok: false, problems: ['output is not an object'] };
  }
  if (['high', 'medium', 'low'].indexOf(output.meaning_confidence) === -1) {
    problems.push('meaning_confidence must be high|medium|low');
  }
  const keys = ['corporate', 'educational', 'dynamic'];
  for (const k of keys) {
    const s = output.suggestions ? output.suggestions[k] : null;
    if (!s) { problems.push('missing suggestion: ' + k); continue; }
    if (!bilingualOk(s.title)) problems.push(k + ': title must have ar+en');
    if (!bilingualOk(s.meaning)) problems.push(k + ': meaning must have ar+en');
    if (!bilingualOk(s.explanation)) problems.push(k + ': explanation must have ar+en');

    if (!Array.isArray(s.parts_motion) || s.parts_motion.length < 1) {
      problems.push(k + ': parts_motion must be a non-empty array');
    } else {
      for (const pm of s.parts_motion) {
        if (motions.indexOf(pm.motion) === -1) problems.push(k + ': unknown motion "' + pm.motion + '"');
        if (typeof pm.params !== 'object' || pm.params === null) problems.push(k + ': params must be an object');
        if (allowedParts && allowedParts.indexOf(pm.part) === -1) {
          problems.push(k + ': part "' + pm.part + '" not present in the icon report');
        }
      }
    }

    const g = s.global || {};
    if (typeof g.duration_s !== 'number' || g.duration_s < dRange.min || g.duration_s > dRange.max) {
      problems.push(k + ': duration_s out of range');
    }
    if (vocab.easing.indexOf(g.easing) === -1) problems.push(k + ': unknown easing "' + g.easing + '"');
    if (vocab.styles.indexOf(g.style) === -1) problems.push(k + ': unknown style "' + g.style + '"');
    if (!g.stagger || vocab.stagger_orders.indexOf(g.stagger.order) === -1) {
      problems.push(k + ': unknown stagger order');
    } else if (typeof g.stagger.seconds !== 'number' || g.stagger.seconds < 0 || g.stagger.seconds > vocab.param_ranges.stagger_s.max) {
      problems.push(k + ': stagger.seconds out of range');
    }
    if (typeof g.loop !== 'boolean') problems.push(k + ': loop must be boolean');
  }

  return { ok: problems.length === 0, problems };
}
