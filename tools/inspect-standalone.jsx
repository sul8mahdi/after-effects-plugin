// inspect-standalone.jsx — self-contained deep inspector (NO #include).
//
// Run via File > Scripts > Run Script File with a shape layer selected.
// Writes the layer's full structure (matchName, type, value, keyframe times)
// to ~/Desktop/icon-motion-inspect.txt. Everything it needs is inlined, so it
// can be run from anywhere (Desktop included) without adjacent files.
//
// Requires: Preferences > Scripting & Expressions >
//           'Allow Scripts to Write Files and Access Network'.

(function () {

    // ---- inlined ES3 helpers ----
    function repeat(s, n) { var o = ""; for (var i = 0; i < n; i++) { o += s; } return o; }
    function round4(n) { return Math.round(n * 10000) / 10000; }
    function isArr(v) {
        return v !== null && typeof v === "object" &&
               typeof v.length === "number" && typeof v.join === "function";
    }
    function fmt(n) { return (typeof n === "number") ? String(round4(n)) : String(n); }

    function valueTypeName(p) {
        var t = p.propertyValueType;
        if (t === PropertyValueType.NO_VALUE) { return "NO_VALUE"; }
        if (t === PropertyValueType.ThreeD_SPATIAL) { return "3D_SPATIAL"; }
        if (t === PropertyValueType.ThreeD) { return "3D"; }
        if (t === PropertyValueType.TwoD_SPATIAL) { return "2D_SPATIAL"; }
        if (t === PropertyValueType.TwoD) { return "2D"; }
        if (t === PropertyValueType.OneD) { return "1D"; }
        if (t === PropertyValueType.COLOR) { return "COLOR"; }
        if (t === PropertyValueType.CUSTOM_VALUE) { return "CUSTOM"; }
        if (t === PropertyValueType.MARKER) { return "MARKER"; }
        if (t === PropertyValueType.SHAPE) { return "SHAPE"; }
        if (t === PropertyValueType.TEXT_DOCUMENT) { return "TEXT"; }
        return "UNKNOWN(" + t + ")";
    }

    function formatValue(p) {
        var v;
        try { v = p.value; } catch (e) { return "<unreadable>"; }
        if (v === null || typeof v === "undefined") { return "<none>"; }
        if (p.propertyValueType === PropertyValueType.SHAPE) {
            var closed = "?", nVerts = "?";
            try { closed = String(v.closed); } catch (e1) {}
            try { nVerts = String(v.vertices.length); } catch (e2) {}
            return "Shape(vertices=" + nVerts + ", closed=" + closed + ")";
        }
        if (isArr(v)) {
            var parts = [];
            for (var i = 0; i < v.length; i++) { parts.push(fmt(v[i])); }
            return "[" + parts.join(", ") + "]";
        }
        if (typeof v === "number") { return fmt(v); }
        if (typeof v === "object") { return "<object>"; }
        return String(v);
    }

    function keyInfo(p, frameDuration) {
        var n = 0;
        try { n = p.numKeys; } catch (e) { return ""; }
        if (n < 1) { return ""; }
        var times = [];
        for (var k = 1; k <= n; k++) {
            var t = p.keyTime(k);
            times.push(fmt(t) + "s(f" + Math.round(t / frameDuration) + ")");
        }
        return " | keys[" + n + "]: " + times.join(", ");
    }

    function walkGroup(group, depth, lines, frameDuration) {
        var indent = repeat("  ", depth);
        for (var i = 1; i <= group.numProperties; i++) {
            var p;
            try { p = group.property(i); }
            catch (e) { lines.push(indent + "<error reading property " + i + ": " + e.toString() + ">"); continue; }
            if (p.propertyType === PropertyType.PROPERTY) {
                lines.push(indent + p.matchName + " | \"" + p.name + "\" | " +
                    valueTypeName(p) + " | value=" + formatValue(p) +
                    keyInfo(p, frameDuration));
            } else {
                lines.push(indent + p.matchName + " | \"" + p.name + "\" {");
                walkGroup(p, depth + 1, lines, frameDuration);
                lines.push(indent + "}");
            }
        }
    }

    function writeLog(text) {
        var f = new File("~/Desktop/icon-motion-inspect.txt");
        f.encoding = "UTF-8";
        if (!f.open("w")) {
            alert("تعذّرت الكتابة على سطح المكتب.\n\nفعّل: Preferences > Scripting & Expressions >\n" +
                "'Allow Scripts to Write Files and Access Network' ثم أعد التشغيل.");
            return null;
        }
        f.write(text);
        f.close();
        return f.fsName;
    }

    // ---- main ----
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("افتح تركيباً وحدّده أولاً (Select a composition), ثم أعد التشغيل.");
        return;
    }
    var sel = comp.selectedLayers;
    if (sel.length < 1) {
        alert("حدّد طبقة واحدة على الأقل داخل \"" + comp.name + "\" ثم أعد التشغيل.");
        return;
    }

    var lines = [];
    lines.push("=== Icon Motion inspect ===");
    lines.push("AE version: " + app.version);
    lines.push("Comp: \"" + comp.name + "\" | " + comp.width + "x" + comp.height +
        " | frameRate=" + fmt(comp.frameRate) +
        " | frameDuration=" + fmt(comp.frameDuration) +
        " | duration=" + fmt(comp.duration) + "s");
    lines.push("Selected layers: " + sel.length);
    lines.push("");

    for (var i = 0; i < sel.length; i++) {
        var layer = sel[i];
        lines.push("--- Layer " + layer.index + ": \"" + layer.name + "\" ---");
        var kind = "unknown";
        if (layer instanceof ShapeLayer) { kind = "ShapeLayer"; }
        else if (layer instanceof TextLayer) { kind = "TextLayer"; }
        else if (layer instanceof AVLayer) { kind = "AVLayer"; }
        else if (layer instanceof CameraLayer) { kind = "CameraLayer"; }
        else if (layer instanceof LightLayer) { kind = "LightLayer"; }
        lines.push("type=" + kind +
            " | inPoint=" + fmt(layer.inPoint) + "s" +
            " | outPoint=" + fmt(layer.outPoint) + "s" +
            " | motionBlur=" + layer.motionBlur);
        walkGroup(layer, 0, lines, comp.frameDuration);
        lines.push("");
    }

    var path = writeLog(lines.join("\n"));
    if (path !== null) {
        alert("تم! الملف كُتب على سطح المكتب:\n" + path +
            "\n\nافتح Terminal والصق:\ncat ~/Desktop/icon-motion-inspect.txt");
    }

})();
