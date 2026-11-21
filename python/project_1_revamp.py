"""NFA Verifier: Checks whether strings are accepted or rejected by an NFA.

An NFA (Nondeterministic Finite Automaton) reads a string one character
at a time and finishes with a yes-or-no answer. It is built from five
pieces: ALPHABET (valid characters, e.g. 0 and 1), STATES (positions,
e.g. q0, q1, q2), START (initial state), ACCEPTING (winning states),
and RULES ("in state X, reading Y, you may move to Z").

Key functions:
    NFA               -- Stores the machine definition
    nfa_accepts_string -- Decides accept/reject for a given string
    read_nfa_file      -- Loads a machine definition from file
    validate           -- Checks whether a machine definition is well-formed
"""

# Theory of Automata Project 1: NFA Verifier (Remastered)
# Creators: Bryan Quant, Colbin Hobbs, Bhumik Bhakta
# Created: April 1, 2022
# Updated: August 1, 2026
#
#
# Exit codes: 
#   0 - Success
#   1 - Bad file or bad machine
#   2 - Wrong command-line usage

import sys
import argparse
from dataclasses import dataclass

class NFAFileError(Exception):
    """Raised when the input file is not a usable NFA description.

    Covers cases like the wrong number of lines, a malformed rule, or
    a start state that doesn't exist. Using one error type lets main()
    handle every "bad input" case in one spot.
    """
    pass

@dataclass
class NFA:
    alphabet: set                     # The allowed input symbols, e.g. {"0", "1"}
    states: set                   # Every state, e.g. {"q0", "q1", "q2"}
    start_state: str                  # The single starting state, e.g. "q0"
    accepting_states: set             # The accept states, e.g. {"q2"}
    transitions: dict                 # (state, symbol) -> set of next states

    # From ONE state reading ONE symbol, where may we go?
    # No matching rule means the machine has nowhere to go from here, so we
    # return an empty set rather than treating it as an error.
    def moves_from(self, state, symbol):
        return self.transitions.get((state, symbol), set())


def format_states(states):
    """Turn a set of states into stable, readable text like "{q0, q1}".

    Python sets have no reliable order, so the states are sorted.
    Without this, output could differ between runs, which is
    confusing when trying to trace what the machine is doing.
    
    Args:
        states (set[str]): The state names to format.
    
    Returns:
        str: The states formatted as a sorted, comma-separated set.
            e.g. "{q0, q1}".
    """
    if not states:
        return "{}"
    return "{" + ", ".join(sorted(states)) + "}"


def nfa_accepts_string(nfa, text, trace=False):
    """Decide whether the NFA accepts text.

    Args:
        nfa (NFA): The machine definition to run against.
        text (str): The string being tested.
        trace (bool): If True, print each step of the state exploration
        (start state, states after each character read, and the stuck/decision point).
        Defaults to False.

    Returns:
        bool: True if NFA accepts text, otherwise False.
    """
    # Start state
    possible_states = {nfa.start_state}
    if trace:
        print(f"    start      -> {format_states(possible_states)}")

    for symbol in text:
        next_states = set()
        for state in possible_states:
            # update() adds every item of the other set into this one.
            next_states.update(nfa.moves_from(state, symbol))
        possible_states = next_states
        if trace:
            print(f"    read '{symbol}'   -> {format_states(possible_states)}")

        # No positions left means the machine is stuck. No later characte can revive it.
        # Stop early here (a character that is not in the alphabet lands here too,
        # because no rule will ever match it).
        if not possible_states:
            if trace:
                print("    (stuck - nothing left to explore)")
            return False

    # String is finished. If anything survives, we ended on a winning state.
    # & does set intersection, it keeps only the items present in both sets.
    winners = possible_states & nfa.accepting_states
    return len(winners) > 0


def split_words(value):
    """Split a value into items on commas and/or whitespace.

    Both "q0, q1, q2" and "q0 q1 q2" produce the same list, so the file
    can be written whichever way.

    Args:
        value (str): The text after the label, e.g. "q0, q1, q2".

    Returns:
        list[str]: The individual items, with blanks removed.
    """
    return value.replace(",", " ").split()


def add_rule(transitions, value, line_number):
    """Record one transition rule into the transitions dictionary.

    Accepts either arrow form ("q0 -- 0 --> q1") or plain comma form
    ("q0, 0, q1"). The arrows are stripped and both become three words.

    Args:
        transitions (dict): The dictionary to add to, modified in place.
        value (str): The rule text after the "rule:" label.
        line_number (int): Which file line this came from, for errors.

    Raises:
        NFAFileError: If the rule does not have exactly 3 parts.
    """
    # Strip "-->" before "--", because "-->" contains "--".
    cleaned = value.replace("-->", " ").replace("--", " ")
    parts = split_words(cleaned)

    if len(parts) != 3:
        raise NFAFileError(
            f"line {line_number}: a rule needs 3 parts "
            f"(from state, symbol, to state) but found {len(parts)} in '{value}'"
        )

    from_state, symbol, to_state = parts
    key = (from_state, symbol)
    # Rules sharing a (state, symbol) key do not overwrite each other.
    # Both destinations join the same set, which is how nondeterminism
    # gets recorded.
    if key not in transitions:
        transitions[key] = set()
    transitions[key].add(to_state)


