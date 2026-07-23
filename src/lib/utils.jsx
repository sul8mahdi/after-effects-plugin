// utils.jsx — ES3-safe helpers for the Icon Motion Engine.
// No modern Array/String methods exist in ExtendScript; everything here
// is written against ECMAScript 3 only.

var IMUtils = {

    trim: function (s) {
        s = String(s);
        var start = 0;
        var end = s.length - 1;
        while (start <= end && (s.charCodeAt(start) <= 32)) {
            start++;
        }
        while (end >= start && (s.charCodeAt(end) <= 32)) {
            end--;
        }
        return s.substring(start, end + 1);
    },

    repeat: function (s, n) {
        var out = "";
        for (var i = 0; i < n; i++) {
            out += s;
        }
        return out;
    },

    indexOf: function (arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === item) {
                return i;
            }
        }
        return -1;
    },

    isArray: function (v) {
        return v !== null &&
               typeof v === "object" &&
               typeof v.length === "number" &&
               typeof v.join === "function";
    },

    hasOwnProp: function (obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    },

    // Round to 4 decimals so log output stays readable.
    fmtNum: function (n) {
        if (typeof n !== "number") {
            return String(n);
        }
        return String(Math.round(n * 10000) / 10000);
    }
};
