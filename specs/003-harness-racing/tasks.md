---

description: "Task list for Harness racing theme"
---

# Tasks: Harness racing theme

**Input**: Design documents from `/specs/003-harness-racing/`

**Prerequisites**: plan.md, spec.md

**Tests**: required (constitution IV).

## Phase 1: Foundational

- [x] T001 Amend the constitution to 1.1.0 (racing game, not cycling) in `.specify/memory/constitution.md`
- [x] T002 Oval geometry, step costs, position multipliers, horse types and purse in `src/engine/constants.js`
- [x] T003 Races (Mile, Classic, Long, seeded random) with straight/curve segments in `src/engine/stages.js`

## Phase 2: User Story 2 - Positional endurance (P1)

- [x] T004 [US2] `stepCost(lane)`, `position()`, `energyCost(effort, pos)`, `strainAfter(pos)`, lane limits in `src/engine/rules.js`
- [x] T005 [US2] Rule tests for rules 1–6 in `tests/rules.test.js` and test helpers in `tests/helpers.js`

## Phase 3: User Story 1 - Race on the oval (P1) 🎯 MVP

- [x] T006 [US1] Lane-limited resolution, purse, gallop and log notes in `src/engine/race.js`; series in `src/engine/tour.js`
- [x] T007 [US1] Race tests for rules 6–9 and edge cases in `tests/race.test.js`
- [x] T008 [P] [US1] Oval renderer with horse and sulky sprites, trails, ghosts and a progress strip in `src/ui/render.js`

## Phase 4: User Story 3 - Boxed in and gallop (P2)

- [x] T009 [US3] Box-in and gallop tests in `tests/race.test.js`

## Phase 5: User Story 4 - Carry over everything (P2)

- [x] T010 [US4] Position-aware AI with predicted blocking in `src/ai/bots.js`; AI tests including the death seat statistic in `tests/ai.test.js`
- [x] T011 [US4] Horse cards, standings and log in `src/ui/panels.js`
- [x] T012 [US4] Texts, setup, results, rules page and save version in `src/ui/app.js` and `src/ui/storage.js`; sounds in `src/ui/sound.js`
- [x] T013 [P] [US4] Track colours and phone sizes in `styles.css`

## Phase 6: Polish

- [x] T014 Browser playtest (desktop + phone, series with reload), all tests green, README

## Dependencies

T002 → T003 → T004 → T005/T006 → T007/T009 → T010; T008, T011–T013 after T006.
