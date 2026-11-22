// app.js: the glue. Connects buttons and boxes on the page to everything else.

const App = (function () {

  // Grab the pieces of the page we need to talk to.
  const sourceBox     = document.getElementById("source");
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
  const stepLabel     = document.getElementById("step-label");
  const startButton   = document.getElementById("btn-start");
  const backButton    = document.getElementById("btn-back");
  const stepButton    = document.getElementById("btn-step");
  const endButton     = document.getElementById("btn-end");

  // The machine that is loaded right now (null until one loads cleanly).
  let current = null;

  // The exact text the current drawing was made from. Lets us skip redrawing
  // when nothing changed, so circles the user dragged stay where they put them.
  let drawnFrom = null;

  // The playback controller for the string that was run last (null if none).
  let player = null;

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
      // "fatal: true" means: refuse files that aren't proper UTF-8 text,
      // the same way the Python version does.
      const bytes = await file.arrayBuffer();
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
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
    loadMachine();
  }

  // Put text in the status box and color it green (ok) or red (error).
  // textContent (not innerHTML) shows text exactly as typed, never as page code.
  function show(kind, text) {
    statusBox.className = "status " + kind;
    statusBox.textContent = text;
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

    // 1. The engine records every step.  
    // 2. Display builds the tape and table.
    // 3. A player starts at step 0; the buttons move it back and forth.
    const result = Engine.run(current.machine, text);
    Display.showTape(tapeBox, result);
    Display.showStepTable(stepsBox, result, index => player.goTo(index));

    // The verdict stays hidden until the last step has been shown once,
    // so learners can predict the answer before they see it.
    let revealed = false;
    player = Player.create({
      count: result.steps.length,
      onShow: index => {
        Display.showStep(result, index, stepLabel);
        if (player.atEnd()) revealed = true;
        if (revealed) Display.showVerdict(verdictBox, result);
        else Display.showPending(verdictBox);
        updateButtons();
      },
    });
    player.reset();
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
    Display.clearRun(tapeBox, stepLabel);
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

  // Once the user edits the text, it no longer matches the file they opened.
  sourceBox.addEventListener("input", () => { fileNameLabel.textContent = ""; });

  // Nothing else needs to reach inside App yet.
  return {};
})();