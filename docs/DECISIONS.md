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
