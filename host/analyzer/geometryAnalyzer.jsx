// geometryAnalyzer.jsx — Geometry Analyzer v1 (read-only).
//
// Walks a selected shape layer via verified matchNames and returns a structured
// report: counts of groups / paths (open|closed|empty) / fills / strokes,
// distinct colors, distinct stroke widths, complexity, and warnings.
//
// HONESTY / SCOPE:
//  - This pass NEVER mutates the project.
//  - It uses ONLY matchNames verified in CLAUDE.md §3. Gradients, line caps,
//    and line joins need matchNames NOT on that list, so they are reported as
//    warnings ("needs_verified_matchname") rather than guessed. Do not invent.
//  - Advanced geometry (symmetry, visual center of gravity, direction,
//    geometric relations) is Phase 3+ and is deliberately absent here.

if (typeof IMP === "undefined") { var IMP = {}; }

IMP.analyzer = (function () {

    var MN = IMP.MN;
    var U = IMP.util;

    function clamp255(x) {
        x = Math.round(x * 255);
        if (x < 0) { return 0; }
        if (x > 255) { return 255; }
        return x;
    }

    function hex2(n) {
        var s = n.toString(16);
        return s.length < 2 ? ("0" + s) : s;
    }

    function rgbToHex(v) {
        // v is [r,g,b(,a)] with channels 0..1
        return "#" + hex2(clamp255(v[0])) + hex2(clamp255(v[1])) + hex2(clamp255(v[2]));
    }

    function newLayerReport(layer) {
        return {
            index: layer.index,
            name: String(layer.name),
            type: "unknown",
            supported: false,
            counts: {
                groups: 0,
                paths: 0,
                pathsOpen: 0,
                pathsClosed: 0,
                pathsEmpty: 0,
                fills: 0,
                strokes: 0
            },
            colors: [],        // distinct hex strings
            strokeWidths: [],  // distinct numbers
            hasOpacityBelow100: false,
            complexity: "simple",
            warnings: []        // array of { code, detail }
        };
    }

    function addWarn(rep, code, detail) {
        rep.warnings.push({ code: code, detail: String(detail) });
    }

    // classify a bezier path container (ADBE Vector Shape - Group)
    function readBezierPath(shapeGroup, rep) {
        var pathProp = shapeGroup.property(MN.SHAPE_PATH);
        if (!pathProp) { return; }
        rep.counts.paths++;
        var shp;
        try { shp = pathProp.value; } catch (e) { return; }
        var verts = [];
        try { verts = shp.vertices; } catch (e2) { verts = []; }
        if (verts.length < 2) { rep.counts.pathsEmpty++; }
        var closed = false;
        try { closed = shp.closed; } catch (e3) { closed = false; }
        if (closed) { rep.counts.pathsClosed++; } else { rep.counts.pathsOpen++; }
    }

    function readFill(fillGroup, rep) {
        rep.counts.fills++;
        var c = fillGroup.property(MN.FILL_COLOR);
        if (c) {
            try { U.pushUnique(rep.colors, rgbToHex(c.value)); } catch (e) {}
        }
    }

    function readStroke(strokeGroup, rep) {
        rep.counts.strokes++;
        var c = strokeGroup.property(MN.STROKE_COLOR);
        if (c) {
            try { U.pushUnique(rep.colors, rgbToHex(c.value)); } catch (e) {}
        }
        var w = strokeGroup.property(MN.STROKE_WIDTH);
        if (w) {
            try { U.pushUnique(rep.strokeWidths, U.round(w.value, 3)); } catch (e2) {}
        }
    }

    // Recursively walk a property group inside the shape tree.
    function walk(group, rep) {
        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i);
            var mn = p.matchName;

            if (mn === MN.VECTOR_GROUP) {
                rep.counts.groups++;
                walk(p, rep); // its Contents live under ADBE Vectors Group
            } else if (mn === MN.VECTORS_GROUP) {
                walk(p, rep);
            } else if (mn === MN.SHAPE_GROUP) {
                readBezierPath(p, rep);
            } else if (mn === MN.SHAPE_RECT || mn === MN.SHAPE_ELLIPSE || mn === MN.SHAPE_STAR) {
                rep.counts.paths++;
                rep.counts.pathsClosed++; // parametric primitives are closed
            } else if (mn === MN.FILL) {
                readFill(p, rep);
            } else if (mn === MN.STROKE) {
                readStroke(p, rep);
            } else if (mn === MN.TRIM || mn === MN.MERGE || mn === MN.REPEATER) {
                addWarn(rep, "existing_modifier", mn);
            } else if (mn === MN.VECTOR_XFORM) {
                // group transform — skip, not part of geometry counting
            } else if (mn.substring(0, 20) === "ADBE Vector Graphic ") {
                // gradient fill/stroke or other graphic we cannot read with a
                // verified matchName. Surface it instead of guessing.
                addWarn(rep, "needs_verified_matchname", mn);
            } else if (p.propertyType !== PropertyType.PROPERTY) {
                walk(p, rep);
            }
        }
    }

    function classifyComplexity(rep) {
        var n = rep.counts.paths;
        if (n <= 3) { return "simple"; }
        if (n <= 12) { return "medium"; }
        return "complex";
    }

    function analyzeLayer(layer) {
        var rep = newLayerReport(layer);

        if (layer instanceof ShapeLayer) { rep.type = "ShapeLayer"; rep.supported = true; }
        else if (layer instanceof TextLayer) { rep.type = "TextLayer"; }
        else if (layer instanceof AVLayer) { rep.type = "AVLayer"; }
        else { rep.type = "other"; }

        if (!rep.supported) {
            addWarn(rep, "unsupported_layer_type", rep.type);
            return rep;
        }

        var root = layer.property(MN.ROOT_VECTORS);
        if (!root) {
            addWarn(rep, "no_shape_contents", "ADBE Root Vectors Group missing");
            return rep;
        }

        walk(root, rep);

        // layer opacity check (transform opacity, current value)
        try {
            var op = layer.property(MN.TRANSFORM).property(MN.OPACITY);
            if (op && op.value < 100) { rep.hasOpacityBelow100 = true; }
        } catch (e) {}

        rep.complexity = classifyComplexity(rep);
        return rep;
    }

    // Build the full report over the comp's selected layers.
    function analyzeSelection(comp) {
        var out = {
            ok: true,
            message: "",
            comp: {
                name: String(comp.name),
                width: comp.width,
                height: comp.height,
                frameRate: U.round(comp.frameRate, 4),
                frameDuration: U.round(comp.frameDuration, 6),
                duration: U.round(comp.duration, 4)
            },
            layers: []
        };
        var sel = comp.selectedLayers; // 0-based JS array
        for (var i = 0; i < sel.length; i++) {
            out.layers.push(analyzeLayer(sel[i]));
        }
        return out;
    }

    return {
        analyzeLayer: analyzeLayer,
        analyzeSelection: analyzeSelection
    };
})();
