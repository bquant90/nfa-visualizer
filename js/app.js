// app.js: the glue. Connects buttons and boxes on the page to everything else.

const App = (function () {

  // Grab the pieces of the page we need to talk to.
  const sourceBox  = document.getElementById("source");
  const loadButton = document.getElementById("load");
  const statusBox  = document.getElementById("status");

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

  // Put text in the status box and color it green (ok) or red (error).
  // textContent (not innerHTML) shows text exactly as typed, never as page code.
  function show(kind, text) {
    statusBox.className = "status " + kind;
    statusBox.textContent = text;
  }

  loadButton.addEventListener("click", loadMachine);

  // Nothing else needs to reach inside App yet.
  return {};
})();