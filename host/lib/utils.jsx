// utils.jsx — ES3-safe helpers + a controlled JSON serializer.
//
// ExtendScript is ECMAScript 3: no Array.forEach/map, no String.trim,
// no native JSON. Everything here is written against ES3 only.
//
// The serializer (IMP.util.stringify) handles ONLY our own report data
// shapes (object / array / string / number / boolean / null). It is NOT a
// general JSON parser — parsing happens natively on the CEP panel side.
// This respects CLAUDE.md §5 (do not hand-roll a JSON *parser* in ES3).

// global namespace
if (typeof IMP === "undefined") { var IMP = {}; }

IMP.util = (function () {

    function trim(s) {
        s = String(s);
        var start = 0;
        var end = s.length - 1;
        while (start <= end && s.charCodeAt(start) <= 32) { start++; }
        while (end >= start && s.charCodeAt(end) <= 32) { end--; }
        return s.substring(start, end + 1);
    }

    function repeat(s, n) {
        var out = "";
        for (var i = 0; i < n; i++) { out += s; }
        return out;
    }

    function indexOf(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === item) { return i; }
        }
        return -1;
    }

    function isArray(v) {
        return v !== null &&
               typeof v === "object" &&
               typeof v.length === "number" &&
               typeof v.join === "function";
    }

    function hasOwnProp(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    // push value into arr only if not already present (ES3 has no Set)
    function pushUnique(arr, value) {
        if (indexOf(arr, value) === -1) { arr.push(value); }
        return arr;
    }

    function round(n, decimals) {
        var f = Math.pow(10, decimals);
        return Math.round(n * f) / f;
    }

    function fmtNum(n) {
        if (typeof n !== "number") { return String(n); }
        return String(round(n, 4));
    }

    // --- controlled serializer for our report objects ---

    function escapeStr(s) {
        s = String(s);
        var out = "";
        for (var i = 0; i < s.length; i++) {
            var c = s.charAt(i);
            var code = s.charCodeAt(i);
            if (c === "\"") { out += "\\\""; }
            else if (c === "\\") { out += "\\\\"; }
            else if (c === "\n") { out += "\\n"; }
            else if (c === "\r") { out += "\\r"; }
            else if (c === "\t") { out += "\\t"; }
            else if (code < 32) {
                var hex = code.toString(16);
                out += "\\u" + repeat("0", 4 - hex.length) + hex;
            } else { out += c; }
        }
        return out;
    }

    function stringify(v) {
        if (v === null || typeof v === "undefined") { return "null"; }
        var t = typeof v;
        if (t === "number") {
            if (isNaN(v) || !isFinite(v)) { return "null"; }
            return String(v);
        }
        if (t === "boolean") { return v ? "true" : "false"; }
        if (t === "string") { return "\"" + escapeStr(v) + "\""; }
        if (isArray(v)) {
            var parts = [];
            for (var i = 0; i < v.length; i++) { parts.push(stringify(v[i])); }
            return "[" + parts.join(",") + "]";
        }
        if (t === "object") {
            var pairs = [];
            for (var k in v) {
                if (hasOwnProp(v, k)) {
                    pairs.push("\"" + escapeStr(k) + "\":" + stringify(v[k]));
                }
            }
            return "{" + pairs.join(",") + "}";
        }
        return "null";
    }

    return {
        trim: trim,
        repeat: repeat,
        indexOf: indexOf,
        isArray: isArray,
        hasOwnProp: hasOwnProp,
        pushUnique: pushUnique,
        round: round,
        fmtNum: fmtNum,
        stringify: stringify
    };

})();
