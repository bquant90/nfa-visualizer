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

  // The machine that is loaded right now (null until one loads cleanly).
  let current = null;

  // Read the text box, hand it to the parser, show what came back.
  function loadMachine() {
    const result = Parser.parse(sourceBox.value);

    if (!result.ok) {
      current = null;
      show("error", "Error: " + result.message);
      showChips([]);
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
  }

  // Runs after the user picks a file. Copies it into the text box, then loads it,
  // so a file and pasted text always go down the exact same path.
  // "async" lets the page wait for the file without freezing.
  async function openFile() {
    const file = fileInput.files[0];
    fileInput.value = "";   // reset, so picking the same file again still works
    if (!file) {
      return; // the user closed the picker without choosing
    }      

    let text;
    try {
      // "fatal: true" means: refuse files that aren't proper UTF-8 text,
      // the same way the Python version does.
      const bytes = await file.arrayBuffer();
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } 
    catch {
      current = null;
      fileNameLabel.textContent = "";
      show("error", `Error: ${file.name} is not valid UTF-8 text`);
      showChips([]);
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
      stepsBox.replaceChildren();
      return;
    }

    // Trim spaces off the ends.
    const text = Parser.strip(rawText);
    testInput.value = text;

    const result = Engine.run(current.machine, text);
    Display.showVerdict(verdictBox, result);
    Display.showStepTable(stepsBox, result);
  }

  // One small button per "test:" line, so users can run them with one click.
  function showChips(tests) {
    chipsBox.replaceChildren();
    if (tests.length === 0) {
      return;
    }

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

  // Once the user edits the text, it no longer matches the file they opened.
  sourceBox.addEventListener("input", () => 
    { fileNameLabel.textContent = ""; }
  );

  // Nothing else needs to reach inside App yet.
  return {};
})();