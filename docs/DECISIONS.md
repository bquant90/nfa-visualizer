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

## 16. The engine tracks the set of possible states

**Why:** Same as the Python version. The set can never be bigger than the number of states, so it stays fast on long strings.
**Passed on:** Following each path one at a time (can multiply into billions). Converting to a DFA first (builds a different machine than the user drew).

## 17. Each step records facts: before, after, arrows used, dead ends

**Why:** The display can light up the exact arrows. explain.js can describe choices and dead ends. The final answer keeps its reason (accepted, no accepting state, stuck, not in alphabet).

## 18. A separate answer-key page (check.html + js/check.js)

**Why:** Prints the exact Python format, including --trace, for line-by-line comparison. Keeps testing tools off the visitor page.

## 19. Run always re-loads the machine text first

**Why:** Prevents testing an out-of-date machine after an edit. Parsing is instant, so it costs nothing.

## 20. Typed test strings are trimmed at the ends

**Why:** Matches how "test:" lines in a file are trimmed. A space in the middle is kept and flagged.

## 21. All showing of results lives in display.js

**Why:** Showing results is the display layer's job, even for the temporary table. app.js only says "run this, then show it."

## 22. One arrow per pair of states, characters combined ("0, 1")

**Why:** Textbook style, and far fewer arrows on big machines.

## 23. The start arrow comes from an invisible node

**Why:** Textbook convention. Cytoscape only draws arrows between nodes, so we add a hidden one. It follows the start state when dragged.

## 24. Default layout: breadthfirst, left to right from the start state

**Why:** Built in, reads like a textbook, same picture every time.
**Passed on (for now):** dagre (two extra library files). cose (comes out different each time, offered later for big machines).

## 25. Only redraw when the machine text changes

**Why:** Circles the user dragged stay put when they run strings.

## 26. Three layouts (left to right, spread out, circle); the user picks

**Why:** No single layout wins for every big machine. Long chains suit left to right; tangled ones suit spread out or circle. Size alone can't tell them apart.
**Passed on (for now):** dagre / fcose extensions. More library files.

## 27. The start arrow always comes from the side

**Why:** Loops sit on top of circles, so an arrow from above could collide with them.

## 28. States are placed in "people order" (r2 before r10)

**Why:** Easier to read. We sort before handing states to Cytoscape, because its circle layout ignores its own sort setting in v3.35.0.

## 29. A separate player.js that knows nothing about NFAs

**Why:** Every button just changes "which step number is showing." Going back is free because steps are pre-recorded. Reusable for the grammar parser.
**Passed on:** Putting the step counter in display.js or app.js. Tangled with NFA code, not reusable.

## 30. Highlight colors: yellow = possible states, orange = arrows used, red dashed = dead end

**Why:** Distinct and readable. A dead end is only marked if no other guess landed on that state.

## 31. Page order: describe, found, pick a string, watch it run, step details

**Why:** Playback controls sit right under the drawing, so you can watch and click without scrolling.

## 32. Table rows and the drawing stay in sync; clicking a row jumps to that step

**Why:** Shows that the data and the picture are the same thing.

## 33. No Play/Pause or speed control for now

**Date:** Nov 22, 2026
**Why:** Stepping by hand (Start / Back / Step) is enough to learn from.
**If we want it later:** a timer in player.js that calls next() until atEnd(), plus one button. No engine or display changes needed.

## 34. The verdict appears when the last step is first reached, then stays

**Why:** Lets learners predict before seeing the answer, but doesn't hide it when they step back to review.

## 35. The ending shows on the drawing: green = accepting state finished on, red = rejected

**Why:** One green circle is enough to accept, which teaches the "any guess wins" rule visually.

## 36. Step details folded shut by default

**Why:** The table shows the ending, which would spoil the prediction.

## 37. Captions: "what + why", capped in length

**Why:** One "what" sentence, plus a "why" with at most two facts (most important first). Name lists cut off after 4 ("…and 9 more"). Full detail stays in the table.
**Passed on:** Plain "what" only. It has the same length problem, and loses the "why."

## 38. app.js asks explain.js for words, then hands them to display.js

**Why:** The display never depends on the wording, and the wording never depends on the display. Either can change alone (another language, a different voice).

## 39. The "why" follows a fixed priority

**Order:** guess dies but gets refilled → splits → dead ends → merges → "nothing special."
**Why:** The most confusing event is explained first.

## 40. The verdict is a headline plus one plain-English reason

**Why:** Each engine reason (accepted, no accepting state, stuck, not in alphabet) gets its own sentence. Strings over 24 characters are named by length instead of quoted.

## 41. Unknown characters get a heads-up as soon as a string is run

**Why:** Meets the requirement to say so clearly. It points at the problem ("watch what happens") without revealing the ending.

## 42. Examples live in presets.js and load like pasted text

**Why:** One path into the parser. The first example loads on page open so visitors never see an empty page. Examples (for learners) are kept separate from test files (for testing).

## 43. All colors are named variables in style.css; dark mode redefines them

**Why:** One place for every color. The drawing reads the same variables, so it follows the theme too.
**Passed on:** A separate dark.css repeating every rule (twice the CSS, drifts apart).

## 44. Theme choices: Auto (follow the device), Light, Dark; remembered per browser

**Why:** Respects the device setting by default. theme.js loads first to avoid a white flash.

## 45. Phone layout: bigger tap targets, 16px text boxes, roomier layout on narrow screens

**Why:** 44px is a comfortable thumb size. Under 16px, iPhones zoom in on text boxes. Narrow screens squeezed the circles together.
