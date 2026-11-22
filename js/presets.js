// presets.js: the ready-made example machines.
//
// Each preset is written in the same "label: value" format a user would paste,
// so it goes through the exact same parser as everything else. The first one
// is loaded automatically when the page opens, so visitors never see an empty page.
//
// These are for LEARNERS (friendly comments, interesting test strings).
// The files in test-files/ are for TESTING. They overlap on purpose, but each
// can change without breaking the other.

const Presets = (function () {

  const list = [
    {
      id: "ends-in-01",
      name: "Ends in 01",
      summary: "Accepts strings of 0s and 1s that end with 01. A good first example of an NFA \"guessing.\"",
      text: `# Accepts strings of 0s and 1s that end in "01".
# From q0, reading 0 can stay in q0 OR jump to q1.
# The machine follows both choices at once.
alphabet: 0, 1
states: q0, q1, q2
start: q0
accepting: q2

rule: q0 -- 0 --> q0
rule: q0 -- 1 --> q0
rule: q0 -- 0 --> q1
rule: q1 -- 1 --> q2

test: 101
test: 1100
test: 0201
test:`,
    },
    {
      id: "contains-cat",
      name: "Contains \"cat\"",
      summary: "Accepts any string of the letters a, c, s, t that has \"cat\" somewhere inside it.",
      text: `# Accepts strings made of the letters a, c, s and t
# that contain "cat" somewhere inside them.
# The state names say what the machine has seen so far.
alphabet: a, c, s, t
states: start, c, ca, cat
start: start
accepting: cat

# Keep looking: any letter can be skipped.
rule: start -- a --> start
rule: start -- c --> start
rule: start -- s --> start
rule: start -- t --> start

# Guess that "cat" begins here.
rule: start -- c --> c
rule: c -- a --> ca
rule: ca -- t --> cat

# Found it! Anything after "cat" is fine.
rule: cat -- a --> cat
rule: cat -- c --> cat
rule: cat -- s --> cat
rule: cat -- t --> cat

test: cat
test: scats
test: act
test: ccat
test: cast
test: dog`,
    },
    {
      id: "starts-with-a",
      name: "Starts with a",
      summary: "Accepts strings of a's and b's that start with a. Watch what happens to a string that starts with b.",
      text: `# Accepts strings of a's and b's that start with "a".
# s0 has no arrow for "b", so a string starting with "b" gets stuck.
alphabet: a, b
states: s0, s1
start: s0
accepting: s1

rule: s0 -- a --> s1
rule: s1 -- a --> s1
rule: s1 -- b --> s1

test: abba
test: a
test: ba
test:`,
    },
    {
      id: "even-ones",
      name: "Even number of 1s",
      summary: "Accepts strings with an even number of 1s (zero counts as even, so the empty string is accepted).",
      text: `# Accepts strings with an even number of 1s.
# The start state is also accepting, so the empty string
# (zero 1s) is accepted.
alphabet: 0, 1
states: even, odd
start: even
accepting: even

rule: even -- 0 --> even
rule: even -- 1 --> odd
rule: odd -- 0 --> odd
rule: odd -- 1 --> even

test:
test: 11
test: 101
test: 1
test: 0110`,
    },
    {
      id: "third-from-end",
      name: "Third from the end is 1",
      summary: "Accepts strings whose third-to-last character is 1. The machine keeps guessing \"this might be it.\"",
      text: `# Accepts strings of 0s and 1s whose third-to-last character is 1.
# Every time it reads a 1, the machine guesses
# "maybe this is the one" and starts counting.
alphabet: 0, 1
states: q0, q1, q2, q3
start: q0
accepting: q3

rule: q0 -- 0 --> q0
rule: q0 -- 1 --> q0
rule: q0 -- 1 --> q1
rule: q1 -- 0 --> q2
rule: q1 -- 1 --> q2
rule: q2 -- 0 --> q3
rule: q2 -- 1 --> q3

test: 100
test: 0110
test: 1011
test: 11`,
    },
    {
      id: "divisible-by-13",
      name: "Big: divisible by 13",
      summary: "A bigger machine (13 states) that accepts binary numbers divisible by 13. Try the Spread out or Circle layouts.",
      text: `# Accepts binary numbers that divide evenly by 13.
# State rN means: "the number so far leaves remainder N
# when divided by 13". Reading a digit doubles the number
# and adds the digit, so rN goes to r((2N + digit) mod 13).
alphabet: 0, 1
states: r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12
start: r0
accepting: r0

rule: r0 -- 0 --> r0
rule: r0 -- 1 --> r1
rule: r1 -- 0 --> r2
rule: r1 -- 1 --> r3
rule: r2 -- 0 --> r4
rule: r2 -- 1 --> r5
rule: r3 -- 0 --> r6
rule: r3 -- 1 --> r7
rule: r4 -- 0 --> r8
rule: r4 -- 1 --> r9
rule: r5 -- 0 --> r10
rule: r5 -- 1 --> r11
rule: r6 -- 0 --> r12
rule: r6 -- 1 --> r0
rule: r7 -- 0 --> r1
rule: r7 -- 1 --> r2
rule: r8 -- 0 --> r3
rule: r8 -- 1 --> r4
rule: r9 -- 0 --> r5
rule: r9 -- 1 --> r6
rule: r10 -- 0 --> r7
rule: r10 -- 1 --> r8
rule: r11 -- 0 --> r9
rule: r11 -- 1 --> r10
rule: r12 -- 0 --> r11
rule: r12 -- 1 --> r12

# 13, 26 and 169 divide by 13. 14 doesn't.
test: 1101
test: 11010
test: 10101001
test: 1110`,
    },
  ];

  return {
    list,
    find: id => list.find(preset => preset.id === id),
  };
})();