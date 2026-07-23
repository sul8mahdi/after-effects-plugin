# Project: Icon Motion Engine (After Effects)

An ExtendScript-based toolkit that animates icons inside After Effects with
professional, controllable motion presets.

**Current phase: MVP — engine only. No UI, no SVG import, no preset library.**
Do not build a CEP panel, ScriptUI window, or SVG parser until explicitly asked.

---

## 1. THE SINGLE MOST IMPORTANT RULE

**ExtendScript is ECMAScript 3 (1999). It is NOT modern JavaScript.**

Modern syntax fails with vague errors that do not point at the real line.
If you write ES6, the whole session is wasted. Assume nothing is available
unless it is listed as allowed below.

### Banned — never write these

| Banned | Use instead |
|---|---|
| `let`, `const` | `var` |
| `=>` arrow functions | `function () {}` |
| Template literals `` `${x}` `` | `"a " + x + " b"` |
| `for...of` | classic `for (var i = 0; i < n; i++)` |
| `Array.forEach/map/filter/reduce/indexOf` | classic `for` loop |
| `Object.keys`, `Object.assign` | `for (var k in obj)` with `hasOwnProperty` |
| `String.trim`, `String.includes`, `startsWith`, `repeat` | write helpers in `utils.jsx` |
| Spread `...`, destructuring, default params | explicit assignment |
| `JSON.parse` / `JSON.stringify` | see §5 |
| `class`, `Promise`, `async/await` | not available at all |
| `console.log` | `$.writeln()` or the logger (§6) |
| Trailing commas in object/array literals | remove them — this is a hard syntax error in ES3 |

### Allowed
`var`, `function`, classic `for`/`while`, `try/catch/finally`, prototypes,
`typeof`, `instanceof`, `String`, `Number`, `Math`, `Array` (constructor +
`push`/`pop`/`join`/`slice`/`sort`/`length`), `RegExp`.

---

## 2. AE scripting rules

- Wrap every project mutation:
  ```javascript
  app.beginUndoGroup("Icon Motion: Draw On");
  try {
      // work
  } catch (e) {
      alert("Error: " + e.toString() + "\nLine: " + e.line);
  } finally {
      app.endUndoGroup();
  }
  ```
- **All indices in AE are 1-based**, not 0-based: layers, keyframes,
  properties, comp items. This is the most common silent bug.
- Always validate the target before touching it:
  ```javascript
  var comp = app.project.activeItem;
  if (!(comp && comp instanceof CompItem)) { alert("Select a composition."); return; }
  ```
- **Access properties by matchName, never by display name.** Display names
  break on non-English AE installations. `layer.property("Contents")` is wrong;
  `layer.property("ADBE Root Vectors Group")` is correct.
- Never use `app.executeCommand()` or `app.findMenuCommandId()` in the engine.
  Menu IDs shift between AE versions. Build objects through the API.
- Do not assume layer order or item order. Search by name or by explicit index
  passed in from the caller.
- Frame-accurate timing: use `comp.frameDuration`, never hardcode `1/30`.

---

## 3. MatchName reference (verified — do not invent new ones)

If you need a matchName that is not on this list, **stop and ask** rather than
guessing. Wrong matchNames throw "no such property" errors that look like logic bugs.

```
Layer transform          ADBE Transform Group
  Anchor Point           ADBE Anchor Point
  Position               ADBE Position
  Scale                  ADBE Scale
  Rotation               ADBE Rotate Z
  Opacity                ADBE Opacity

Shape layer root         ADBE Root Vectors Group
  Group                  ADBE Vector Group
  Group contents         ADBE Vectors Group
  Group transform        ADBE Vector Transform Group

Path (parametric)        ADBE Vector Shape - Rect / - Ellipse / - Star
Path (bezier)            ADBE Vector Shape - Group
  Path property          ADBE Vector Shape

Fill                     ADBE Vector Graphic - Fill
  Fill color             ADBE Vector Fill Color
Stroke                   ADBE Vector Graphic - Stroke
  Stroke color           ADBE Vector Stroke Color
  Stroke width           ADBE Vector Stroke Width

Trim Paths               ADBE Vector Filter - Trim
  Start                  ADBE Vector Trim Start
  End                    ADBE Vector Trim End
  Offset                 ADBE Vector Trim Offset
Merge Paths              ADBE Vector Filter - Merge
Repeater                 ADBE Vector Filter - Repeater
```

