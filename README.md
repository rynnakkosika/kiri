# Kiri

A turn-based tactical harness racing (trotting) game that runs in the browser. You drive two
trotters from your stable against up to five AI stables on a 1000 m oval. Each turn every horse
gets a **speed** (1–9) and a lane move, then all horses move at once.

The trotting rules that make it tactical:

- **In cover**: right behind another horse, a horse pays only 60–85% energy.
- **Death seat**: lane 2 beside the rail horse with nobody ahead costs ×1.6 energy and extra strain.
- **Wide in the curves**: lanes 3–4 are longer in the curves and cost more energy (×1.25 on top).
- **Boxed in**: you can't move into a lane where a horse is right alongside you.
- **Galloping**: push the strain to 10 and the horse breaks into a gallop, capping its speed at 3 for two turns.

Inspired by the idea behind [Laurigit/flAImme](https://github.com/Laurigit/flAImme): AI bots
reasoning through a race. The rules here are original.

## Play

Open `index.html` in a browser. Double-clicking it works, with no install or build step.

- **Quick race**: Classic 2100 m against 3 AI stables.
- **Custom race**: pick the distance (Mile 1609 m, Classic 2100 m, Long 2600 m or a seeded random one),
  the number of AI stables, the difficulty, your horses' types and your stable name.
- **Series**: three races, with prize money added up across them.
- **How to play**: the full rules, in the game.
- **Difficulty**: Easy, Normal or Hard. It only changes how the AI drives, never the rules.
- **Continue**: the game saves after every turn. After a reload, the title screen offers to continue.
- **Sound**: hooves, a last-lap bell, a whinny for a gallop and a finish chord. The 🔊 button mutes them.
- Also plays on a phone (360 px and wider): tap a horse to see its stats.

Keyboard: <kbd>1</kbd>–<kbd>9</kbd> speed, <kbd>←</kbd>/<kbd>→</kbd> inside/outside, <kbd>Tab</kbd> switch horse, <kbd>Enter</kbd> drive.

## Tests

Open `tests/index.html`. It runs the rule tests, the AI tests and a 100-race balance simulation
(wins per driving style, race length, death seat share). To serve the folder over HTTP instead:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 8765
```

Then open <http://localhost:8765/>.

## Layout

| Path | What |
|------|------|
| `src/engine/` | Pure, seeded rules engine (no DOM). `constants.js` holds every balance number. |
| `src/ai/bots.js` | AI driving styles: Steady, Pocket sitter, Front runner, Tactician. |
| `src/ui/` | Oval renderer, horse cards, screens, storage, sound. |
| `tests/` | Browser test runner and suites. |
| `specs/` | Spec Kit features: 001 the cycling original, 002 game feel, 003 harness racing. |
| `.specify/memory/constitution.md` | Project principles. |
