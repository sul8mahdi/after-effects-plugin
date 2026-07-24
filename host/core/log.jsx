// log.jsx — host-side runtime logging.
//
// Writes structured lines to logs/host.log at the extension root. The root is
// supplied by the panel at startup via IMP.env.setRoot(...) because $.fileName
// is unreliable under CEP evalScript. Falls back to a $.fileName-derived root
// when the engine is run standalone (File > Scripts > Run Script File).
//
// Never throws to the caller: if the log write fails (e.g. the user has not
// enabled "Allow Scripts to Write Files"), it degrades to $.writeln and keeps
// going. A logging failure must never abort a user operation.

if (typeof IMP === "undefined") { var IMP = {}; }

IMP.env = (function () {
    var root = null;

    function setRoot(path) { root = String(path); }

    function getRoot() {
        if (root !== null) { return root; }
        // Fallback: this file is host/core/log.jsx -> root is three up.
        try {
            var self = new File($.fileName);
            return self.parent.parent.parent.fsName;
        } catch (e) {
            return Folder.temp.fsName;
        }
    }

    function logsFolder() {
        var f = new Folder(getRoot() + "/logs");
        if (!f.exists) { f.create(); }
        return f;
    }

    return { setRoot: setRoot, getRoot: getRoot, logsFolder: logsFolder };
})();

IMP.log = (function () {

    function pad2(n) { return (n < 10 ? "0" : "") + n; }

    function stamp() {
        var d = new Date();
        return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
               " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
    }

    function write(level, msg) {
        var line = "[" + stamp() + "] " + level + " " + String(msg);
        try {
            var f = new File(IMP.env.logsFolder().fsName + "/host.log");
            f.encoding = "UTF-8";
            if (f.open("a")) {
                f.write(line + "\n");
                f.close();
            } else {
                $.writeln(line);
            }
        } catch (e) {
            $.writeln(line);
        }
        return line;
    }

    return {
        info:  function (m) { return write("INFO ", m); },
        warn:  function (m) { return write("WARN ", m); },
        error: function (m) { return write("ERROR", m); }
    };
})();
