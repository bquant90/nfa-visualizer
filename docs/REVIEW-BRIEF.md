# Review brief (for a second AI or human reviewer)

Paste everything below the line into the reviewer's chat, then attach these files, or give it the repo link if it can read GitHub (https://github.com/bquant90/nfa-visualizer):

- `index.html`, `check.html`, `css/style.css`
- every file in `js/`
- `python/project_1_revamp.py`
- `docs/DECISIONS.md`

Don't attach `lib/cytoscape.min.js`. It's a large third-party library, not our code.

---

You're reviewing a small web app called **NFA Visualizer**. It teaches how a nondeterministic finite automaton works, simply enough for a middle or high schooler. A non-technical user loads or pastes a machine, types a string, and steps through it. The machine is drawn with Cytoscape.js, the current possible states light up, and each step gets a plain-English caption.

**Constraints (please respect these):**

- Runs entirely in the browser. No server, no database, free tools only.
- Plain HTML, CSS and JavaScript. No build tools, frameworks or package managers.
- NFA only, with no epsilon moves.
- `python/project_1_revamp.py` is the answer key. The web version must give identical accept/reject results and identical error messages on the same input.

**Architecture:** "record first, play back second." `parser.js` turns text into a machine. `engine.js` runs a string once and records every step as facts. `explain.js` turns facts into sentences. `display.js` draws and is the only file that talks to Cytoscape. `player.js` only knows "show step i of N" and is meant to be reused. `app.js` connects them. `docs/DECISIONS.md` explains each choice and the alternatives that were passed on. Please read it before suggesting a change it already rejected.

**What I'd like from you:**

1. **Correctness:** any input where the JavaScript (parser + engine) could disagree with the Python version.
2. **Edge cases:** unusual machines or strings that could break the page, the drawing or the captions.
3. **Teaching quality:** captions or verdicts that would confuse a 13-year-old, with a better wording.
4. **Accessibility and mobile:** problems for keyboard, screen-reader or phone users.
5. **Code clarity:** places where a non-professional coder maintaining this would get lost.
6. **Your own ideas** that fit the constraints above.

**How to answer:**

- A numbered list. For each item give: the file, what's wrong (or the idea), why it matters, and a suggested fix.
- Mark each one **Bug**, **Risk**, **Improvement** or **Idea**, and put bugs first.
- Show small, targeted code changes. Please don't rewrite whole files.
- If you're unsure something is a bug, say so and describe how to test it. Nothing will be changed until it's re-checked against the Python answer key.
