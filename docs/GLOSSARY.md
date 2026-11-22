# Glossary

New terms, one plain-English line each. Grouped by topic.

## The machine (NFA)

- **NFA (Nondeterministic Finite Automaton):** A machine that reads a string one character at a time and answers yes (accept) or no (reject).
- **Alphabet:** The characters the machine knows how to read, like `0` and `1`.
- **State:** A position the machine can be in, like `q0`. Drawn as a circle.
- **Start state:** The one state the machine begins in.
- **Accepting state:** A "winning" state. Drawn as a double circle. Finish on one and the string is accepted.
- **Rule (transition):** "In state X, reading Y, you may move to Z." Drawn as an arrow.
- **Nondeterministic:** A state can have more than one arrow for the same character. The machine follows all of them at once.
- **Stuck:** No possible states are left. Nothing later can bring the machine back.

## Git and GitHub

- **Git:** A tool on your computer that takes snapshots of your project so you can go back in time.
- **Repository (repo):** A project folder that Git is tracking.
- **`.git` folder:** The hidden folder where Git stores every snapshot. Never edit it by hand.
- **Commit:** One saved snapshot, with a short message saying what changed.
- **Staging (`git add`):** Choosing which changes go into the next commit. Like packing a box before you seal it.
- **Branch:** A line of history. We only use one, called `main`.
- **`.gitignore`:** A list of files and folders Git should pretend aren't there.
- **GitHub:** The website that keeps an online copy of your repo.
- **Push:** Upload your commits from your computer to GitHub.
- **GitHub Pages:** A free GitHub feature that turns a repo into a public website.
- **Remote:** An online copy of your repo, like the one on GitHub.
- **origin:** The standard nickname for your main remote.
- **`git push -u`:** First upload. The `-u` remembers where to push, so after this, plain `git push` works.
- **Deploy:** Publishing the latest version of the site. GitHub Pages deploys automatically after each push.
- **Actions tab:** Where GitHub shows automatic jobs, like each Pages deploy, with a green check or red X.
- **Case-sensitive:** Treats `A` and `a` as different. Web servers are, and Windows isn't, so keep file names lowercase.

## Web pages

- **HTML:** The page's structure: headings, boxes, buttons.
- **CSS:** The page's looks: colors, fonts, spacing.
- **JavaScript (JS):** The page's behavior: what happens when you click.
- **Library:** Code someone else wrote that we reuse, like Cytoscape.
- **Minified (`.min.js`):** A library squeezed onto as few lines as possible so it loads faster. Not meant to be read.
- **CDN:** A website that hosts libraries so pages can load them from the internet.
- **Live Server:** A VS Code extension that shows your page in a browser and refreshes it every time you save.
- **Terminal:** The text window where you type commands like `git status`.
- **Smoke test:** A tiny check that the basic plumbing works before building real features.
- **Console (F12):** The browser's error and message window. Red text means something broke.
- **localhost / 127.0.0.1:** Your own computer acting as a web server. Only you can see it.

## Cytoscape

- **Elements:** The list of things to draw. "Nodes" are circles (states). "Edges" are arrows (rules).
- **Style:** How the elements look. Written a lot like CSS.
- **Layout:** The rule for where elements go on the screen.

## JavaScript

- **Set:** A list with no repeats. Adding "q0" twice keeps one.
- **Map:** A lookup table: give it a key, get back a value.
- **Result object:** A package a function hands back that says whether it worked (ok) and what it found.
- **Event listener:** Code that waits for something to happen, like a button click, then runs.
- **textContent:** Puts text on the page exactly as typed, so pasted text can never act as page code.
- **async / await:** Lets code wait for something slow, like reading a file, without freezing the page.
- **UTF-8:** The standard way computers store text as bytes. A file that breaks its rules is "not valid UTF-8."
