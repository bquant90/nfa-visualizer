# Decisions Log

Every big choice we made, why we made it, and what we passed on.
Newest decisions go at the bottom.

---

## 1. Give each web app its own repo, with the old repo as a "hub"

**Decision:** `nfa-visualizer` gets its own GitHub repo. The "College - AI Remastered Projects" repo stays as the hub, and its README links to each project.
**Why:** A live website deserves its own clean link (`bquant90.github.io/nfa-visualizer`). Each project keeps its own history and README, and can be pinned on its own.
**Passed on:** Putting everything in one repo. It works, but the links get long and every project's history gets mixed together.

## 2. Draw the machine with Cytoscape.js

**Decision:** Use the Cytoscape.js library to draw states (circles) and rules (arrows).
**Why:** It arranges the drawing automatically and handles big machines, zooming and dragging. That lets the app grow.
**Passed on:** Plain SVG (hand-drawn shapes). No outside code, but we would have to write all the layout math ourselves, and big machines would look crowded.
**Guardrail:** Only `display.js` talks to Cytoscape. If we ever swap it out, only that one file changes.

## 3. Keep a local copy of Cytoscape in `lib/`, pinned to version 3.35.0

**Decision:** Download `cytoscape.min.js` once and keep it in the project.
**Why:** The page works offline, and the version never changes without us knowing.
**Passed on:** Loading it from the internet (a "CDN") every time. That's simpler, but the page breaks if the link ever changes or you're offline.

## 4. Record first, play back second

**Decision:** The engine runs the whole string at once and saves a list of steps. The display just flips through that list.
**Why:** Step, back, pause and reset become easy. We can test the engine without any screen. The grammar parser can reuse the same player later.
**Passed on:** Running the machine live while animating. That makes "step back" hard and tangles the logic with the drawing.

## 5. Plain-English explanations live in their own file

**Decision:** The engine records facts. `explain.js` turns facts into sentences.
**Why:** You can reword captions without any risk of breaking the logic.
**Passed on:** Writing sentences inside the engine. It's quicker at first, but wording changes could break the logic.

## 6. Plain `<script>` files, each adding one named object

**Decision:** Each JS file creates one object (`Parser`, `Engine`, `Explain`, `Display`, `Presets`, `App`). `index.html` loads them in order.
**Why:** It's simple, works with Live Server and GitHub Pages, and works with how Cytoscape is shipped.
**Passed on:** "ES modules" (`import`/`export`). More modern, but it adds rules to learn and won't work if someone just double-clicks the file.
**Watch out:** The order of the `<script>` tags matters. A file can only use objects from files loaded _above_ it.

## 7. Preset examples are stored inside `presets.js`

**Decision:** The example machines are text kept inside a JS file, not loaded from separate `.txt` files.
**Why:** It works everywhere, even on a double-clicked page. Users can still load their own `.txt` with a "Choose file" button.

## 8. Behave exactly like the Python version, then add clarity on top

**Decision:** Same parsing rules, same error messages, same early stop when stuck. A character outside the alphabet still ends in **Rejected**, but the page explains why.
**Why:** The Python file is the "answer key." If both agree on every test file, we know the web version is right.

## 9. Publish with GitHub Pages from the `main` branch, main folder

**Decision:** GitHub Pages serves the repo's main folder as a website.
**Why:** Free, no server, and it updates every time we upload changes.

## 10. Add an empty `.nojekyll` file

**Date:** Nov 21, 2026
**Decision:** Tell GitHub Pages to skip its Jekyll site-builder.
**Why:** We write plain HTML, so we don't need it. It can hide files starting with `_` and slows down deploys.

## 11. The parser hands back a result instead of throwing errors

**Decision:** Parser.parse() always returns { ok: true, machine, tests } or { ok: false, message }.
**Why:** No hidden jumps. The caller just checks "ok", like a success path and a fault path.
**Passed on:** Throwing errors like Python. Easy to forget to catch one and crash the page.

## 12. Rules are stored as state → symbol → next states

**Why:** JavaScript can't use a (state, symbol) pair as a lookup key the way Python can.
**Passed on:** Text keys like "q0|0". Simpler, but they break if a state name contains "|".

## 13. Copy Python's tiny quirks exactly

**Decision:** Same "space" characters, same sort order, same handling of the invisible marker at the start of some files.
**Why:** Python is the answer key. Small mismatches here would show up as confusing differences later.

## 14. Opened files go into the text box, then load like pasted text

**Why:** One path into the parser, so files and pasted text can never behave differently. Users can see and fix what they loaded.
**Passed on:** Sending the file straight to the parser. Less visible, and two paths to keep in sync.
**Also:** Files that aren't proper UTF-8 text are refused with the same message as Python.

## 15. One test file per scenario, with the expected result written inside

**Why:** File names say what each one tests. "# Expected:" comments make each file explain itself. The parser stops at the first error, so one big file could only test one mistake.
