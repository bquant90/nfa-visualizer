// engine.js: runs the machine on a string and records every step as data.
//
// This is the JavaScript twin of nfa_accepts_string() in
// python/project_1_revamp.py. It never draws anything and never writes
// sentences. It only records facts. The display plays those facts
// back, and explain.js turns them into plain English.
//
// What Engine.run() hands back:
//   {
//     text:      the string that was tested, e.g. "101"
//     steps:     a list of snapshots, one per moment (see below)
//     accepted:  true or false
//     reason:    "accepted"          ended on at least one accepting state
//                "no-accepting-state" finished reading, but no accepting state
//                "stuck"             ran out of possible states partway through
//                "not-in-alphabet"   got stuck because a character isn't in the alphabet
//     winners:   accepting states the machine ended on (empty unless accepted)
//     unread:    characters never read because the machine stopped early
//     outsideAlphabet: every distinct character in the string that isn't in the alphabet
//   }
//
// Each step looks like:
//   {
//     kind:       "start" (the moment before reading anything) or "read"
//     position:   how many characters have been read after this step (0, 1, 2, ...)
//     symbol:     the character just read (null for the start step)
//     inAlphabet: whether that character is in the alphabet
//     before:     possible states before reading, sorted
//     after:      possible states after reading, sorted
//     moves:      every arrow used: [{ from, symbol, to }, ...]
//     deadEnds:   states in "before" that had no arrow for this character
//   }

const Engine = (function () {

  // From ONE state reading ONE symbol, where may we go?
  // No matching rule means nowhere to go: an empty set, not an error.
  function movesFrom(machine, state, symbol) {
    const bySymbol = machine.transitions.get(state);
    if (!bySymbol) {
      return new Set();
    }
    return bySymbol.get(symbol) || new Set();
  }

  function run(machine, text) {
    const characters = Array.from(text);   // One item per character
    const steps = [];

    // The machine starts with exactly one possible state.
    let possible = new Set([machine.startState]);
    steps.push({
      kind: "start", position: 0, symbol: null, inAlphabet: true,
      before: [], after: Parser.sorted(possible), moves: [], deadEnds: [],
    });

    for (let i = 0; i < characters.length; i++) {
      const symbol = characters[i];
      const next = new Set();
      const moves = [];
      const deadEnds = [];

      // Every possible state moves at once. All destinations join one new set.
      for (const state of Parser.sorted(possible)) {
        const destinations = movesFrom(machine, state, symbol);
        if (destinations.size === 0) {
          deadEnds.push(state);
        }
        for (const to of Parser.sorted(destinations)) {
          moves.push({ from: state, symbol, to });
          next.add(to);
        }
      }

      steps.push({
        kind: "read", position: i + 1, symbol,
        inAlphabet: machine.alphabet.has(symbol),
        before: Parser.sorted(possible), after: Parser.sorted(next),
        moves, deadEnds,
      });
      possible = next;

      // Nothing left means stuck. No later character can revive it, so stop early.
      if (possible.size === 0) {
        const reason = machine.alphabet.has(symbol) ? "stuck" : "not-in-alphabet";
        return finish(machine, text, steps, false, reason, [], characters.slice(i + 1));
      }
    }

    // Finished reading. Did we end on any accepting state?
    const winners = Parser.sorted(possible).filter(state => machine.accepting.has(state));
    const accepted = winners.length > 0;
    return finish(machine, text, steps, accepted,
                  accepted ? "accepted" : "no-accepting-state", winners, []);
  }

  // Package everything into the result object described at the top.
  function finish(machine, text, steps, accepted, reason, winners, unread) {
    const outside = Array.from(new Set(Array.from(text)))
                         .filter(ch => !machine.alphabet.has(ch));
    return {
      text, steps, accepted, reason, winners,
      unread: unread.join(""),
      outsideAlphabet: outside,
    };
  }

  return { run, movesFrom };
})();