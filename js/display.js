// display.js: draws the machine with Cytoscape and lights up the current states.
//
// Three jobs:
//   1. Draw the machine with Cytoscape (drawMachine, arrange, fitView, clearMachine).
//   2. Show a run's result: the verdict box, the tape, and the table of recorded steps.
//   3. Show ONE recorded step: light up states and arrows, the tape, the table row (showStep).
// This is the ONLY file that talks to Cytoscape. It never decides WHICH step
// to show; player.js and app.js decide that and call showStep().

const Display = (function () {

  // ---------- 1. Drawing the machine ----------

  // The current Cytoscape drawing (null when nothing is drawn).
  // Phase 4 will use this to light up states and arrows.
  let cy = null;

  // The start state of the machine being drawn (the start arrow points at it).
  let startState = null;

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
        // Fade colors in and out instead of snapping.
        "transition-property": "background-color, border-color",
        "transition-duration": 250,
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
        "transition-property": "line-color, target-arrow-color, width",
        "transition-duration": 250,
    }},
    { selector: "edge.start-edge", style: { "label": "" } },

    // ----- Playback highlights (added and removed by showStep) -----
    // Where the machine could be right now.
    { selector: "node.current", style: {
        "background-color": "#fde68a",
        "border-color": "#b45309",
    }},
    // A guess that just hit a dead end (no arrow for the character read).
    { selector: "node.dead", style: {
        "border-color": "#dc2626",
        "border-style": "dashed",
        "border-width": 3,
    }},
    // Arrows used on this step.
    { selector: "edge.taken", style: {
        "line-color": "#ea580c",
        "target-arrow-color": "#ea580c",
        "width": 4,
        "color": "#c2410c",
        "font-weight": "bold",
        "z-index": 10,
    }},
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
  function drawMachine(container, machine, layoutName) {
    clearMachine(container);
    startState = machine.startState;

    cy = cytoscape({
      container,
      elements: buildElements(machine),
      style: STYLE,
      minZoom: 0.1,
      maxZoom: 2.5,
      boxSelectionEnabled: false,   // no drag-to-select rectangle; dragging moves circles
      autounselectify: true,        // clicking doesn't "select" things (Phase 4 does highlighting)
    });

    arrange(layoutName, false);

    // Keep the start arrow attached when someone drags the start state
    // (and while a layout animates it to a new spot).
    cy.getElementById(startState).on("position", placeGhost);
  }

  // The three ways to arrange the states. Each one is a set of Cytoscape
  // layout options. They all leave out the invisible start-arrow pieces,
  // which placeGhost() positions by hand afterwards.
  function layoutOptions(layoutName) {
    if (layoutName === "spread-out") {
      // A physics simulation: arrows pull like springs, circles push apart.
      // Starts from random spots, so every click gives a new arrangement.
      return { name: "cose", randomize: true, nodeRepulsion: () => 400000,
               idealEdgeLength: () => 110, nodeOverlap: 20, padding: 40 };
    }
    if (layoutName === "circle") {
      // Every state evenly spaced around a ring, in name order.
      return { name: "circle", avoidOverlap: true, padding: 40 };
    }
    // Default, "left-to-right": the start state first, then everything one arrow
    // away, then two arrows away, and so on, like the columns of a textbook diagram.
    return { name: "breadthfirst", directed: true, roots: cy.getElementById(startState),
             direction: "rightward", spacingFactor: 1.2, padding: 40 };
  }

  // Arrange the states, then zoom so everything fits.
  // animate = true glides the circles to their new spots (used when switching layouts).
  function arrange(layoutName, animate) {
    if (!cy) return;
    // Hand the states over in "people order" (r2 before r10). Layouts place
    // states in the order they receive them. (Cytoscape's own "sort" option
    // for the circle layout is ignored in this version, so we sort here instead.)
    const states = cy.nodes().not(cy.getElementById(GHOST))
      .sort((a, b) => a.id().localeCompare(b.id(), undefined, { numeric: true }));
    const arrows = cy.edges().not(cy.getElementById(GHOST_EDGE));
    const layout = states.union(arrows).layout({
      ...layoutOptions(layoutName),
      fit: false,
      animate,
      animationDuration: 500,
    });
    layout.one("layoutstop", () => { placeGhost(); fitView(animate); });
    layout.run();
  }

  // Zoom and pan so the whole machine is visible, with some breathing room.
  // Small machines would otherwise be blown up huge, so the zoom is capped.
  function fitView(animate = true) {
    if (!cy) return;
    const padding = 40;
    // Work out where "fit" would land without moving anything yet.
    const box = cy.elements().boundingBox();
    const width = cy.width() - 2 * padding;
    const height = cy.height() - 2 * padding;
    const zoom = Math.min(1.2, width / box.w, height / box.h);
    const pan = {
      x: cy.width() / 2 - zoom * (box.x1 + box.w / 2),
      y: cy.height() / 2 - zoom * (box.y1 + box.h / 2),
    };
    if (animate) cy.animate({ zoom, pan, duration: 400 });
    else { cy.zoom(zoom); cy.pan(pan); }
  }

  // Put the invisible dot beside the start state, so the start arrow points in
  // from the side. Loops sit on top of circles, so the side keeps them apart.
  // It comes from the left, unless the start state is on the right of the drawing.
  function placeGhost() {
    if (!cy) return;
    const start = cy.getElementById(startState).position();
    const states = cy.nodes().not(cy.getElementById(GHOST));
    const box = states.boundingBox();
    const middle = box.x1 + box.w / 2;
    const side = start.x > middle + 1 ? 1 : -1;   // +1 = right, -1 = left
    cy.getElementById(GHOST).position({ x: start.x + side * 75, y: start.y });
  }

  // Remove the drawing and show a grey message instead.
  function clearMachine(container, message) {
    if (cy) { cy.destroy(); cy = null; }
    container.replaceChildren();
    if (message) {
      const p = document.createElement("p");
      p.className = "placeholder";
      p.textContent = message;
      container.appendChild(p);
    }
  }

  // ---------- 2. Showing a run's result ----------

  // Built once per run, then updated by showStep().
  let tapeCells = [];   // one box per character of the string
  let tableRows = [];   // one table row per recorded step

  // Show the final answer in a green or red box.
  // The wording is temporary. Phase 5 replaces the reason codes with plain English.
  function showVerdict(box, result) {
    const label = result.text === "" ? "(empty string)" : `"${result.text}"`;
    const answer = result.accepted ? "Accepted" : "Rejected";
    box.hidden = false;
    box.className = "status " + (result.accepted ? "ok" : "error");
    box.textContent = `${label} is ${answer}   (reason code: ${result.reason})`;
  }

  // Build the tape: the test string, one box per character.
  function showTape(container, result) {
    container.replaceChildren();
    tapeCells = [];
    const characters = Array.from(result.text);
    if (characters.length === 0) {
      const note = document.createElement("span");
      note.className = "note";
      note.textContent = "(empty string: nothing to read)";
      container.appendChild(note);
      return;
    }
    for (const ch of characters) {
      const cell = document.createElement("span");
      cell.className = "cell";
      cell.textContent = ch === " " ? "␣" : ch;   // make spaces visible
      container.appendChild(cell);
      tapeCells.push(cell);
    }
  }

  // Show every recorded step as one row of a table.
  // onPick(index) runs when someone clicks a row.
  function showStepTable(container, result, onPick) {
    container.replaceChildren();   // clear out the previous run
    tableRows = [];

    const table = document.createElement("table");
    table.className = "step-table";
    addRow(table, "th", ["Step", "Read", "Before", "After", "Arrows used", "Dead ends"]);

    result.steps.forEach((step, index) => {
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
      row.classList.add("clickable");
      row.addEventListener("click", () => onPick(index));
      tableRows.push(row);
    });
    container.appendChild(table);

    // If the machine stopped early, say which characters it never read.
    if (result.unread) {
      const note = document.createElement("p");
      note.className = "step-note";
      note.textContent = `Stopped early. Never read: "${result.unread}"`;
      container.appendChild(note);
    }
  }

  // ---------- 3. Showing one step ----------

  // Light up everything for step number "index" of a run.
  function showStep(result, index, labelBox) {
    const step = result.steps[index];
    const isLast = index === result.steps.length - 1;

    // The drawing: clear old highlights, then add this step's.
    if (cy) {
      cy.elements().removeClass("current taken dead");
      for (const state of step.after) cy.getElementById(state).addClass("current");
      if (step.kind === "start") cy.getElementById(GHOST_EDGE).addClass("taken");
      for (const move of step.moves) cy.getElementById(edgeId(move.from, move.to)).addClass("taken");
      // A dead end only gets marked if no other guess landed on that state.
      for (const state of step.deadEnds) {
        if (!step.after.includes(state)) cy.getElementById(state).addClass("dead");
      }
    }

    // The tape: characters before this step are done, this one is current.
    const stoppedEarly = isLast && result.unread.length > 0;
    tapeCells.forEach((cell, i) => {
      let state = "";
      if (i < step.position - 1) state = "done";
      else if (i === step.position - 1) state = "current";
      else if (stoppedEarly) state = "never";
      cell.className = "cell " + state;
    });

    // The table: mark the matching row.
    tableRows.forEach((row, i) => row.classList.toggle("current-row", i === index));

    // The label next to the buttons. Phase 5 replaces this with a real caption.
    const total = Array.from(result.text).length;
    labelBox.textContent = step.kind === "start"
      ? `Start (0 of ${total} characters read)`
      : `Step ${step.position} of ${total}: read '${step.symbol}'` +
        (stoppedEarly ? "  (stopped: nothing left)" : "");
  }

  // Remove every trace of the last run (used when the machine changes).
  function clearRun(tapeBox, labelBox) {
    if (cy) cy.elements().removeClass("current taken dead");
    tapeBox.replaceChildren();
    tapeCells = [];
    tableRows = [];
    labelBox.textContent = "";
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

  return {
    drawMachine, arrange, fitView, clearMachine, edgeId,
    showVerdict, showTape, showStepTable, showStep, clearRun,
  };
})();