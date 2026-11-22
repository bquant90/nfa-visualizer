// theme.js: light mode, dark mode, or "auto" (follow the device's own setting).
//
// Loaded in the page's <head>, BEFORE the page is drawn, so dark-mode users
// never see a white flash. All it does is put data-theme="light" or "dark"
// on the page; style.css does the rest.
//
//   Theme.choice()  -> "auto", "light" or "dark" (what the user picked)
//   Theme.next()    -> switches to the next choice and returns it
//   Theme.onChange(fn) -> fn runs whenever the actual colors change

const Theme = (function () {
  const CHOICES = ["auto", "light", "dark"];
  const STORAGE_KEY = "nfa-visualizer-theme";
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const listeners = [];

  // Remember the user's pick in this browser. Storage can be blocked (some
  // privacy modes), so failures are ignored and "auto" is used instead.
  function load() {
    try { return localStorage.getItem(STORAGE_KEY) || "auto"; } catch { return "auto"; }
  }
  function save(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* not saved; that's fine */ }
  }

  let choice = CHOICES.includes(load()) ? load() : "auto";

  // Work out light vs dark, and put it on the page.
  function apply() {
    const dark = choice === "dark" || (choice === "auto" && systemDark.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    listeners.forEach(fn => fn());
  }

  // If the device switches between light and dark (e.g. at sunset) and the
  // user picked "auto", follow along.
  systemDark.addEventListener("change", () => { if (choice === "auto") apply(); });

  apply();

  return {
    choice: () => choice,
    next() {
      choice = CHOICES[(CHOICES.indexOf(choice) + 1) % CHOICES.length];
      save(choice);
      apply();
      return choice;
    },
    onChange: fn => listeners.push(fn),
  };
})();