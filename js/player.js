// player.js: steps back and forth through a list of recorded steps.
//
// This file knows NOTHING about NFAs, states or Cytoscape. It only knows
// "there are N steps, and we're showing step number i". That makes it reusable.
//
// How to use it:
//   const player = Player.create({
//     count: 5,                        // how many steps there are
//     onShow: (index) => { ... },      // draws step number "index"
//   });
//   player.next();  player.back();  player.goTo(3);  player.reset();

const Player = (function () {

  function create({ count, onShow }) {
    let index = 0;   // which step is on screen right now

    // Jump to any step. Numbers past either end are pulled back in range.
    function goTo(newIndex) {
      index = Math.max(0, Math.min(count - 1, newIndex));
      onShow(index);
    }

    return {
      goTo,
      next:    () => goTo(index + 1),
      back:    () => goTo(index - 1),
      reset:   () => goTo(0),
      index:   () => index,
      atStart: () => index === 0,
      atEnd:   () => index === count - 1,
    };
  }

  return { create };
})();