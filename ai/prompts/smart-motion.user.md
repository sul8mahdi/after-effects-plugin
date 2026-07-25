<!--
User-message template. The adapter fills the {{...}} placeholders at runtime.
Only abstract, privacy-safe data is interpolated — never project/file/org info.
-->
Propose Smart Motion for this icon.

## icon (abstract analyzer report)
```json
{{ICON_REPORT_JSON}}
```

## svg (optional, simplified — may be empty)
```
{{SIMPLIFIED_SVG_OR_EMPTY}}
```

## vocabulary (choose ONLY from these)
```json
{{VOCABULARY_JSON}}
```

## constraints
- language_primary: ar
- max_duration_s: {{MAX_DURATION_S}}
- required_style: {{REQUIRED_STYLE_OR_ANY}}
- loop: {{LOOP_PREFERENCE}}   // "one_shot" | "loop" | "either"

Return exactly three suggestions (corporate, educational, dynamic) as a single
JSON object matching suggestions.schema.json. No text outside the JSON.
