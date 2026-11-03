# Implementation Plan: Game feel, difficulty and save

**Branch**: `002-game-feel-and-difficulty` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-game-feel-and-difficulty/spec.md`

## Summary

Add three AI difficulty levels (decision noise + personality pool, rules untouched), autosave and
continue through `localStorage`, cyclist sprites with pedaling and last-move trails, synthesized
WebAudio sounds with a remembered mute, and a phone-width layout. Everything stays inside the
existing static, dependency-free structure.

## Technical Context

**Language/Version**: JavaScript (ES2020), HTML5, CSS3

**Primary Dependencies**: none (Web Audio API and `localStorage` are built into the browser)

**Storage**: `localStorage` keys `kiri.save` (versioned race save) and `kiri.prefs` (difficulty, mute)

**Testing**: existing browser runner; new suites for difficulty strength and storage robustness

**Target Platform**: desktop browsers, plus phone browsers at 360 px and wider

**Project Type**: single-page browser game

**Performance Goals**: 60 fps with 12 sprites; sprite drawing uses only canvas paths

**Constraints**: works from `file://`; every storage access wrapped in try/catch; audio is created lazily after a user gesture

**Scale/Scope**: one save slot

## Constitution Check

| Principle | Compliance | Status |
|-----------|-----------|--------|
| I. Original Design | Visual and audio work only; no external art or sound | Pass |
| II. Pure Deterministic Engine | Engine untouched. Difficulty lives in `src/ai`, noise comes from the seeded rng, and saves store the full state, so a continued race replays identically | Pass |
| III. Zero-Install Play | No assets or libraries; sounds synthesized | Pass |
| IV. Tested Rules | Difficulty strength test plus storage tests; existing 57 tests unchanged | Pass |
| V. Readable Play | Trails make each move visible after the animation ends | Pass |

## Project Structure

```text
src/ai/bots.js        # + DIFFICULTY table, difficulty-aware chooseOrders
src/ui/storage.js     # new: safe JSON load/save, versioned save slot, prefs
src/ui/sound.js       # new: WebAudio synth (ride, sprint, crack, finish), mute
src/ui/render.js      # cyclist sprites, pedaling, lean, trails, tap-to-inspect
src/ui/app.js         # difficulty picker, continue, autosave, mute toggle, sound triggers
styles.css            # phone breakpoints
tests/ai.test.js      # + difficulty strength (SC-001)
tests/storage.test.js # new
```

**Structure Decision**: same single static project. The two new UI modules follow the existing
`Kiri` namespace pattern and load before `app.js`.

## Design Notes

- **Difficulty** `{ easy: noise 3, 35% tempo lapses, sprint launched within 10 squares, pool
  [diesel, wheelsucker, attacker]; normal: noise 0.6, launch within 30, all four; hard: noise 0,
  launch within 40, pool [planner, planner, attacker, wheelsucker, planner] }`. Score noise alone
  barely changed results in simulation, so Easy also gets lapses (an over- or under-paced effort) and
  a late sprint. All randomness comes from the race's seeded rng, so decisions stay reproducible.
- **Save format** `{ v: 2, race, raceSetup, tour, tourSetup, orders, difficulty }`. Written after each
  resolved turn and when the tour moves on; removed on quit and after a single race's results. A
  version mismatch or a parse error means no save.
- **Sounds**: the ride is a short filtered-noise whoosh, the sprint is two sine pings, a crack is a
  low triangle thud, and the finish is a bell chord plus a noise "crowd" swell.
- **Phones**: below 700 px, the track canvas is 220 px tall and the cell size drops from 46 to 34 px;
  rider cards, the side panel and the topbar stack.

## Complexity Tracking

No violations.