---

## 4. Keyframes and easing — the correct sequence

Order matters. Setting ease before the keyframe exists throws. Setting ease
without switching interpolation to Bezier silently does nothing.

```javascript
var p = layer.property("ADBE Root Vectors Group")
             .property("ADBE Vector Filter - Trim")
             .property("ADBE Vector Trim End");

p.setValueAtTime(t0, 0);
p.setValueAtTime(t1, 100);

// KeyframeEase(speed, influence) — influence is 0.1 to 100
var easeOut = new KeyframeEase(0, 75);
var easeIn  = new KeyframeEase(0, 20);

p.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
p.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);

p.setTemporalEaseAtKey(1, [easeIn], [easeOut]);
p.setTemporalEaseAtKey(2, [easeIn], [easeOut]);
```

**Dimension gotcha:** the ease array length must match the property dimensions.
1D (Opacity, Rotation, Trim) takes `[ease]`. 2D/3D (Position, Scale) takes
`[ease, ease]` or `[ease, ease, ease]`. A length mismatch throws a type error
that reads as unrelated.

**Never leave keyframes linear.** Linear easing is the signature of an amateur
script. Default profile for this project: `influence 20` on out, `influence 75`
on in — a fast start that settles.

Enable motion blur whenever Position or Scale is animated:
`layer.motionBlur = true;` and `comp.motionBlur = true;`

---

## 5. JSON

There is no native `JSON` object. Do **not** hand-roll a parser.
Vendor `json2.js` (Crockford, ES3-compatible) into `src/lib/json2.jsx` and
include it. After inclusion, `JSON.parse` / `JSON.stringify` work normally.

---

## 6. File I/O and the logger

Writing files requires the user to enable
*Preferences → Scripting & Expressions → Allow Scripts to Write Files and
Access Network*. If a write fails, surface that as the likely cause.

```javascript
var f = new File(logPath);
f.encoding = "UTF-8";
f.open("w");
f.write(text);
f.close();
```

**`logger.jsx` is the highest-value file in this repo.** You cannot see After
Effects. The logger is how you see it. It walks the selected layer recursively
and writes matchName, property type, value, and keyframe times to
`logs/inspect.txt`. The human runs it and pastes the output back.

Before writing any animator that touches an unfamiliar structure, ask the human
to run the logger on a sample layer first. Guessing structure is the main
source of wasted cycles in this project.

---

## 7. Folder structure

```
icon-motion/
├── CLAUDE.md
├── logs/                    # logger output, gitignored
├── src/
│   ├── main.jsx             # entry point, run via File > Scripts > Run Script File
│   ├── lib/
│   │   ├── json2.jsx
│   │   ├── logger.jsx
│   │   ├── matchNames.jsx   # constants, single source of truth
│   │   └── utils.jsx        # trim, indexOf, hasOwnProp, type checks
│   └── engine/
│       ├── easing.jsx       # ease profiles + applyEase(prop, keyIndex, profile)
│       ├── stagger.jsx
│       └── animators/
│           ├── drawOn.jsx
│           ├── scalePop.jsx
│           └── fadeSlide.jsx
└── presets/                 # JSON, later phase
```

Include with relative paths from the including file:
`#include "lib/logger.jsx"`

---

## 8. Working agreement

- One animator at a time. Write it, stop, wait for the human to test in AE.
- Do not refactor working code unless asked. A regression in AE costs the human
  a manual test cycle, which is expensive.
- Never claim something works. You have not run it. Say what you expect it to
  do and what to check.
- If a rule here conflicts with your instinct about JavaScript, this file wins.

## 9. Definition of done — MVP

A `.jsx` that runs on a selected shape layer, adds Trim Paths, keyframes
`End` from 0 to 100 with real Bezier easing, and undoes cleanly in one step.
Nothing more. When that is stable, the toolchain is proven.
