# Kiri Constitution

## Core Principles

### I. Original Design

Kiri is an original tactical cycling game. It MAY borrow genre ideas (turn-based racing,
drafting, fatigue, AI opponents) from the flAImme project that inspired it, but it MUST NOT
reproduce the rules, components, card lists or names of any existing commercial board game.
Every core mechanic MUST be described in the project's own rules text.

Rationale: the source repository was an AI for an existing game; this project keeps the idea
of a thinking cycling race and builds its own rules.

### II. Pure Deterministic Engine

All game rules MUST live in a rules engine that has no dependency on the DOM, canvas or timers.
Given the same starting state, seed and inputs, the engine MUST produce the same result. All
randomness MUST come from a seeded generator passed into the engine.

Rationale: deterministic rules make bugs reproducible, bots testable and races replayable.

### III. Zero-Install Play

The game MUST run in a current desktop browser from static files, with no build step, package
manager or server-side code. Third-party runtime dependencies are not allowed.

Rationale: the player opens a page and plays; nothing to install or break.

### IV. Tested Rules

Every rule in the spec (movement, terrain, shelter, energy, strain, blocking, scoring) MUST
have at least one automated test that runs in the browser test page. A rule change MUST update
its test in the same change.

Rationale: the rules interact, and silent regressions ruin balance.

### V. Readable Play

Before committing an effort, the player MUST be able to see its predicted cost and the
square the rider would reach if unblocked. Every resolved turn MUST be explained in a
human-readable race log.

Rationale: a tactical game is only fun when the player understands why things happened.

## Technical Constraints

- Language: modern JavaScript loaded as classic scripts under a `Kiri` namespace (so the game
  opens from `file://`), HTML and CSS only.
- Rendering: HTML5 canvas for the track; plain DOM for controls.
- Engine code under `src/engine/`, AI under `src/ai/`, UI under `src/ui/`; UI may use the
  engine, never the reverse.
- A full AI turn MUST complete in under 100 ms on a mid-range laptop.

## Development Workflow

- Features follow Spec Kit: constitution → specify → plan → tasks → implement.
- Tests live in `tests/` and run from `tests/index.html`; all MUST pass before a change is done.
- Balance constants live in one file (`src/engine/constants.js`) so tuning never touches logic.

## Governance

This constitution supersedes other project practices. Amendments are made by editing this file,
bumping the version (MAJOR for removed or redefined principles, MINOR for new principles or
sections, PATCH for wording) and updating the Last Amended date. Every plan MUST include a
Constitution Check against these principles, and any violation MUST be justified in that plan's
Complexity Tracking table.

**Version**: 1.0.1 | **Ratified**: 2026-11-02 | **Last Amended**: 2026-11-02
