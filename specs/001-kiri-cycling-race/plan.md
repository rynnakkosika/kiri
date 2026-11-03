# Implementation Plan: Kiri, a tactical cycling race

**Branch**: `001-kiri-cycling-race` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-kiri-cycling-race/spec.md`

## Summary

A single-player, turn-based cycling race in the browser. The player sets an effort (1–9) and a lane
preference for two riders each turn, against 1–5 AI teams with distinct personalities. The rules
engine is pure, seeded and DOM-free (constitution II). A canvas renders the track and plain DOM
renders the controls. Everything ships as static files that open straight from disk, with no
build step and no dependencies (constitution III).

## Technical Context

**Language/Version**: JavaScript (ES2020), HTML5, CSS3

**Primary Dependencies**: none

**Storage**: none (in-memory only; tour lost on reload, per spec assumptions)

**Testing**: in-house assertion runner in `tests/index.html`, run in the browser

**Target Platform**: current desktop Chrome, Edge and Firefox; opens via `file://` or any static server

**Project Type**: single-page browser game

**Performance Goals**: AI decisions plus turn resolution under 100 ms for 12 riders; 60 fps animation

**Constraints**: no network, no build tooling, no third-party code; must work from `file://`

**Scale/Scope**: 12 riders max, stages of 70–110 squares, 3 presets + seeded random generator

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How the plan complies | Status |
|-----------|-----------------------|--------|
| I. Original Design | Effort dials, energy + strain, wind-dependent shelter, archetypes, sprint line: no deck or card list from any existing game | Pass |
| II. Pure Deterministic Engine | `src/engine/*` never touches `window`/`document`; all randomness via `Kiri.rng(seed)` passed in | Pass |
| III. Zero-Install Play | Plain `<script>` files under a `Kiri` namespace, so `index.html` works from disk; no dependencies | Pass |
| IV. Tested Rules | `tests/` covers each numbered rule in the spec's rules summary; test IDs reference rule numbers | Pass |
| V. Readable Play | `Kiri.previewOrder()` powers cost, strain, crack and ghost-square previews; `resolveTurn` writes the log | Pass |

Post-design re-check: still passing. Choosing classic scripts over ES modules is covered by
principle III (ES modules don't load over `file://`); constitution amended to 1.0.1 to say so.

## Project Structure

### Documentation (this feature)

```text
specs/001-kiri-cycling-race/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── engine-api.md
└── tasks.md
```

### Source Code (repository root)

```text
index.html                 # game shell; loads scripts in dependency order
styles.css
src/
├── engine/
│   ├── constants.js       # every balance number (costs, budgets, archetypes, points)
│   ├── rng.js             # seeded PRNG (mulberry32)
│   ├── stages.js          # preset stages + seeded generator
│   ├── rules.js           # pure rule functions: cost, budget, shelter, strain, movement path
│   ├── race.js            # createRace, previewOrder, resolveTurn, standings
│   └── tour.js            # three-stage tour bookkeeping
├── ai/
│   └── bots.js            # Diesel, Wheelsucker, Attacker, Planner
└── ui/
    ├── render.js          # canvas track, riders, ghosts, animation
    ├── panels.js          # rider control cards, log, standings
    └── app.js             # screens (title, setup, race, results, rules) and input
tests/
├── index.html             # test page
├── runner.js              # tiny describe/it/expect
├── rules.test.js
├── race.test.js
├── stages.test.js
└── ai.test.js
```

**Structure Decision**: single static project. Engine, AI and UI are separate folders with a
one-way dependency (UI → AI → engine), each file adding to the global `Kiri` namespace.

## Complexity Tracking

No violations.
