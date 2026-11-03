---

description: "Task list for Online two-player races"
---

# Tasks: Online two-player races

**Input**: Design documents from `/specs/004-online-multiplayer/`

**Prerequisites**: plan.md, spec.md

## Phase 1: Foundational

- [x] T001 Amend the constitution to 1.2.0 (optional online mode may load one pinned library lazily)
- [x] T002 `aiOrdersFor(state, seed, difficulty)` in `src/ai/bots.js`; use it in `src/ui/app.js`
- [x] T003 Replace the hard-coded human team 0 with `app.myTeam` in `src/ui/app.js` and `src/ui/panels.js`

## Phase 2: User Story 1 + 2 - Host, join, simultaneous turns (P1) 🎯

- [x] T004 [US1] Pure host protocol `Kiri.OnlineHost` in `src/net/protocol.js`
- [x] T005 [US2] Protocol tests (ownership, stale turns, finished-player skip, identical states over 100 races) in `tests/online.test.js`
- [x] T006 [P] [US1] Transport wrapper `Kiri.Net` (lazy PeerJS, host/join, send, events) in `src/net/peer.js`
- [x] T007 [US1] Online menu, host lobby with code and invite link, join screen, `?join=` handling in `src/ui/app.js`
- [x] T008 [US2] Online race flow: lock-in, friend status, state sync and animation, rematch in `src/ui/app.js`

## Phase 3: User Story 3 - Connection problems (P2)

- [x] T009 [US3] Disconnect banner, "Continue with AI" for the host, "Game not found" for the guest in `src/ui/app.js`

## Phase 4: Polish

- [x] T010 Two-tab test over the real network; README section "Play with a friend"
- [ ] T011 Publish to GitHub Pages (only after the user approves)
