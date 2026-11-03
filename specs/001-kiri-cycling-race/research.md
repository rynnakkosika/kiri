# Research: Kiri

## R1. What to take from flAImme

- **Decision**: keep the concepts (a turn-based race on a lane grid; riders that tire; drafting
  behind others; terrain that changes speed; several bot personalities competing), and drop the
  implementation (R/Shiny, MySQL, card decks, exhaustion cards).
- **Rationale**: the repo is an AI for an existing commercial board game. Constitution I requires
  original rules. Its bot zoo (`ruler_bot`, `nemesis_bot`, `ttf_botti`, …) inspired the four AI
  personalities.
- **Alternatives considered**: port the repo's rules (rejected: not original, and the user called
  the code unusable).

## R2. Effort dial vs. hand of cards

- **Decision**: free choice of effort 1–9, paid from an energy pool, with strain as short-term
  fatigue.
- **Rationale**: transparent, previewable choices (constitution V). Two resources create the
  "attack now or save it" tension without hidden draws.
- **Alternatives**: random hands (less readable, too close to the source game).

## R3. Movement with mixed terrain

- **Decision**: budget = 2 × effort; each square entered costs 1–5 half-steps by terrain and
  archetype.
- **Rationale**: handles a move that spans flat into climb without special cases, and integer maths
  only.
- **Alternatives**: terrain of the starting square decides speed (exploit: flat-to-climb jumps).

## R4. Script loading

- **Decision**: classic `<script>` tags, each file extending `window.Kiri`.
- **Rationale**: browsers block ES modules over `file://`; double-clicking `index.html` must work.
- **Alternatives**: ES modules + local server (needs a server); a bundler (violates III).

## R5. Randomness

- **Decision**: mulberry32 seeded PRNG; one stream for stage generation and one per race for AI noise.
- **Rationale**: small, fast and deterministic (FR-011).

## R6. Planner AI

- **Decision**: one-ply lookahead. For each legal effort, simulate the rider's own move against the
  current board and score it as progress + shelter bonus − energy cost weighted by the energy
  needed to finish (estimated from remaining terrain).
- **Rationale**: stays well under 100 ms; strong enough to be a credible rival.
- **Alternatives**: Monte Carlo over opponents' efforts (slower, and the gain is unclear for v1).
