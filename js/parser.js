// parser.js: turns "label: value" text into a machine, or a list of problems.
//
// This is the JavaScript twin of read_nfa_file() and validate() in
// python/project_1_revamp.py. The error messages are copied word for word,
// so both versions can be compared side by side.
//
// What a "machine" looks like once parsed:
//   alphabet:    Set of symbols,           e.g. {"0", "1"}
//   states:      Set of state names,       e.g. {"q0", "q1", "q2"}
//   startState:  one state name,           e.g. "q0"
//   accepting:   Set of winning states,    e.g. {"q2"}
//   transitions: Map  state -> Map  symbol -> Set of next states
//                e.g. "q0" -> "0" -> {"q0", "q1"}

const Parser = (function () {

  // ---------- Small helpers that copy Python's exact behavior ----------

  // Python and JavaScript disagree on a few rare "whitespace" characters.
  // To match Python exactly, we spell out Python's list ourselves.
  const PY_SPACE = "\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a" +
                   "\\u2028\\u2029\\u202f\\u205f\\u3000";
  const SPACE_RUN = new RegExp("[" + PY_SPACE + "]+");
  const SPACE_AT_ENDS = new RegExp("^[" + PY_SPACE + "]+|[" + PY_SPACE + "]+$", "g");

  // The characters Python's str.splitlines() treats as line breaks.
  const LINE_BREAK = /\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/;

  // Just like Python's str.strip(): trim whitespace off both ends.
  function strip(text) {
    return text.replace(SPACE_AT_ENDS, "");
  }

  // Like split_words() in Python: split on commas and/or whitespace.
  function splitWords(value) {
    return value.replaceAll(",", " ").split(SPACE_RUN).filter(
        word => word !== ""
    );
  }

  // Sort text the way Python's sorted() does (by character code).
  function compare(a, b) {
    const A = Array.from(a);
    const B = Array.from(b);
    for (let i = 0; i < Math.min(A.length, B.length); i++) {
      const diff = A[i].codePointAt(0) - B[i].codePointAt(0);
      if (diff !== 0) {
        return diff;
      }
    }
    return A.length - B.length;
  }

  function sorted(items) {
    return Array.from(items).sort(compare);
  }

  // Like format_states() in Python: {q0, q1}, always in sorted order.
  function formatSet(items) {
    const list = sorted(items);
    return list.length === 0 ? "{}" : "{" + list.join(", ") + "}";
  }

  // Our version of Python's NFAFileError. Only used inside this file.
  class ParseProblem extends Error {}

  // ---------- Reading the text ----------

  // Like add_rule() in Python. Accepts "q0 -- 0 --> q1" or "q0, 0, q1".
  function addRule(transitions, value, lineNumber) {
    // Strip "-->" before "--", because "-->" contains "--".
    const cleaned = value.replaceAll("-->", " ").replaceAll("--", " ");
    const parts = splitWords(cleaned);

    if (parts.length !== 3) {
      throw new ParseProblem(
        `line ${lineNumber}: a rule needs 3 parts ` +
        `(from state, symbol, to state) but found ${parts.length} in '${value}'`
      );
    }

    const [fromState, symbol, toState] = parts;
    if (!transitions.has(fromState)) {
        transitions.set(fromState, new Map());
    }
    const bySymbol = transitions.get(fromState);
    if (!bySymbol.has(symbol)) {
        bySymbol.set(symbol, new Set());
    }
    // Two rules with the same state and symbol both land in this one Set.
    // That is how "nondeterministic" choices get recorded.
    bySymbol.get(symbol).add(toState);
  }

  // Like read_nfa_file() in Python. Stops at the first broken line.
  function read(source) {
    const alphabet = new Set();
    const states = new Set();
    const startStates = [];
    const accepting = new Set();
    const transitions = new Map();
    const tests = [];

    const lines = source.split(LINE_BREAK);
    lines.forEach((rawLine, index) => {
      const lineNumber = index + 1;
      const line = strip(rawLine);

      if (line === "" || line.startsWith("#")) return;   // blank or comment

      if (!line.includes(":")) {
        throw new ParseProblem(
          `line ${lineNumber}: expected 'label: value' but found '${line}'`
        );
      }

      // Split on the FIRST colon only.
      const colon = line.indexOf(":");
      const label = strip(line.slice(0, colon)).toLowerCase();
      const value = strip(line.slice(colon + 1));

      if (label === "alphabet")       splitWords(value).forEach(s => alphabet.add(s));
      else if (label === "states")    splitWords(value).forEach(s => states.add(s));
      else if (label === "start")     startStates.push(...splitWords(value));
      else if (label === "accepting") splitWords(value).forEach(s => accepting.add(s));
      else if (label === "rule")      addRule(transitions, value, lineNumber);
      else if (label === "test")      tests.push(value);   // "" means the empty string
      else {
        throw new ParseProblem(
          `line ${lineNumber}: unknown label '${label}' (expected ` +
          `alphabet, states, start, accepting, rule, or test)`
        );
      }
    });

    if (startStates.length !== 1) {
      throw new ParseProblem(
        `expected exactly one start state, found ${startStates.length}`
      );
    }

    const machine = { alphabet, states, startState: startStates[0], accepting, transitions };
    return { machine, tests };
  }

  // ---------- Checking the machine makes sense ----------

  // Like validate() in Python. Collects every problem, then reports them together.
  function validate(machine) {
    const problems = [];

    if (!machine.states.has(machine.startState)) {
      problems.push(`start state '${machine.startState}' is not in the state list`);
    }

    for (const state of sorted(machine.accepting)) {
      if (!machine.states.has(state)) {
        problems.push(`accepting state '${state}' is not in the state list`);
      }
    }

    for (const state of sorted(machine.transitions.keys())) {
      const bySymbol = machine.transitions.get(state);
      for (const symbol of sorted(bySymbol.keys())) {
        if (!machine.states.has(state)) {
          problems.push(`a rule starts from unknown state '${state}'`);
        }
        if (!machine.alphabet.has(symbol)) {
          problems.push(`a rule reads '${symbol}', which is not in the alphabet`);
        }
        for (const destination of sorted(bySymbol.get(symbol))) {
          if (!machine.states.has(destination)) {
            problems.push(`a rule leads to unknown state '${destination}'`);
          }
        }
      }
    }

    if (problems.length > 0) {
      const unique = [...new Set(problems)];   // remove repeats, keep order
      throw new ParseProblem(
        "this machine description has problems:\n  - " + unique.join("\n  - ")
      );
    }
  }

  // ---------- What other files use ----------

  // The main entry point. Never crashes: always hands back a result.
  //   Success: { ok: true,  machine, tests }
  //   Failure: { ok: false, message }   (message matches Python's, minus "Error: ")
  function parse(source) {
    // Python opens files as "utf-8-sig", which drops an invisible marker
    // some editors put at the very start. We drop it too.
    const text = source.replace(/^\uFEFF/, "");
    try {
      const { machine, tests } = read(text);
      validate(machine);
      return { ok: true, machine, tests };
    } 
    catch (error) {
      if (error instanceof ParseProblem) return { ok: false, message: error.message };
      throw error;   // a real bug in our code, not a bad file
    }
  }

  // Like count_rules() in Python: one arrow per destination.
  function ruleCount(machine) {
    let total = 0;
    for (const bySymbol of machine.transitions.values()) {
      for (const destinations of bySymbol.values()) total += destinations.size;
    }
    return total;
  }

  // The same five summary lines Python prints after loading a machine.
  function describe(machine) {
    return [
      `Alphabet:  ${formatSet(machine.alphabet)}`,
      `States:    ${formatSet(machine.states)}`,
      `Start:     ${machine.startState}`,
      `Accepting: ${formatSet(machine.accepting)}`,
      `Rules:     ${ruleCount(machine)}`,
    ];
  }

  return { parse, describe, formatSet, sorted, ruleCount };
})();