# Implementation Plan: Harness racing theme

**Branch**: `003-harness-racing` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-harness-racing/spec.md`

## Summary

Replace the cycling theme with harness racing. The engine keeps its shape (pure, seeded,
`createRace` / `previewOrder` / `resolveTurn`). Terrain becomes straight or curve segments on a
40-segment oval, and wind shelter becomes a position model (cover / open / death seat / wide in a
curve) with lane-dependent multipliers. Lane changes are limited to one lane per turn, which allows
horses to get boxed in. "Crack" becomes "gallop". The renderer draws the whole oval instead of a
scrolling strip. The AI scores the position it expects to land in.

## Technical Context

**Language/Version**: JavaScript (ES2020), HTML5, CSS3 — unchanged

**Primary Dependencies**: none

**Storage**: `localStorage`; save version bumped to 3, so cycling saves are ignored

**Testing**: browser runner; the rules suites are rewritten for rules 1–9

**Target Platform**: desktop and phone browsers

**Project Type**: single-page browser game

**Performance Goals**: 60 fps with 12 horse sprites; AI turn < 100 ms

**Constraints**: works from `file://`; no assets

## Constitution Check

| Principle | Compliance | Status |
|-----------|-----------|--------|
| I. Original Design | Generic harness racing concepts (cover, death seat, gallop) turned into our own numeric rules; no existing game's rules or components | Pass (after amendment 1.1.0, which no longer says "cycling") |
| II. Pure Deterministic Engine | Position model and lane limits are pure functions; still no DOM in the engine | Pass |
| III. Zero-Install Play | Oval and horses drawn with canvas paths; sounds synthesized | Pass |
| IV. Tested Rules | Every rule 1–9 has tests in `tests/rules.test.js` and `tests/race.test.js` | Pass |
| V. Readable Play | Cards show the position label, multiplier and cost; the log names death seat, cover and gallop | Pass |

## Project Structure

```text
src/engine/constants.js   # oval geometry, curve step costs, position multipliers, purse, horse types
src/engine/rules.js       # stepCost(lane), position(), energyCost(pos), strain, lane limits
src/engine/stages.js      # races: Mile 1609, Classic 2100, Long 2600 + seeded random distance
src/engine/race.js        # lane-limited resolution, purse, gallop
src/engine/tour.js        # series of three races
src/ai/bots.js            # position-aware scoring, predicted blocking
src/ui/render.js          # oval renderer, horse + sulky sprites, trails, ghosts
src/ui/panels.js          # horse cards, standings in metres, log
src/ui/app.js             # texts, setup (distance instead of stage/wind), results in €
src/ui/sound.js           # hoof rhythm, gallop, finish
tests/*                   # rewritten rule suites; AI death seat statistic (SC-002)
```

## Design Notes

- **Oval mapping**: lap position `p = (startOffset + segment) mod 40`. Segments 0–9 are the bottom
  straight (moving right), 10–19 the right curve, 20–29 the top straight (moving left) and 30–39 the
  left curve. That makes the direction counter-clockwise. `startOffset = (FINISH_LAP_POS − distance)
  mod 40`, with `FINISH_LAP_POS = 10` (end of the home straight). The lane radius is
  `R0 + (lane + 0.5) × laneWidth`, so outer lanes are visibly longer in the curves.
- **Position at turn start**: covered if `(square + 1, lane)` holds an unfinished horse. Otherwise
  death seat if `lane == 1` (lane 2) and lane 0 holds a horse at `square` or `square + 1`. Otherwise
  open. Wide-curve multiplier if `lane ≥ 2` and the current segment is a curve. The leader label is
  the front-most horse; it pays the open rate of its lane.
- **Travel lane** for the step cost is `max(lane, requested lane)`, with the request limited to ±1.
- **AI**: predict the others' landing spots (last move), simulate own landing with lane limits and
  predicted blocking, then score progress, expected next-turn multiplier, strain and personality.

## Complexity Tracking

No violations.
