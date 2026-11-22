// app.js: the glue. Connects buttons and boxes on the page to everything else.

const App = (function () {

  // Grab the pieces of the page we need to talk to.
  const themeButton   = document.getElementById("theme-toggle");
  const presetSelect  = document.getElementById("preset");
  const presetSummary = document.getElementById("preset-summary");
  const sourceBox     = document.getElementById("source");
  const shareButton   = document.getElementById("share");
  const loadButton    = document.getElementById("load");
  const chooseButton  = document.getElementById("choose-file");
  const fileInput     = document.getElementById("file-input");
  const fileNameLabel = document.getElementById("file-name");
  const statusBox     = document.getElementById("status");
  const testInput     = document.getElementById("test-string");
  const runButton     = document.getElementById("run");
  const chipsBox      = document.getElementById("test-chips");
  const verdictBox    = document.getElementById("verdict");
  const stepsBox      = document.getElementById("steps");
  const machineBox    = document.getElementById("machine");
  const layoutSelect  = document.getElementById("layout");
  const rearrangeBtn  = document.getElementById("rearrange");
  const fitButton     = document.getElementById("fit");
  const tapeBox       = document.getElementById("tape");
  const headsUpBox    = document.getElementById("heads-up");
  const stepLabel     = document.getElementById("step-label");
  const startButton   = document.getElementById("btn-start");
  const backButton    = document.getElementById("btn-back");
  const stepButton    = document.getElementById("btn-step");
  const endButton     = document.getElementById("btn-end");
  const captionBox    = document.getElementById("caption");

  // The machine that is loaded right now (null until one loads cleanly).
  let current = null;

  // The exact text the current drawing was made from. Lets us skip redrawing
  // when nothing changed, so circles the user dragged stay where they put them.
  let drawnFrom = null;

  // The playback controller for the string that was run last (null if none).
  let player = null;

  // Strings longer than this would build thousands of tape boxes and table rows
  // and slow down the browser. engine.js itself has no limit.
  const MAX_STRING_LENGTH = 2000;

  // ---------- 1. Loading a machine ----------

  // Read the text box, hand it to the parser, show what came back.
  function loadMachine() {
    const result = Parser.parse(sourceBox.value);

    if (!result.ok) {
      current = null;
      show("error", "Error: " + result.message);
      showChips([]);
      drawnFrom = null;
      forgetRun();
      Display.clearMachine(machineBox, "Fix the machine description to see its drawing.");
      return;
    }

    current = result;
    const tests = result.tests.map(t => "  " + (t === "" ? "(empty string)" : t));
    const lines = [
      ...Parser.describe(result.machine),
      "",
      `Test strings (${result.tests.length}):`,
      ...tests,
    ];
    show("ok", lines.join("\n"));
    showChips(result.tests);

    // Only redraw when the machine text actually changed.
    // A new drawing means any old run no longer matches it, so forget it.
    if (sourceBox.value !== drawnFrom) {
      forgetRun();
      Display.drawMachine(machineBox, result.machine, layoutSelect.value);
      drawnFrom = sourceBox.value;
    }
  }

  // Runs after the user picks a file. Copies it into the text box, then loads it,
  // so a file and pasted text always go down the exact same path.
  // "async" lets the page wait for the file without freezing.
  async function openFile() {
    const file = fileInput.files[0];
    fileInput.value = "";   // reset, so picking the same file again still works
    if (!file) return;      // the user closed the picker without choosing

    let text;
    try {
      // "fatal: true" refuses invalid UTF-8 like Python. "ignoreBOM: true" keeps
      // any leading BOM so parser.js strips at most one, matching Python's utf-8-sig.
      const bytes = await file.arrayBuffer();
      text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
      current = null;
      fileNameLabel.textContent = "";
      show("error", `Error: ${file.name} is not valid UTF-8 text`);
      showChips([]);
      drawnFrom = null;
      forgetRun();
      Display.clearMachine(machineBox, "Fix the machine description to see its drawing.");
      return;
    }

    sourceBox.value = text;
    fileNameLabel.textContent = "Loaded from " + file.name;
    forgetPreset();
    loadMachine();
  }

  // ---------- Sharing a machine by link ----------
  //
  // The machine's text is packed into the part of the address after "#".
  // That part never leaves the visitor's browser (it isn't sent to GitHub),
  // so no server or database is needed.
  //   .../nfa-visualizer/#m=<machine text>&s=<test string>

  function shareLink() {
    const params = new URLSearchParams({ m: sourceBox.value });
    const text = Parser.strip(testInput.value);
    if (text) params.set("s", text);
    return location.href.split("#")[0] + "#" + params.toString();
  }

  async function copyShareLink() {
    const link = shareLink();
    try {
      await navigator.clipboard.writeText(link);
      fileNameLabel.textContent = "Link copied! Anyone who opens it sees this machine.";
    } catch {
      // Copying can be blocked. Put the link in the address bar instead.
      history.replaceState(null, "", link);
      fileNameLabel.textContent = "Copy the link from your browser's address bar.";
    }
  }

  // If the page was opened from a shared link, load that machine (and string).
  // Returns true if it did.
  function openSharedLink() {
    const params = new URLSearchParams(location.hash.slice(1));
    const text = params.get("m");
    if (text === null) return false;
    sourceBox.value = text;
    forgetPreset();
    fileNameLabel.textContent = "Opened from a shared link.";
    loadMachine();
    const s = params.get("s");
    if (s !== null && current) {
      testInput.value = s;
      runString(s);
    }
    return true;
  }

  // ---------- Examples ----------

  // Fill the "Try an example" list from presets.js.
  function fillPresetList() {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "(your own machine)";
    presetSelect.appendChild(placeholder);
    for (const preset of Presets.list) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    }
  }

  // Put an example into the text box, then load it like pasted text
  // (the same single path that opened files use).
  function usePreset(id) {
    const preset = Presets.find(id);
    if (!preset) return;
    presetSelect.value = id;
    presetSummary.textContent = preset.summary;
    sourceBox.value = preset.text;
    fileNameLabel.textContent = "";
    testInput.value = "";
    loadMachine();
  }

  // Once the text no longer matches an example, stop claiming it does.
  function forgetPreset() {
    presetSelect.value = "";
    presetSummary.textContent = "";
  }

  // Put text in the status box and color it green (ok) or red (error).
  // textContent (not innerHTML) shows text exactly as typed, never as page code.
  function show(kind, text) {
    statusBox.className = "status " + kind;
    if (kind === "error") {
      // Only announce errors to screen readers; the "ok" summary re-renders on every Run.
      statusBox.setAttribute("role", "alert");
      statusBox.setAttribute("aria-live", "polite");
      // Error messages are sentences: let browser translation work on them,
      // but keep the quoted names ('q9', 'foo') exactly as typed.
      statusBox.translate = true;
      Display.setText(statusBox, text);
    } else {
      statusBox.removeAttribute("role");
      statusBox.setAttribute("aria-live", "off");
      // The summary is code-like (Alphabet: {0, 1}...), so it's never translated.
      statusBox.translate = false;
      statusBox.textContent = text;
    }
  }

  // ---------- 2. Testing a string ----------

  // Run one string through the machine and show the recorded steps.
  function runString(rawText) {
    // Always use what's in the machine box RIGHT NOW, even if it was edited
    // since the last "Load machine". Parsing is instant, so this costs nothing.
    loadMachine();
    if (!current) {
      verdictBox.hidden = false;
      verdictBox.className = "status error";
      verdictBox.textContent = "Fix the machine description above first.";
      return;
    }

    // Trim spaces off the ends, the same way "test:" lines in a file are trimmed.
    const text = Parser.strip(rawText);
    testInput.value = text;

    const charCount = Array.from(text).length;
    if (charCount > MAX_STRING_LENGTH) {
      forgetRun();
      verdictBox.hidden = false;
      verdictBox.className = "status error";
      verdictBox.textContent =
        `That string has ${charCount.toLocaleString()} characters, which is too long to step through ` +
        `(the limit is ${MAX_STRING_LENGTH.toLocaleString()}). Try a shorter string.`;
      return;
    }

    // 1. The engine records every step.  
    // 2. Display builds the tape and table.
    // 3. A player starts at step 0; the buttons move it back and forth.
    const result = Engine.run(current.machine, text);
    Display.showTape(tapeBox, result, headsUpBox, Explain.headsUp(current.machine, result));
    Display.showStepTable(stepsBox, result, index => player.goTo(index));

    // The verdict stays hidden until the last step has been shown once,
    // so learners can predict the answer before they see it.
    // We only update #verdict when its state actually changes, so screen
    // readers don't re-announce it on every step.
    let revealed = false;
    if (result.steps.length > 1) Display.showPending(verdictBox);
    player = Player.create({
      count: result.steps.length,
      onShow: index => {
        Display.showStep(result, index, stepLabel);
        Display.showCaption(captionBox, Explain.step(current.machine, result, index), stateNames());
        if (!revealed && index === result.steps.length - 1) {
          revealed = true;
          Display.showVerdict(verdictBox, result.accepted,
                              Explain.verdict(current.machine, result), stateNames());
        }
        updateButtons();
      },
    });
    player.reset();
  }

  // The current machine's state names (kept safe from browser translation).
  function stateNames() {
    return current ? [...current.machine.states] : [];
  }

  // Grey out buttons that can't do anything right now.
  function updateButtons() {
    startButton.disabled = !player || player.atStart();
    backButton.disabled  = !player || player.atStart();
    stepButton.disabled  = !player || player.atEnd();
    endButton.disabled   = !player || player.atEnd();
  }

  // Throw away the last run: highlights, tape, table, verdict, buttons.
  function forgetRun() {
    player = null;
    Display.clearRun(tapeBox, headsUpBox, stepLabel);
    Display.showCaption(captionBox, null);
    stepsBox.replaceChildren();
    verdictBox.hidden = true;
    updateButtons();
  }

  // One small button per "test:" line, so users can run them with one click.
  function showChips(tests) {
    chipsBox.replaceChildren();
    if (tests.length === 0) return;

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = "From the description:";
    chipsBox.appendChild(label);

    for (const text of tests) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.translate = false;   // test strings must never be translated
      chip.textContent = text === "" ? "(empty string)" : text;
      chip.addEventListener("click", () => runString(text));
      chipsBox.appendChild(chip);
    }
  }

  // ---------- Wiring ----------

  loadButton.addEventListener("click", loadMachine);
  chooseButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", openFile);
  runButton.addEventListener("click", () => runString(testInput.value));
  testInput.addEventListener("keydown", event => {
    if (event.key === "Enter") runString(testInput.value);
  });

  // Drawing controls. Changing the layout (or clicking Rearrange) glides the
  // circles to new spots; Fit to screen zooms so everything is visible.
  layoutSelect.addEventListener("change", () => Display.arrange(layoutSelect.value, true));
  rearrangeBtn.addEventListener("click", () => Display.arrange(layoutSelect.value, true));
  fitButton.addEventListener("click", () => Display.fitView());

  // Playback buttons. Each one just tells the player which step to show.
  startButton.addEventListener("click", () => player && player.reset());
  backButton.addEventListener("click",  () => player && player.back());
  stepButton.addEventListener("click",  () => player && player.next());
  endButton.addEventListener("click",   () => player && player.end());

  presetSelect.addEventListener("change", () => {
    if (presetSelect.value) usePreset(presetSelect.value);
  });

  // Once the user edits the text, it no longer matches the file or example they opened.
  sourceBox.addEventListener("input", () => {
    fileNameLabel.textContent = "";
    forgetPreset();
  });

  // Keyboard: ← and → step back and forth, unless the user is typing in a box.
  document.addEventListener("keydown", event => {
    if (!player || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest("input, textarea, select")) return;
    if (event.key === "ArrowLeft")  { event.preventDefault(); player.back(); }
    if (event.key === "ArrowRight") { event.preventDefault(); player.next(); }
  });

  shareButton.addEventListener("click", copyShareLink);

  // Light / dark mode. The button shows the current choice; clicking cycles it.
  // Whenever the colors change, the drawing re-reads them from style.css.
  const THEME_LABELS = {
    auto:  { icon: "◐", text: "Theme: Auto" },
    light: { icon: "☀", text: "Theme: Light" },
    dark:  { icon: "☾", text: "Theme: Dark" },
  };
  function showThemeChoice() {
    const { icon, text } = THEME_LABELS[Theme.choice()];
    const sym = document.createElement("span");
    sym.setAttribute("aria-hidden", "true");
    sym.textContent = icon + " ";
    themeButton.replaceChildren(sym, text);
    themeButton.title = "Auto follows your device's own light/dark setting. Click to switch.";
  }
  themeButton.addEventListener("click", () => { Theme.next(); showThemeChoice(); });
  Theme.onChange(() => Display.refreshColors());
  showThemeChoice();

  // When the page opens: fill the example list. If the link carries a shared
  // machine, load that; otherwise show the first example, so visitors see a
  // working machine right away.
  fillPresetList();
  if (!openSharedLink()) usePreset(Presets.list[0].id);

  // Nothing else needs to reach inside App yet.
  return {};
})();
