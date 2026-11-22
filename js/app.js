// app.js: the glue. Connects buttons and boxes on the page to everything else.

const App = (function () {

  // Grab the pieces of the page we need to talk to.
  const sourceBox = document.getElementById("source");
  const loadButton = document.getElementById("load");
  const chooseButton = document.getElementById("choose-file");
  const fileInput = document.getElementById("file-input");
  const fileNameLabel = document.getElementById("file-name");
  const statusBox = document.getElementById("status");

  // The machine that is loaded right now (null until one loads cleanly).
  let current = null;

  // Read the text box, hand it to the parser, show what came back.
  function loadMachine() {
    const result = Parser.parse(sourceBox.value);

    if (!result.ok) {
      current = null;
      show("error", "Error: " + result.message);
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

  // Wire up the buttons.
  loadButton.addEventListener("click", loadMachine);
  chooseButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", openFile);

  // Once the user edits the text, it no longer matches the file they opened.
  sourceBox.addEventListener("input", () => 
    { fileNameLabel.textContent = ""; }
  );

  // Nothing else needs to reach inside App yet.
  return {};
})();