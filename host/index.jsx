// index.jsx — host engine entry point.
//
// Loaded once by CEP (ScriptPath in manifest.xml). Assembles the IMP namespace
// by including every host module in dependency order. After load, the panel
// calls e.g. IMP.api.analyzeSelection() via CSInterface.evalScript.
//
// Include order matters: a module may reference IMP.* built by an earlier one.

#include "lib/utils.jsx"
#include "lib/matchNames.jsx"
#include "lib/json2.jsx"
#include "core/log.jsx"
#include "core/undo.jsx"
#include "analyzer/geometryAnalyzer.jsx"
#include "bridge/api.jsx"

// Sanity marker so the panel can confirm the engine parsed and loaded.
IMP.LOADED = true;
IMP.VERSION = "0.1.0";
