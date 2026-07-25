// scale-pop-standalone.jsx — first animator: Scale Pop (self-contained, NO #include).
//
// Run via File > Scripts > Run Script File with a shape layer selected.
// Each top-level group "pops" into place: scale 20 -> 112 -> 100 with a soft
// overshoot, plus a quick opacity fade-in, staggered across the groups. Real
// Bezier easing (never linear). One clean undo group.
//
// Built against the verified structure of an SVG-imported shape layer:
//   ADBE Root Vectors Group
//     ADBE Vector Group           (one per part)
//       ADBE Vectors Group        (Contents)
//         ADBE Vector Shape - Group -> ADBE Vector Shape (the path)
//       ADBE Vector Transform Group
//         ADBE Vector Anchor / ADBE Vector Position / ADBE Vector Scale /
//         ADBE Vector Group Opacity
//
// Anchor handling: SVG imports leave each group's anchor at [0,0] (a corner),
// so scaling would grow the part from that corner. We move the anchor to the
// part's geometric center and compensate Position by the same amount, so at
// 100% NOTHING moves — the icon's final look is identical, it just pops from
// each part's own center. Only done when the anchor is still the default [0,0].

(function () {

    // ---- tunables ----
    var DUR = 0.5;        // seconds per part
    var STAGGER = 0.07;   // seconds between parts
    var S_START = 20;     // start scale %
    var S_OVER = 112;     // overshoot peak %
    var S_END = 100;      // settle %

    function ease(infl) { return new KeyframeEase(0, infl); }

    function bezier2(prop, idx, inInfl, outInfl) {
        prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        prop.setTemporalEaseAtKey(idx, [ease(inInfl), ease(inInfl)], [ease(outInfl), ease(outInfl)]);
    }
    function bezier1(prop, idx, inInfl, outInfl) {
        prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        prop.setTemporalEaseAtKey(idx, [ease(inInfl)], [ease(outInfl)]);
    }

    // bounding-box center of all paths in a group, in the group's content space
    function groupCenter(group) {
        var vg = group.property("ADBE Vectors Group");
        if (!vg) { return null; }
        var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, found = false;
        for (var i = 1; i <= vg.numProperties; i++) {
            var p = vg.property(i);
            if (p.matchName !== "ADBE Vector Shape - Group") { continue; }
            var sh = p.property("ADBE Vector Shape");
            if (!sh) { continue; }
            var verts;
            try { verts = sh.value.vertices; } catch (e) { continue; }
            for (var j = 0; j < verts.length; j++) {
                var x = verts[j][0], y = verts[j][1];
                if (x < minX) { minX = x; }
                if (y < minY) { minY = y; }
                if (x > maxX) { maxX = x; }
                if (y > maxY) { maxY = y; }
                found = true;
            }
        }
        if (!found) { return null; }
        return [(minX + maxX) / 2, (minY + maxY) / 2];
    }

    function animateGroup(group, t0) {
        var xf = group.property("ADBE Vector Transform Group");
        if (!xf) { return false; }
        var scaleP = xf.property("ADBE Vector Scale");
        var opacP = xf.property("ADBE Vector Group Opacity");
        var anchorP = xf.property("ADBE Vector Anchor");
        var posP = xf.property("ADBE Vector Position");
        if (!scaleP || !opacP) { return false; }

        // Re-center the anchor without moving the part (only if still default).
        try {
            var a = anchorP.value;
            if (a[0] === 0 && a[1] === 0) {
                var c = groupCenter(group);
                if (c) {
                    anchorP.setValue(c);
                    var pv = posP.value;
                    posP.setValue([pv[0] + c[0], pv[1] + c[1]]);
                }
            }
        } catch (eAnchor) {}

        var tPop = t0 + DUR * 0.68;
        var t1 = t0 + DUR;

        // Scale: 20 -> 112 -> 100
        scaleP.setValueAtTime(t0, [S_START, S_START]);
        scaleP.setValueAtTime(tPop, [S_OVER, S_OVER]);
        scaleP.setValueAtTime(t1, [S_END, S_END]);
        bezier2(scaleP, 1, 75, 20); // fast start
        bezier2(scaleP, 2, 55, 55); // through the overshoot peak
        bezier2(scaleP, 3, 75, 20); // slow settle in

        // Opacity: 0 -> 100 (faster than the scale)
        opacP.setValueAtTime(t0, 0);
        opacP.setValueAtTime(t0 + DUR * 0.45, 100);
        bezier1(opacP, 1, 75, 20);
        bezier1(opacP, 2, 75, 20);

        return true;
    }

    function animateLayer(layer) {
        var root = layer.property("ADBE Root Vectors Group");
        if (!root) { return 0; }
        layer.motionBlur = true;
        var count = 0, n = 0;
        for (var i = 1; i <= root.numProperties; i++) {
            var g = root.property(i);
            if (g.matchName !== "ADBE Vector Group") { continue; }
            var t0 = layer.inPoint + n * STAGGER;
            if (animateGroup(g, t0)) { count++; }
            n++;
        }
        return count;
    }

    // ---- main ----
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("افتح تركيباً وحدّده أولاً، ثم أعد التشغيل.");
        return;
    }
    var sel = comp.selectedLayers;
    if (sel.length < 1) {
        alert("حدّد طبقة Shape واحدة على الأقل ثم أعد التشغيل.");
        return;
    }

    app.beginUndoGroup("Icon M Pro: Scale Pop");
    var totalParts = 0, shapeLayers = 0;
    try {
        for (var i = 0; i < sel.length; i++) {
            var layer = sel[i];
            if (!(layer instanceof ShapeLayer)) { continue; }
            shapeLayers++;
            totalParts += animateLayer(layer);
        }
        comp.motionBlur = true;
    } catch (e) {
        alert("خطأ أثناء التحريك:\n" + e.toString() + (e.line ? ("\nسطر: " + e.line) : ""));
    } finally {
        app.endUndoGroup();
    }

    if (shapeLayers === 0) {
        alert("لم يتم العثور على طبقة Shape ضمن التحديد.\nحدّد طبقة Shape (مثل factory-icon.svg).");
    } else {
        alert("تم تطبيق Scale Pop على " + totalParts + " جزء في " + shapeLayers + " طبقة.\n\n" +
            "اضغط مفتاح المسافة للمعاينة (RAM Preview).\n" +
            "للتراجع: Cmd+Z (خطوة واحدة نظيفة).");
    }

})();
