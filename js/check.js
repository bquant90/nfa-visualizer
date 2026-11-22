// check.js: the answer-key checker. Prints results in the exact same format
// as python/project_1_revamp.py, so the two can be compared line by line.
//
// Only check.html uses this file. Visitors to the main page never see it.

const Check = (function () {

  // Recreate what Python prints for ONE file (main() in the Python version).
  function pythonOutput(source, withTrace) {
    const parsed = Parser.parse(source);
    if (!parsed.ok) {
        return ["Error: " + parsed.message];
    }

    const { machine, tests } = parsed;
    const out = [...Parser.describe(machine), ""];
    let acceptedCount = 0;

    for (const text of tests) {
      const label = text === "" ? "(empty string)" : text;
      const result = Engine.run(machine, text);

      if (withTrace) {
        out.push(`--- ${label} ---`);
        out.push(...traceLines(result));
      }

      if (result.accepted) {
        acceptedCount++;
      }
      out.push(`String ${label} is: ${result.accepted ? "Accepted" : "Rejected"}`);

      if (withTrace) {
        out.push("");
      }
    }

    out.push("");
    out.push(`${acceptedCount} of ${tests.length} strings accepted.`);
    return out;
  }

  // Rebuild Python's --trace lines from the recorded steps.
  // If these match, the engine recorded every step correctly.
  function traceLines(result) {
    const lines = [];
    for (const step of result.steps) {
      const states = Parser.formatSet(step.after);
      if (step.kind === "start") lines.push(`    start      -> ${states}`);
      else                       lines.push(`    read '${step.symbol}'   -> ${states}`);
    }
    const last = result.steps[result.steps.length - 1];
    if (last.after.length === 0) {
        lines.push("    (stuck - nothing left to explore)");
    }
    return lines;
  }

  // Several files at once, each under a "===== name" header.
  // Same layout as the PowerShell loop that runs Python on every test file.
  function manyFiles(files, withTrace) {
    const out = [];
    for (const { name, text } of files) {
      out.push(`===== ${name}`);
      out.push(...pythonOutput(text, withTrace));
    }
    return out.join("\n");
  }

  return { pythonOutput, manyFiles };
})();

// ---------- Page wiring for check.html ----------

(function () {
  const fileInput  = document.getElementById("files");
  const traceBox   = document.getElementById("trace");
  const output     = document.getElementById("output");
  const copyButton = document.getElementById("copy");

  let loaded = [];   // [{ name, text }] for the files picked last

  async function readFiles() {
    loaded = [];
    for (const file of fileInput.files) {
      loaded.push({ name: file.name, text: await file.text() });
    }
    // Same order Windows lists them in (by name, ignoring capital letters).
    loaded.sort((a, b) => a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1);
    render();
  }

  function render() {
    output.textContent = loaded.length
      ? Check.manyFiles(loaded, traceBox.checked)
      : "Pick one or more .txt files above.";
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output.textContent);
    copyButton.textContent = "Copied!";
    setTimeout(() => { copyButton.textContent = "Copy output"; }, 1500);
  }

  fileInput.addEventListener("change", readFiles);
  traceBox.addEventListener("change", render);
  copyButton.addEventListener("click", copyOutput);
})();