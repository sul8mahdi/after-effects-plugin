// draw-on-standalone.jsx — Draw On animator (self-contained, NO #include).
//
// Run via File > Scripts > Run Script File with an OUTLINE shape layer selected
// (each group has a Stroke). Adds a Trim Paths to each top-level group and
// keyframes its End from 0 -> 100, staggered, so the icon draws itself part by
// part with real Bezier easing (fast start, settles). One clean undo group.
//
// This is the project's core "draw first" motion for line icons. Other touches
// (scale/settle/loops) come AFTER, layered on top of this base.
//
// Verified structure (from a real SVG-import inspect):
//   ADBE Root Vectors Group
//     ADBE Vector Group            (one per part)
//       ADBE Vectors Group         (Contents) <- Trim Paths added here
//         ADBE Vector Shape - Group -> ADBE Vector Shape
//         ADBE Vector Graphic - Stroke
//   Trim Paths     = ADBE Vector Filter - Trim
//   Trim End       = ADBE Vector Trim End

(function () {

    // ---- tunables ----
    var DUR = 0.6;        // seconds to draw each part
    var STAGGER = 0.18;   // seconds between parts (clear part-by-part sequence)

    function ease(infl) { return new KeyframeEase(0, infl); }

    function bezier1(prop, idx, inInfl, outInfl) {
        prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        prop.setTemporalEaseAtKey(idx, [ease(inInfl)], [ease(outInfl)]);
    }

    function drawGroup(group, t0) {
        var contents = group.property("ADBE Vectors Group");
        if (!contents) { return false; }

        // Reuse an existing Trim if present, else add one.
        var trim = null;
        for (var i = 1; i <= contents.numProperties; i++) {
            if (contents.property(i).matchName === "ADBE Vector Filter - Trim") {
                trim = contents.property(i); break;
            }
        }
        if (!trim) {
            if (!contents.canAddProperty("ADBE Vector Filter - Trim")) { return false; }
            trim = contents.addProperty("ADBE Vector Filter - Trim");
        }

        var endP = trim.property("ADBE Vector Trim End");
        if (!endP) { return false; }

        var t1 = t0 + DUR;
        endP.setValueAtTime(t0, 0);
        endP.setValueAtTime(t1, 100);
        bezier1(endP, 1, 75, 20); // fast start
        bezier1(endP, 2, 75, 20); // settle into 100
        return true;
    }

    function drawLayer(layer) {
        var root = layer.property("ADBE Root Vectors Group");
        if (!root) { return 0; }
        var count = 0, n = 0;
        for (var i = 1; i <= root.numProperties; i++) {
            var g = root.property(i);
            if (g.matchName !== "ADBE Vector Group") { continue; }
            var t0 = layer.inPoint + n * STAGGER;
            if (drawGroup(g, t0)) { count++; }
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

    app.beginUndoGroup("Icon M Pro: Draw On");
    var totalParts = 0, shapeLayers = 0;
    try {
        for (var i = 0; i < sel.length; i++) {
            var layer = sel[i];
            if (!(layer instanceof ShapeLayer)) { continue; }
            shapeLayers++;
            totalParts += drawLayer(layer);
        }
    } catch (e) {
        alert("خطأ أثناء الرسم:\n" + e.toString() + (e.line ? ("\nسطر: " + e.line) : ""));
    } finally {
        app.endUndoGroup();
    }

    if (shapeLayers === 0) {
        alert("لم يتم العثور على طبقة Shape ضمن التحديد.\nحدّد طبقة Shape (مثل factory-icon.svg).");
    } else if (totalParts === 0) {
        alert("لم يُضَف رسم. تأكّد أن الطبقة تحتوي مجموعات فيها مسارات (Shape groups).");
    } else {
        alert("تم تطبيق Draw On على " + totalParts + " جزء في " + shapeLayers + " طبقة.\n\n" +
            "اضغط مفتاح المسافة للمعاينة (RAM Preview).\n" +
            "للتراجع: Cmd+Z (خطوة واحدة نظيفة).");
    }

})();
