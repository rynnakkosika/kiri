---
description: "Task list for Travbana, the 12-horse field and the Elo ladder"
---

# Tasks: Travbana, 12-horse field, Elo ladder

## Phase 1: Offline (no server)

- [x] T001 Rename the visible game to Travbana (title, logo, PWA, Android app name and package, store texts, privacy policy)
- [x] T002 `C.FIELD_MAX` = 12; createRace refuses more; quick race and default custom race use a full field
- [x] T003 Post positions stored on each horse (`post`), drawn from the seed; draw tests
- [x] T004 Post draw screen before solo races; horse cards show the post
- [x] T005 `src/engine/elo.js`: stable places, multi-stable Elo with bots at the humans' average, money display; tests
- [x] T006 Rebuild Android packages and store images

## Phase 2: Server (needs a free Cloudflare account to deploy; local dev needs none)

- [ ] T007 Worker + Durable Objects project under `server/`, running the shared engine and AI
- [ ] T008 Anonymous player ID + stable name; public rating table in SQLite, start 1000
- [ ] T009 Matchmaking queue by nearest rating, up to 6 stables, AI fill after 30 s
- [ ] T010 Race room: WebSocket turns, turn timer, AI takeover on disconnect, Elo update at the end
- [ ] T011 Client: Ladder screen (balance, table, Ladder race button), online race view
- [ ] T012 Private groups with a code: single race or 3-race cup, 1–6 human stables, own ladder
- [ ] T013 Privacy policy and store data-safety answers updated for stored player IDs and ratings
