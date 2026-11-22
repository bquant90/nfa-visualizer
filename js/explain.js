// explain.js: turns each recorded step into a plain-English sentence.
//
// It never draws anything and never runs the machine. It only reads the
// facts the engine recorded and picks words for them. That means the
// wording can change freely without any risk of breaking the logic.
//
// Three things it can explain:
//   Explain.step(machine, result, index) -> { what, why } for one step, e.g.
//     { what: "Read '0'. The machine could now be in q0 or q1.",
//       why:  "q0 has 2 arrows for '0' (to q0 and q1), so the machine follows both." }
//   Explain.verdict(machine, result)     -> { title, detail } for the final answer
//   Explain.headsUp(machine, result)     -> a warning about unknown characters, or null
//
// Length rules, so captions stay short even for huge machines:
//   - "what" is one sentence; "why" gives at most two facts.
//   - Lists of names stop after 4: "q1, q2, q3, q4 and 6 more".

const Explain = (function () {

  const MAX_NAMES = 4;

  // "q0", "q0 or q1", "q0, q1 or q2", "q0, q1, q2, q3 and 5 more"
  function list(names, joiner = "or") {
    const items = Array.from(names);
    if (items.length === 0) return "nothing";
    if (items.length > MAX_NAMES) {
      return items.slice(0, MAX_NAMES).join(", ") + ` and ${items.length - MAX_NAMES} more`;
    }
    if (items.length === 1) return items[0];
    return items.slice(0, -1).join(", ") + ` ${joiner} ` + items[items.length - 1];
  }

  // How to write a character in a sentence. Invisible characters get plain names.
  function quoteChar(ch) {
    if (ch === " ")  return "a space";
    if (ch === "\t") return "a tab";
    if (ch === "\n" || ch === "\r") return "a line break";
    if (ch === "\u00a0") return "a non-breaking space";
    if (/^[\s\p{Cc}\p{Cf}]$/u.test(ch)) return "an invisible character";
    return `'${ch}'`;
  }

  // The machine's alphabet with each character quoted, e.g. "'a', 'c', 's' and 't'".
  function alphabetList(machine) {
    return list(Parser.sorted(machine.alphabet).map(quoteChar), "and");
  }

  // ---------- The main entry point ----------

  function step(machine, result, index) {
    const s = result.steps[index];

    if (s.kind === "start") {
      return {
        what: `The machine starts in ${s.after[0]}. It hasn't read anything yet.`,
        why: "Every run begins at the start state: the one with the arrow coming from nowhere.",
      };
    }

    const sym = quoteChar(s.symbol);

    // Case 1: a character the machine doesn't know at all.
    if (!s.inAlphabet) {
      return {
        what: machine.alphabet.size === 0
          ? `Read ${sym}, but this machine has no characters in its alphabet.`
          : `Read ${sym}, which isn't one of this machine's characters (${alphabetList(machine)}).`,
        why: "No arrow can read it, so every guess hits a dead end and the machine is stuck.",
      };
    }

    // Case 2: a normal character, but no possible state has an arrow for it.
    if (s.after.length === 0) {
      return {
        what: `Read ${sym}. The machine is stuck: there's nowhere left to go.`,
        why: s.before.length === 1
          ? `${s.before[0]} has no arrow for ${sym}.`
          : `None of the possible states (${list(s.before)}) has an arrow for ${sym}.`,
      };
    }

    // Case 3: the normal case. Say where it could be now, then the most
    // interesting facts about why.
    const where = s.after.length === 1
      ? `The machine is now in ${s.after[0]}.`
      : `The machine could now be in ${list(s.after)}.`;

    return { what: `Read ${sym}. ${where}`, why: reasons(s, sym).slice(0, 2).join(" ") };
  }

  // Every fact worth mentioning about a normal step, most important first.
  function reasons(s, sym) {
    // Group the arrows used: which states each state went to, and which
    // states each destination came from.
    const goesTo = new Map();     // from -> [to, to, ...]
    const cameFrom = new Map();   // to   -> [from, from, ...]
    for (const { from, to } of s.moves) {
      if (!goesTo.has(from)) goesTo.set(from, []);
      goesTo.get(from).push(to);
      if (!cameFrom.has(to)) cameFrom.set(to, []);
      cameFrom.get(to).push(from);
    }

    const splits   = [...goesTo].filter(([, tos]) => tos.length > 1);
    const refilled = s.deadEnds.filter(state => s.after.includes(state));
    const dropped  = s.deadEnds.filter(state => !s.after.includes(state));
    const merges   = [...cameFrom].filter(([, froms]) => froms.length > 1);
    const out = [];

    // 1. The confusing case first: a guess dies, but another lands right back on it.
    if (refilled.length === 1) {
      const state = refilled[0];
      const froms = cameFrom.get(state);
      const arrival = froms.length === 1
        ? `${froms[0]}'s arrow brings a new guess to ${state}.`
        : `arrows from ${list(froms, "and")} bring new guesses to ${state}.`;
      out.push(`${state} has no arrow for ${sym}, so its own guess is dropped, ` +
               `but ${arrival}`);
    } else if (refilled.length > 1) {
      out.push(`${list(refilled, "and")} have no arrow for ${sym}, but other arrows ` +
               `bring new guesses back to them.`);
    }

    // 2. Splits: one state with several arrows for this character.
    if (splits.length === 1) {
      const [from, tos] = splits[0];
      const all = tos.length === 2 ? "both" : "all of them";
      out.push(`${from} has ${tos.length} arrows for ${sym} (to ${list(tos, "and")}), ` +
               `so the machine follows ${all}.`);
    } else if (splits.length > 1) {
      out.push(`${splits.length} states have more than one arrow for ${sym}, ` +
               `so their guesses split.`);
    }

    // 3. Dead ends: guesses with no arrow for this character.
    if (dropped.length === 1) {
      out.push(`${dropped[0]} has no arrow for ${sym}, so that guess is dropped.`);
    } else if (dropped.length > 1 && dropped.length <= MAX_NAMES) {
      out.push(`${list(dropped, "and")} have no arrow for ${sym}, so those guesses are dropped.`);
    } else if (dropped.length > MAX_NAMES) {
      out.push(`${dropped.length} guesses have no arrow for ${sym} and are dropped.`);
    }

    // 4. Merges: different guesses landing on the same state.
    if (merges.length === 1) {
      const [to, froms] = merges[0];
      const both = froms.length === 2 ? "both" : "all";
      out.push(`${list(froms, "and")} ${both} lead to ${to}, so those guesses join into one.`);
    } else if (merges.length > 1) {
      out.push("Some guesses landed on the same state, so they join together.");
    }

    // 5. Nothing special happened: every state just followed its one arrow.
    if (out.length === 0) {
      if (s.moves.length === 1) {
        const { from, to } = s.moves[0];
        out.push(from === to
          ? `${from}'s arrow for ${sym} loops back to itself.`
          : `${from} has one arrow for ${sym}, and it leads to ${to}.`);
      } else {
        out.push(`Each possible state follows its one arrow for ${sym}.`);
      }
    }
    return out;
  }

  // ---------- The final answer ----------

  // How to name the tested string in a sentence. Long strings get a short name.
  function nameOf(text) {
    const length = Array.from(text).length;
    if (length === 0) return "The empty string";
    if (length <= 24) return `"${text}"`;
    return `This ${length}-character string`;
  }

  // "a double circle (an accepting state)" / "double circles (accepting states)".
  function doubleCircles(count) {
    return count === 1
      ? "a double circle (an accepting state)"
      : "double circles (accepting states)";
  }

  function verdict(machine, result) {
    const name = nameOf(result.text);
    const last = result.steps[result.steps.length - 1];
    const empty = result.text === "";

    if (result.accepted) {
      const w = result.winners;
      const isAre = w.length === 1 ? "is" : "are";
      let detail;
      if (last.after.length === 1) {
        detail = empty
          ? `With nothing to read, the machine stays in ${last.after[0]}, which is ${doubleCircles(1)}.`
          : `After reading every character, the machine finished in ${last.after[0]}, which is ${doubleCircles(1)}.`;
      } else {
        detail = `After reading every character, the machine could be in ${list(last.after)}, ` +
                 `and ${list(w, "and")} ${isAre} ${doubleCircles(w.length)}.`;
        // Some guesses finished elsewhere. That's fine: one winner is enough.
        if (last.after.length > w.length) detail += " Only one guess has to finish on a double circle.";
      }
      return { title: `✓ ${name} is accepted.`, detail };
    }

    const title = `✗ ${name} is rejected.`;

    if (result.reason === "no-accepting-state") {
      const states = last.after;
      const where = empty
        ? `With nothing to read, the machine stays in ${states[0]}`
        : `The machine read every character and finished in ${list(states)}`;
      const ending = states.length === 1
        ? `, which isn't a double circle (accepting state).`
        : `, but none of those are double circles (accepting states).`;
      return { title, detail: where + ending };
    }

    const stuckAt = last.position;   // which character it got stuck on (1 = first)
    const neverRead = result.unread
      ? ` It never read the rest of the string.`
      : "";

    if (result.reason === "not-in-alphabet") {
      const unknown = result.outsideAlphabet.map(quoteChar);
      const what = unknown.length === 1
        ? `It contains ${unknown[0]}, which isn't one of this machine's characters`
        : `It contains ${list(unknown, "and")}, which aren't characters this machine knows`;
      const knows = machine.alphabet.size === 0
        ? "this machine has no characters in its alphabet"
        : `it only knows ${alphabetList(machine)}`;
      return {
        title,
        detail: `${what} (${knows}). ` +
                `The machine got stuck as soon as it reached character ${stuckAt}.` + neverRead,
      };
    }

    // reason === "stuck": a real character, but no arrow for it.
    return {
      title,
      detail: `The machine got stuck at character ${stuckAt} (${quoteChar(last.symbol)}): ` +
              `none of its possible states had an arrow for it, so it couldn't finish reading.` +
              neverRead,
    };
  }

  // A warning shown on the tape as soon as a string is run, if it contains
  // characters the machine doesn't know. Returns null when there's nothing to warn about.
  function headsUp(machine, result) {
    const unknown = result.outsideAlphabet.map(quoteChar);
    if (unknown.length === 0) return null;
    const these = unknown.length === 1
      ? `${unknown[0]} isn't one of this machine's characters`
      : `${list(unknown, "and")} aren't characters this machine knows`;
    const knows = machine.alphabet.size === 0
      ? "this machine has no characters in its alphabet"
      : `it only knows ${alphabetList(machine)}`;
    const where = unknown.length === 1
      ? "It's outlined in red on the tape. Watch what happens when the machine reaches it."
      : "They're outlined in red on the tape. Watch what happens when the machine reaches one.";
    return `Heads up: ${these} (${knows}). ` + where;
  }

  return { step, verdict, headsUp };
})();