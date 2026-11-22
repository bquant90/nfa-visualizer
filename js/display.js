// display.js: draws the machine with Cytoscape and lights up the current states.
//
// Two jobs so far:
//   1. Draw the machine with Cytoscape (drawMachine, clearMachine).
//   2. Show a run's result: the verdict box and the table of recorded steps.
// This is the ONLY file that talks to Cytoscape.

const Display = (function () {

  // ---------- 1. Drawing the machine ----------

  // The current Cytoscape drawing (null when nothing is drawn).
  let cy = null;

  // IDs for the invisible "start arrow" pieces. They contain spaces on
  // purpose: state names can never contain spaces, so these can't clash.
  const GHOST = "start arrow";
  const GHOST_EDGE = "start arrow edge";

  // How everything looks. Written a lot like CSS: "selector" says which
  // elements a rule applies to, "style" says how they look.
  const STYLE = [
    { selector: "node", style: {
        "label": "data(id)",
        "text-valign": "center",
        "font-family": "Consolas, monospace",
        "font-size": 16,
        "width": "data(size)",            // bigger circles for longer names
        "height": "data(size)",
        "background-color": "#ffffff",
        "border-width": 2,
        "border-color": "#334155",
    }},
    // Accepting states get a double ring. "double" needs a thick border to show.
    { selector: "node.accepting", style: {
        "border-style": "double",
        "border-width": 7,
    }},
    // The invisible dot the start arrow comes from.
    { selector: "node.ghost", style: {
        "width": 1, "height": 1,
        "background-opacity": 0,
        "border-width": 0,
        "label": "",
        "events": "no",
    }},
    { selector: "edge", style: {
        "label": "data(label)",
        "curve-style": "bezier",          // curves arrows apart when two states point at each other
        "target-arrow-shape": "triangle",
        "width": 2,
        "line-color": "#64748b",
        "target-arrow-color": "#64748b",
        "font-family": "Consolas, monospace",
        "font-size": 15,
        "text-background-color": "#fcfcfd",   // a small backing so labels stay readable over lines
        "text-background-opacity": 1,
        "text-background-padding": 2,
        "loop-direction": "0deg",         // loop arrows (state to itself) sit on top
        "loop-sweep": "-50deg",
        "control-point-step-size": 50,    // how far apart parallel arrows curve
    }},
    { selector: "edge.start-edge", style: { "label": "" } },
  ];

  // Turn a parsed machine into Cytoscape "elements": one node per state,
  // one edge per (from, to) pair. If several characters lead from the same
  // state to the same state, they share one arrow labeled "0, 1".
  function buildElements(machine) {
    const elements = [];

    for (const state of Parser.sorted(machine.states)) {
      elements.push({
        group: "nodes",
        data: { id: state, size: Math.max(54, Array.from(state).length * 10 + 22) },
        classes: machine.accepting.has(state) ? "accepting" : "",
      });
    }

    // Group symbols by (from, to).
    const pairs = new Map();   // "edge from q0 to q1" -> { from, to, symbols: [] }
    for (const from of Parser.sorted(machine.transitions.keys())) {
      const bySymbol = machine.transitions.get(from);
      for (const symbol of Parser.sorted(bySymbol.keys())) {
        for (const to of Parser.sorted(bySymbol.get(symbol))) {
          const id = edgeId(from, to);
          if (!pairs.has(id)) pairs.set(id, { from, to, symbols: [] });
          pairs.get(id).symbols.push(symbol);
        }
      }
    }
    for (const [id, { from, to, symbols }] of pairs) {
      elements.push({
        group: "edges",
        data: { id, source: from, target: to, label: symbols.join(", ") },
      });
    }

    // The start arrow: an invisible dot with an arrow into the start state.
    elements.push({ group: "nodes", data: { id: GHOST }, classes: "ghost" });
    elements.push({
      group: "edges",
      data: { id: GHOST_EDGE, source: GHOST, target: machine.startState },
      classes: "start-edge",
    });
    return elements;
  }

  // The ID of the arrow between two states. Phase 4 uses this to find the
  // exact arrow a step used.
  function edgeId(from, to) {
    return `edge from ${from} to ${to}`;
  }

  // Draw a machine inside the given box, replacing any old drawing.
  function drawMachine(container, machine) {
    clearMachine(container);

    cy = cytoscape({
      container,
      elements: buildElements(machine),
      style: STYLE,
      minZoom: 0.2,
      maxZoom: 2.5,
      boxSelectionEnabled: false,   // no drag-to-select rectangle; dragging moves circles
      autounselectify: true,        // clicking doesn't "select" things (Phase 4 does highlighting)
    });

    arrange(machine);

    // Keep the start arrow attached when someone drags the start state.
    cy.getElementById(machine.startState).on("position", () => placeGhost(machine));
  }

  // Lay the states out left to right, starting from the start state.
  // "breadthfirst" puts the start state first, then everything one arrow away,
  // then everything two arrows away, and so on, like the columns of a textbook diagram.
  function arrange(machine) {
    const ghost = cy.getElementById(GHOST);
    const everythingElse = cy.elements().not(ghost).not(cy.getElementById(GHOST_EDGE));

    everythingElse.layout({
      name: "breadthfirst",
      directed: true,
      roots: cy.getElementById(machine.startState),
      direction: "rightward",
      spacingFactor: 1.2,
      fit: false,
      animate: false,
    }).run();

    placeGhost(machine);
    cy.fit(undefined, 40);   // zoom so everything fits, with 40px of breathing room
    // Small machines would otherwise be blown up huge, so cap how close we start.
    if (cy.zoom() > 1.2) {
      cy.zoom(1.2);
      cy.center();
    }
  }

  // Put the invisible dot just to the left of the start state.
  function placeGhost(machine) {
    const start = cy.getElementById(machine.startState).position();
    cy.getElementById(GHOST).position({ x: start.x - 75, y: start.y });
  }

  // Remove the drawing and show a grey message instead.
  function clearMachine(container, message) {
    if (cy) { 
        cy.destroy(); 
        cy = null; 
    }
    container.replaceChildren();
    if (message) {
      const p = document.createElement("p");
      p.className = "placeholder";
      p.textContent = message;
      container.appendChild(p);
    }
  }

  // ---------- 2. Showing a run's result ----------

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

  return { drawMachine, clearMachine, edgeId, showVerdict, showStepTable };
})();