def read_nfa_file(source):
    """Read a labeled NFA description file.

    Every meaningful line is "label: value". Blank lines and lines
    starting with "#" are ignored. The labels "rule" and "test" may
    repeat and accumulate; the others are expected once. Order does
    not matter.

    Args:
        source (str): The raw file contents.

    Returns:
        tuple[NFA, list[str]]: The parsed machine and the strings to test.

    Raises:
        NFAFileError: If a line is not "label: value", uses an unknown
            label, or the file does not define exactly one start state.
    """
    alphabet = set()
    states = set()
    start_states = []
    accepting = set()
    transitions = {}
    test_strings = []

    for line_number, raw_line in enumerate(source.splitlines(), start=1):
        line = raw_line.strip()

        # Blank lines and comments carry no information.
        if not line or line.startswith("#"):
            continue

        if ":" not in line:
            raise NFAFileError(
                f"line {line_number}: expected 'label: value' but found '{line}'"
            )

        # split(":", 1) splits on the FIRST colon only, so a value is free
        # to contain colons of its own.
        label, value = line.split(":", 1)
        label = label.strip().lower()
        value = value.strip()

        if label == "alphabet":
            alphabet.update(split_words(value))
        elif label == "states":
            states.update(split_words(value))
        elif label == "start":
            start_states.extend(split_words(value))
        elif label == "accepting":
            accepting.update(split_words(value))
        elif label == "rule":
            add_rule(transitions, value, line_number)
        elif label == "test":
            # An empty value means the empty string, which is a real
            # thing to test, so we keep it exactly as written.
            test_strings.append(value)
        else:
            raise NFAFileError(
                f"line {line_number}: unknown label '{label}' (expected "
                f"alphabet, states, start, accepting, rule, or test)"
            )

    if len(start_states) != 1:
        raise NFAFileError(
            f"expected exactly one start state, found {len(start_states)}"
        )

    nfa = NFA(
        alphabet=alphabet,
        states=states,
        start_state=start_states[0],
        accepting_states=accepting,
        transitions=transitions,
    )
    return nfa, test_strings


def validate(nfa):
    """Check that the machine makes sense before running it.

    This gathers all problems and reports them together, so a whole
    file can be fixed in one pass instead of one error per run.

    Args:
        nfa (NFA): The machine definition to check.

    Raises:
        NFAFileError: If any part of the machine is invalid (start
            state, accepting states, or transitions reference unknown
            states/symbols). All problems found are listed together,
            with duplicates removed.
    """
    problems = []

    if nfa.start_state not in nfa.states:
        problems.append(f"start state '{nfa.start_state}' is not in the state list")

    for state in sorted(nfa.accepting_states):
        if state not in nfa.states:
            problems.append(f"accepting state '{state}' is not in the state list")

    for (state, symbol), destinations in sorted(nfa.transitions.items()):
        if state not in nfa.states:
            problems.append(f"a rule starts from unknown state '{state}'")
        if symbol not in nfa.alphabet:
            problems.append(f"a rule reads '{symbol}', which is not in the alphabet")
        for destination in sorted(destinations):
            if destination not in nfa.states:
                problems.append(f"a rule leads to unknown state '{destination}'")

    if problems:
        # dict.fromkeys() removes duplicates while keeping the original order.
        # The same bad state can easily be named by several rules.
        unique = list(dict.fromkeys(problems))
        raise NFAFileError(
            "this machine description has problems:\n  - " + "\n  - ".join(unique)
        )


def count_rules(nfa):
    """Count the individual rules in the NFA's transitions.

    One dictionary entry can hold several destinations, so this sums
    the sizes of the destination sets rather than counting entries.

    Args:
        nfa (NFA): The machine definition to count rules for.

    Returns:
        int: The total number of individual transition rules.
    """
    total = 0
    for destinations in nfa.transitions.values():
        total += len(destinations)
    return total


def main():
    """Run the program.
    
        Returns:
            int: 0 on success, 1 on a bad file or bad machine.
            (argparse itself exits with 2 if the command line is used wrong.)
    """
    cli = argparse.ArgumentParser(
        description="Check which strings an NFA accepts."
    )
    cli.add_argument("source_file", help="the .txt file describing the NFA")
    cli.add_argument("--trace", action="store_true",
                     help="show the possible states after each character")
    args = cli.parse_args()

    # 1) Read the file
    try:
        with open(args.source_file, "r", encoding="utf-8-sig") as handle:
            source = handle.read()
    except OSError:
        print(f"Error: Could not read {args.source_file}", file=sys.stderr)
        return 1
    except UnicodeDecodeError:
        print(f"Error: {args.source_file} is not valid UTF-8 text", file=sys.stderr)
        return 1

    # 2) Turn the text into a machine, then make sure the machine makes sense
    try:
        nfa, test_strings = read_nfa_file(source)
        validate(nfa)
    except NFAFileError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    # 3) Describe the machine we just loaded
    print(f"Alphabet:  {format_states(nfa.alphabet)}")
    print(f"States:    {format_states(nfa.states)}")
    print(f"Start:     {nfa.start_state}")
    print(f"Accepting: {format_states(nfa.accepting_states)}")
    print(f"Rules:     {count_rules(nfa)}")
    print()

    # 4) Test every string
    accepted_count = 0
    for text in test_strings:
        label = text if text else "(empty string)"

        if args.trace:
            print(f"--- {label} ---")

        if nfa_accepts_string(nfa, text, trace=args.trace):
            result = "Accepted"
            accepted_count += 1
        else:
            result = "Rejected"

        print(f"String {label} is: {result}")

        if args.trace:
            print()

    print()
    print(f"{accepted_count} of {len(test_strings)} strings accepted.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
