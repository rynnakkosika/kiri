# Kiri

A turn-based tactical cycling race that runs in the browser. You manage two riders against up to
five AI teams. Each turn every rider picks an **effort** (1–9) and a **lane**, then everyone moves
at once. Energy has to last the whole stage, strain makes riders crack, and the wind decides where
you can shelter.

Inspired by the idea behind [Laurigit/flAImme](https://github.com/Laurigit/flAImme): AI bots
reasoning through a cycling race. The rules here are original.

## Play

Open `index.html` in a browser. Double-clicking it works, with no install or build step.

- **Quick race**: a preset stage against 3 AI teams.
- **Custom race**: pick the stage (or a seeded random one), wind, number of AI teams and your
  riders' types.
- **Tour**: three stages, with points added up across them.
- **How to play**: the full rules, in the game.
- **Difficulty**: Easy, Normal or Hard. It only changes how the AI decides, never the rules.
- **Continue**: the game saves after every turn. After a reload, the title screen offers to continue.
- **Sound**: synthesized effects; the 🔊 button mutes them, and the setting is remembered.
- Also plays on a phone (360 px and wider): tap a rider to see its stats.

Keyboard: <kbd>1</kbd>–<kbd>9</kbd> effort, <kbd>←</kbd>/<kbd>→</kbd> lane, <kbd>Tab</kbd> switch rider, <kbd>Enter</kbd> ride.

## Tests

Open `tests/index.html`. It runs the rule tests, an AI test and a 100-race balance simulation.
To serve the folder over HTTP instead:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 8765
```

Then open <http://localhost:8765/>.

## Layout

| Path | What |
|------|------|
| `src/engine/` | Pure, seeded rules engine (no DOM). `constants.js` holds every balance number. |
| `src/ai/bots.js` | AI personalities: Diesel, Wheelsucker, Attacker, Planner. |
| `src/ui/` | Canvas renderer, control panels, screens. |
| `tests/` | Browser test runner and suites. |
| `specs/001-kiri-cycling-race/` | Spec Kit spec, plan, research, data model, contracts, tasks. |
| `.specify/memory/constitution.md` | Project principles. |
