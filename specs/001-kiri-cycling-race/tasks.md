---

description: "Task list for Kiri, a tactical cycling race"
---

# Tasks: Kiri, a tactical cycling race

**Input**: Design documents from `/specs/001-kiri-cycling-race/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/engine-api.md

**Tests**: required by constitution IV (every rule has a test).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Create folder layout `src/engine`, `src/ai`, `src/ui`, `tests` per plan.md
- [x] T002 [P] Create test runner (describe/it/expect, summary) in `tests/runner.js` and `tests/index.html`
- [x] T003 [P] Create `index.html` shell and `styles.css` with theme tokens

## Phase 2: Foundational (blocks all stories)

- [x] T004 Balance constants (costs, step costs, archetypes, points, shelter discounts, caps) in `src/engine/constants.js`
- [x] T005 [P] Seeded PRNG in `src/engine/rng.js`
- [x] T006 Rule functions per contract in `src/engine/rules.js` (rules 2–6)
- [x] T007 Tests for rules 2–6 in `tests/rules.test.js`
- [x] T008 Preset stages (Rannikko, Harju, Kivitie) and `generateStage(seed)` in `src/engine/stages.js`
- [x] T009 [P] Stage tests (determinism, finish/sprint placement, run-off) in `tests/stages.test.js`

## Phase 3: User Story 1 - Race a single stage (P1) 🎯 MVP

**Goal**: play a full stage to results. **Independent test**: quick race played to the results screen.

- [x] T010 [US1] `createRace`, `resolveTurn` (order, blocking, lanes, sprint, finish, cap), `standings`, `isOver` in `src/engine/race.js`
- [x] T011 [US1] Race tests for rules 7–9 and the edge cases in `tests/race.test.js`
- [x] T012 [P] [US1] Canvas renderer (terrain, lanes, sprint/finish lines, riders, camera follow, move animation) in `src/ui/render.js`
- [x] T013 [US1] Rider control cards, race log, standings in `src/ui/panels.js`
- [x] T014 [US1] Title, race and results screens plus keyboard input in `src/ui/app.js`

## Phase 4: User Story 2 - Move previews (P1)

**Goal**: cost/strain/crack/ghost before commit. **Independent test**: US2 acceptance scenarios.

- [x] T015 [US2] `previewOrder` in `src/engine/race.js` with tests in `tests/race.test.js`
- [x] T016 [US2] Show previews on effort buttons and ghost markers on the canvas (`src/ui/panels.js`, `src/ui/render.js`)

## Phase 5: User Story 3 - Race setup (P2)

- [x] T017 [US3] Setup screen (stage/random seed, wind, AI team count, archetypes) in `src/ui/app.js`

## Phase 6: User Story 4 - AI personalities (P2)

- [x] T018 [US4] Diesel, Wheelsucker, Attacker, Planner + `chooseOrders` in `src/ai/bots.js`
- [x] T019 [US4] AI tests: legal orders, Wheelsucker shelter preference, 100-race simulation and balance report in `tests/ai.test.js`

## Phase 7: User Story 5 - Three-stage tour (P3)

- [x] T020 [US5] `createTour`, `recordStage`, `tourStandings` in `src/engine/tour.js` with tests in `tests/race.test.js`
- [x] T021 [US5] Tour flow (between-stage standings, overall results) in `src/ui/app.js`

## Phase 8: Polish

- [x] T022 [P] In-game rules page (FR-012) in `src/ui/app.js`
- [x] T023 Balance pass using the 100-race simulation; tune `src/engine/constants.js`
- [x] T024 Browser playtest of quickstart.md scenarios; README.md

## Dependencies

Setup → Foundational → US1 → US2 (needs race.js) → US3/US4 (parallel) → US5 → Polish.

## Parallel examples

- T002, T003 and T005 touch different files and can run together.
- T012 (renderer) can be built while T010/T011 (engine) are written.

## Implementation strategy

MVP = Phases 1–4 (playable race with previews against a simple Diesel bot). Then add setup, the
full AI roster, the tour and polish.
