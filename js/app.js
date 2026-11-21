// app.js: the glue. Connects buttons and boxes on the page to everything else.

// temp smoke test
cytoscape({
  container: document.getElementById("machine"),

  elements: [
    { data: { id: "q0" } },
    { data: { id: "q1" } },
    { data: { id: "rule1", source: "q0", target: "q1", label: "0" } }
  ],

  style: [
    { selector: "node", style: { "label": "data(id)", "text-valign": "center",
        "background-color": "#dbeafe", "border-width": 2, "border-color": "#1e40af" } },
    { selector: "edge", style: { "label": "data(label)", "curve-style": "bezier",
        "target-arrow-shape": "triangle", "width": 2 } }
  ],

  layout: { name: "grid" }
});