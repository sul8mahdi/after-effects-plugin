// undo.jsx — safe undo wrapper and tool-tagging scheme.
//
// Two guarantees required by the brief (§14) and CLAUDE.md §2:
//   1. Every project mutation runs inside one clean undo group.
//   2. Reset removes ONLY elements this tool created, never the user's work.
//
// Tagging: anything the tool adds (a Trim Paths group, an effect, a keyframed
// property container) is named with the TAG prefix. A future Reset walks the
// layer and removes only tagged property groups. User keyframes on untagged
// properties are never touched.
//
// NOTE (Phase 1): motion is not yet created, so removeTagged() is scaffolding —
// implemented and unit-reasoned, but not yet exercised against real animators.
// It is intentionally conservative: it only removes INDEXED/NAMED groups whose
// name carries the tag, and never deletes a property it did not create.

if (typeof IMP === "undefined") { var IMP = {}; }

IMP.undo = (function () {

    var TAG = "IMP:"; // prefix marking tool-created, removable elements

    // Run fn inside a single undo group. Returns {ok:Boolean, error:String|null}.
    function run(label, fn) {
        app.beginUndoGroup(String(label));
        var result = { ok: true, error: null };
        try {
            fn();
        } catch (e) {
            result.ok = false;
            result.error = e.toString() + (e.line ? (" (line " + e.line + ")") : "");
            if (IMP.log) { IMP.log.error("undo[" + label + "]: " + result.error); }
        } finally {
            app.endUndoGroup();
        }
        return result;
    }

    function tagName(base) { return TAG + String(base); }

    function isTagged(name) {
        return String(name).substring(0, TAG.length) === TAG;
    }

    // Remove only tagged group properties directly under a property group.
    // Recurses into untagged groups so nested tool artifacts are also removed,
    // but never deletes an untagged leaf property or user keyframes.
    function removeTagged(group) {
        var removed = 0;
        // Iterate high -> low because removing shifts 1-based indices.
        for (var i = group.numProperties; i >= 1; i--) {
            var p = group.property(i);
            if (p.propertyType === PropertyType.PROPERTY) { continue; }
            if (isTagged(p.name)) {
                try { p.remove(); removed++; }
                catch (e) { if (IMP.log) { IMP.log.warn("removeTagged: " + e.toString()); } }
            } else {
                removed += removeTagged(p);
            }
        }
        return removed;
    }

    return {
        TAG: TAG,
        run: run,
        tagName: tagName,
        isTagged: isTagged,
        removeTagged: removeTagged
    };
})();
