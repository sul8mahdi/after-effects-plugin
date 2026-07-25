/*
 * run.js — zero-dependency test runner for the out-of-AE test suite.
 * Usage: node tests/run.js
 * Exits non-zero if any test fails (CI-friendly).
 */
'use strict';

var path = require('path');

var suites = [
  { name: 'i18n', mod: require('./i18n.test.js') },
  { name: 'geometryContract', mod: require('./geometryContract.test.js') },
  { name: 'es3lint', mod: require('./es3lint.test.js') },
  { name: 'localesSync', mod: require('./localesSync.test.js') },
  { name: 'aiVocabulary', mod: require('./aiVocabulary.test.js') }
];

var passed = 0;
var failed = 0;
var failures = [];

for (var s = 0; s < suites.length; s++) {
  var suite = suites[s];
  console.log('\n' + suite.name);
  for (var testName in suite.mod) {
    if (!Object.prototype.hasOwnProperty.call(suite.mod, testName)) { continue; }
    try {
      suite.mod[testName]();
      passed++;
      console.log('  ✓ ' + testName);
    } catch (e) {
      failed++;
      failures.push(suite.name + ' > ' + testName + ': ' + e.message);
      console.log('  ✗ ' + testName);
    }
  }
}

console.log('\n----------------------------------------');
console.log('passed: ' + passed + '   failed: ' + failed);
if (failed > 0) {
  console.log('\nFailures:');
  for (var i = 0; i < failures.length; i++) { console.log('  - ' + failures[i]); }
  process.exit(1);
}
console.log('all tests passed');
process.exit(0);
