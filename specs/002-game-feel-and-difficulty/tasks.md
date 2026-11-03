---

description: "Task list for Game feel, difficulty and save"
---

# Tasks: Game feel, difficulty and save

**Input**: Design documents from `/specs/002-game-feel-and-difficulty/`

**Prerequisites**: plan.md, spec.md

**Tests**: required by constitution IV for AI difficulty and storage.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Foundational

- [x] T001 [P] Safe storage module (`load`, `save`, `clear`, prefs, versioned save) in `src/ui/storage.js`, and load it in `index.html` and `tests/index.html`
- [x] T002 [P] Storage tests (round trip, corrupt JSON, version mismatch, missing) in `tests/storage.test.js`

## Phase 2: User Story 1 - Difficulty (P1) 🎯

- [x] T003 [US1] `DIFFICULTY` table and difficulty-aware `chooseOrders(state, teamId, rand, difficulty)` in `src/ai/bots.js`
- [x] T004 [US1] Difficulty strength test (SC-001) in `tests/ai.test.js`
- [x] T005 [US1] Difficulty picker on the setup screen, chip on the race screen, remembered in prefs (`src/ui/app.js`)

## Phase 3: User Story 2 - Continue (P1)

- [x] T006 [US2] Autosave after every turn and tour step; clear on quit and on single-race results (`src/ui/app.js`)
- [x] T007 [US2] "Continue" on the title screen restores the race or tour (`src/ui/app.js`)

## Phase 4: User Story 3 - Look and sound (P2)

- [x] T008 [P] [US3] Cyclist sprites with pedaling and lane-change lean in `src/ui/render.js`
- [x] T009 [US3] Last-move trails in `src/ui/render.js`
- [x] T010 [P] [US3] WebAudio synth and mute in `src/ui/sound.js`
- [x] T011 [US3] Sound triggers from the turn log and a mute toggle in the topbar (`src/ui/app.js`)

## Phase 5: User Story 4 - Phones (P3)

- [x] T012 [US4] Phone breakpoints in `styles.css`; smaller cell size and tap-to-inspect in `src/ui/render.js`

## Phase 6: Polish

- [x] T013 Browser check: desktop + 375 px, reload/continue, all tests green; update README

## Dependencies

T001 → T006/T007; T003 → T004/T005; T008 → T009; T010 → T011. Phases 4 and 5 are independent of 2–3.

## Implementation strategy

Difficulty and save first (pure logic, testable), then visuals and sound, then the phone layout.
