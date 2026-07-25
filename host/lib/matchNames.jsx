// matchNames.jsx — single source of truth for AE matchNames.
// Verified list copied from CLAUDE.md §3. Do NOT invent new ones here;
// if a needed matchName is missing, stop and ask.

if (typeof IMP === "undefined") { var IMP = {}; }

IMP.MN = {
    // Layer transform
    TRANSFORM:        "ADBE Transform Group",
    ANCHOR:           "ADBE Anchor Point",
    POSITION:         "ADBE Position",
    SCALE:            "ADBE Scale",
    ROTATION:         "ADBE Rotate Z",
    OPACITY:          "ADBE Opacity",

    // Shape layer structure
    ROOT_VECTORS:     "ADBE Root Vectors Group",
    VECTOR_GROUP:     "ADBE Vector Group",
    VECTORS_GROUP:    "ADBE Vectors Group",
    VECTOR_XFORM:     "ADBE Vector Transform Group",

    // Paths
    SHAPE_RECT:       "ADBE Vector Shape - Rect",
    SHAPE_ELLIPSE:    "ADBE Vector Shape - Ellipse",
    SHAPE_STAR:       "ADBE Vector Shape - Star",
    SHAPE_GROUP:      "ADBE Vector Shape - Group",
    SHAPE_PATH:       "ADBE Vector Shape",

    // Fill / Stroke
    FILL:             "ADBE Vector Graphic - Fill",
    FILL_COLOR:       "ADBE Vector Fill Color",
    STROKE:           "ADBE Vector Graphic - Stroke",
    STROKE_COLOR:     "ADBE Vector Stroke Color",
    STROKE_WIDTH:     "ADBE Vector Stroke Width",

    // Group transform (verified from a real SVG-import inspect)
    VGROUP_XFORM:     "ADBE Vector Transform Group",
    VGROUP_ANCHOR:    "ADBE Vector Anchor",
    VGROUP_POSITION:  "ADBE Vector Position",
    VGROUP_SCALE:     "ADBE Vector Scale",
    VGROUP_ROTATION:  "ADBE Vector Rotation",
    VGROUP_OPACITY:   "ADBE Vector Group Opacity",

    // Stroke caps/joins (verified from inspect)
    STROKE_OPACITY:   "ADBE Vector Stroke Opacity",
    STROKE_LINE_CAP:  "ADBE Vector Stroke Line Cap",
    STROKE_LINE_JOIN: "ADBE Vector Stroke Line Join",
    STROKE_MITER:     "ADBE Vector Stroke Miter Limit",

    // Trim / Merge / Repeater
    TRIM:             "ADBE Vector Filter - Trim",
    TRIM_START:       "ADBE Vector Trim Start",
    TRIM_END:         "ADBE Vector Trim End",
    TRIM_OFFSET:      "ADBE Vector Trim Offset",
    MERGE:            "ADBE Vector Filter - Merge",
    REPEATER:         "ADBE Vector Filter - Repeater"
};
