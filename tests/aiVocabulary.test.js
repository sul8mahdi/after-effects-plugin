/*
 * aiVocabulary.test.js — Smart Motion contract guard (runs outside AE).
 *
 * The whole point of Smart Motion is that the AI may only propose motions the
 * engine can execute. This test parses vocabulary.json, the JSON schema, and
 * the gear example, and asserts every motion / easing / style / stagger-order
 * the example uses is a known vocabulary token. If a suggestion ever references
 * an unknown token, it would not be executable — caught here.
 */
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var aiDir = path.join(__dirname, '..', 'ai');
var vocab = JSON.parse(fs.readFileSync(path.join(aiDir, 'vocabulary.json'), 'utf8'));
var schema = JSON.parse(fs.readFileSync(path.join(aiDir, 'schema', 'suggestions.schema.json'), 'utf8'));
var example = JSON.parse(fs.readFileSync(path.join(aiDir, 'examples', 'gear.output.json'), 'utf8'));

function allMotions() {
  var out = [];
  for (var cat in vocab.motions) {
    if (Object.prototype.hasOwnProperty.call(vocab.motions, cat)) {
      out = out.concat(vocab.motions[cat]);
    }
  }
  return out;
}

module.exports = {
  'vocabulary, schema, and example are valid JSON': function () {
    assert.ok(vocab.motions && vocab.easing && vocab.styles && vocab.stagger_orders);
    assert.strictEqual(schema.title, 'SmartMotionSuggestions');
    assert.ok(example.suggestions);
  },

  'example provides exactly the three required suggestions': function () {
    var keys = Object.keys(example.suggestions).sort();
    assert.deepStrictEqual(keys, ['corporate', 'dynamic', 'educational']);
  },

  'every token used by the example exists in the vocabulary': function () {
    var motions = allMotions();
    var problems = [];
    var groups = example.suggestions;
    for (var key in groups) {
      if (!Object.prototype.hasOwnProperty.call(groups, key)) { continue; }
      var s = groups[key];
      for (var i = 0; i < s.parts_motion.length; i++) {
        var m = s.parts_motion[i].motion;
        if (motions.indexOf(m) === -1) { problems.push(key + ': motion "' + m + '"'); }
      }
      if (vocab.easing.indexOf(s.global.easing) === -1) { problems.push(key + ': easing "' + s.global.easing + '"'); }
      if (vocab.styles.indexOf(s.global.style) === -1) { problems.push(key + ': style "' + s.global.style + '"'); }
      if (vocab.stagger_orders.indexOf(s.global.stagger.order) === -1) { problems.push(key + ': stagger "' + s.global.stagger.order + '"'); }
      var d = s.global.duration_s;
      if (d < vocab.param_ranges.duration_s.min || d > vocab.param_ranges.duration_s.max) {
        problems.push(key + ': duration_s ' + d + ' out of range');
      }
    }
    assert.deepStrictEqual(problems, [], 'unknown/out-of-range tokens:\n  ' + problems.join('\n  '));
  },

  'wifi example is executable: tokens known + parts grounded in the report': function () {
    var input = JSON.parse(fs.readFileSync(path.join(aiDir, 'examples', 'wifi.input.json'), 'utf8'));
    var output = JSON.parse(fs.readFileSync(path.join(aiDir, 'examples', 'wifi.output.json'), 'utf8'));
    var motions = allMotions();
    var allowedParts = input.parts.map(function (p) { return p.id; });
    var groups = output.suggestions;
    assert.deepStrictEqual(Object.keys(groups).sort(), ['corporate', 'dynamic', 'educational']);
    var problems = [];
    for (var key in groups) {
      if (!Object.prototype.hasOwnProperty.call(groups, key)) { continue; }
      var s = groups[key];
      for (var i = 0; i < s.parts_motion.length; i++) {
        var pm = s.parts_motion[i];
        if (motions.indexOf(pm.motion) === -1) { problems.push(key + ': unknown motion ' + pm.motion); }
        if (allowedParts.indexOf(pm.part) === -1) { problems.push(key + ': ungrounded part ' + pm.part); }
      }
      if (vocab.easing.indexOf(s.global.easing) === -1) { problems.push(key + ': easing ' + s.global.easing); }
      if (vocab.styles.indexOf(s.global.style) === -1) { problems.push(key + ': style ' + s.global.style); }
      if (vocab.stagger_orders.indexOf(s.global.stagger.order) === -1) { problems.push(key + ': stagger ' + s.global.stagger.order); }
      if (s.global.duration_s < 0.3 || s.global.duration_s > 4) { problems.push(key + ': duration out of asked range (<=4s)'); }
    }
    assert.deepStrictEqual(problems, [], 'wifi output problems:\n  ' + problems.join('\n  '));
  }
};
