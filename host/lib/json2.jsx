// json2.jsx — placeholder.
//
// CLAUDE.md §5: there is no native JSON in ExtendScript, and we must NOT
// hand-roll a parser. When two-way JSON is needed on the host side, vendor
// Douglas Crockford's ES3-compatible json2.js here:
//
//   https://github.com/douglascrockford/JSON-js/blob/master/json2.js
//
// After including it, JSON.parse / JSON.stringify work normally.
//
// Phase 1 does NOT need host-side JSON.parse: the host only *serializes*
// its report (IMP.util.stringify), and the CEP panel parses it natively.
// So this file is intentionally empty until a feature requires host parsing.
