// api.jsx — the callable surface the CEP panel invokes via evalScript.
//
// Every function returns a JSON STRING (evalScript can only return strings).
// Every function is wrapped so it ALWAYS returns valid JSON, even on failure:
//   success -> the payload object with ok:true
//   failure -> { ok:false, code:"<stable_code>", error:"<message>" }
// The panel maps `code` to a localized message; `error` is the raw detail for
// the copyable error log. Codes are stable identifiers, never localized text.

if (typeof IMP === "undefined") { var IMP = {}; }

IMP.api = (function () {

    var U = IMP.util;

    function ok(payload) {
        payload.ok = true;
        return U.stringify(payload);
    }

    function fail(code, error) {
        if (IMP.log) { IMP.log.error(code + ": " + error); }
        return U.stringify({ ok: false, code: code, error: String(error) });
    }

    function activeComp() {
        var c = app.project ? app.project.activeItem : null;
        if (c && c instanceof CompItem) { return c; }
        return null;
    }

    // --- public calls ---

    function ping() {
        return ok({ message: "pong", aeVersion: String(app.version) });
    }

    // Panel supplies the extension root once at startup (CEP knows the path).
    function init(rootPath) {
        try {
            if (rootPath) { IMP.env.setRoot(rootPath); }
            if (IMP.log) { IMP.log.info("init root=" + IMP.env.getRoot()); }
            return ok({ root: IMP.env.getRoot(), aeVersion: String(app.version) });
        } catch (e) {
            return fail("exception", e.toString());
        }
    }

    function analyzeSelection() {
        try {
            var comp = activeComp();
            if (!comp) { return fail("no_comp", "activeItem is not a CompItem"); }
            if (comp.selectedLayers.length < 1) {
                return fail("no_selection", "no layers selected in " + comp.name);
            }
            var report = IMP.analyzer.analyzeSelection(comp);
            if (IMP.log) {
                IMP.log.info("analyzeSelection: " + report.layers.length + " layer(s) in \"" + comp.name + "\"");
            }
            return ok(report);
        } catch (e) {
            return fail("exception", e.toString() + (e.line ? (" (line " + e.line + ")") : ""));
        }
    }

    return {
        ping: ping,
        init: init,
        analyzeSelection: analyzeSelection
    };
})();
