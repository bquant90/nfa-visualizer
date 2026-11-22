// display.js: draws the machine with Cytoscape and lights up the current states.

const Display = (function () {

  // Show the final answer in a green or red box.
  // The wording is temporary. Phase 5 replaces the reason codes with plain English.
  function showVerdict(box, result) {
    const label = result.text === "" ? "(empty string)" : `"${result.text}"`;
    const answer = result.accepted ? "Accepted" : "Rejected";
    box.hidden = false;
    box.className = "status " + (result.accepted ? "ok" : "error");
    box.textContent = `${label} is ${answer}   (reason code: ${result.reason})`;
  }

  // Show every recorded step as one row of a table.
  function showStepTable(container, result) {
    container.replaceChildren();   // clear out the previous run

    const table = document.createElement("table");
    table.className = "step-table";
    addRow(table, "th", ["Step", "Read", "Before", "After", "Arrows used", "Dead ends"]);

    for (const step of result.steps) {
      const row = addRow(table, "td", [
        String(step.position),
        step.kind === "start" ? "(start)" : `'${step.symbol}'`,
        step.kind === "start" ? "—" : Parser.formatSet(step.before),
        Parser.formatSet(step.after),
        step.moves.length ? step.moves.map(m => `${m.from} → ${m.to}`).join(", ") : "—",
        step.deadEnds.length ? step.deadEnds.join(", ") : "—",
      ]);
      // Code-like cells get a typewriter font.
      for (const i of [1, 2, 3, 4, 5]) row.cells[i].classList.add("mono");
      // Flag characters that aren't in the alphabet.
      if (!step.inAlphabet) {
        row.cells[1].classList.add("bad");
        row.cells[1].textContent += "  not in alphabet";
      }
    }
    container.appendChild(table);

    // If the machine stopped early, say which characters it never read.
    if (result.unread) {
      const note = document.createElement("p");
      note.className = "step-note";
      note.textContent = `Stopped early. Never read: "${result.unread}"`;
      container.appendChild(note);
    }
  }

  // Helper: add one row of cells. "th" for the header row, "td" for normal rows.
  // textContent keeps any typed text from acting as page code.
  function addRow(table, cellType, values) {
    const row = table.insertRow();
    for (const value of values) {
      const cell = document.createElement(cellType);
      cell.textContent = value;
      row.appendChild(cell);
    }
    return row;
  }

  return { showVerdict, showStepTable };
})();