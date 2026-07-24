// logger.jsx — deep property inspector (developer tool, standalone).
//
// Run via File > Scripts > Run Script File with one or more layers selected.
// Walks each selected layer recursively and writes matchName, display name,
// value type, current value, and keyframe times to logs/inspect.txt.
// The human runs it and pastes the output back so we can write animators
// against a KNOWN structure instead of guessing (CLAUDE.md §6).
//
// Read-only: never mutates the project, so no undo group. This file is NOT
// included by host/index.jsx (its IIFE runs immediately and shows an alert).

#include "utils.jsx"

(function () {

    var U = IMP.util;

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
        if (U.isArray(v)) {
            var parts = [];
            for (var i = 0; i < v.length; i++) { parts.push(U.fmtNum(v[i])); }
            return "[" + parts.join(", ") + "]";
        }
        if (typeof v === "number") { return U.fmtNum(v); }
        if (typeof v === "object") { return "<object>"; }
        return String(v);
    }

    function keyInfo(p, frameDuration) {
        var n = 0;
        try { n = p.numKeys; } catch (e) { return ""; }
        if (n < 1) { return ""; }
        var times = [];
        for (var k = 1; k <= n; k++) { // keyframe indices are 1-based
            var t = p.keyTime(k);
            times.push(U.fmtNum(t) + "s(f" + Math.round(t / frameDuration) + ")");
        }
        return " | keys[" + n + "]: " + times.join(", ");
    }

    function walkGroup(group, depth, lines, frameDuration) {
        var indent = U.repeat("  ", depth);
        for (var i = 1; i <= group.numProperties; i++) { // 1-based
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

    function repoRoot() {
        // host/lib/logger.jsx -> root is three folders up.
        return new File($.fileName).parent.parent.parent;
    }

    function writeLog(text) {
        var folder = new Folder(repoRoot().fsName + "/logs");
        if (!folder.exists) { folder.create(); }
        var f = new File(folder.fsName + "/inspect.txt");
        f.encoding = "UTF-8";
        if (!f.open("w")) {
            alert("Could not open log file for writing:\n" + f.fsName +
                "\n\nEnable Preferences > Scripting & Expressions >" +
                "\n'Allow Scripts to Write Files and Access Network'.");
            return null;
        }
        f.write(text);
        f.close();
        return f.fsName;
    }

    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("Select a composition (open it and click in the timeline), then re-run.");
        return;
    }
    var sel = comp.selectedLayers; // 0-based JS array
    if (sel.length < 1) {
        alert("Select at least one layer in \"" + comp.name + "\", then re-run.");
        return;
    }

    var lines = [];
    lines.push("=== Icon Motion inspect ===");
    lines.push("AE version: " + app.version);
    lines.push("Comp: \"" + comp.name + "\" | " + comp.width + "x" + comp.height +
        " | frameRate=" + U.fmtNum(comp.frameRate) +
        " | frameDuration=" + U.fmtNum(comp.frameDuration) +
        " | duration=" + U.fmtNum(comp.duration) + "s");
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
            " | inPoint=" + U.fmtNum(layer.inPoint) + "s" +
            " | outPoint=" + U.fmtNum(layer.outPoint) + "s" +
            " | motionBlur=" + layer.motionBlur);
        walkGroup(layer, 0, lines, comp.frameDuration);
        lines.push("");
    }

    var path = writeLog(lines.join("\n"));
    if (path !== null) {
        alert("Inspect log written:\n" + path +
            "\n\nLayers logged: " + sel.length +
            "\nPaste the file contents back to Claude.");
    }

})();
