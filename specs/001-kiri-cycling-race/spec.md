# Feature Specification: Kiri, a tactical cycling race

**Feature Branch**: `001-kiri-cycling-race`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Design a new cycling game based on the idea of the Laurigit/flAImme
repositories (a turn-based cycling race played against AI bots that reason about fatigue,
drafting and terrain). Don't reuse the code; take the idea, plan it with spec-kit and implement it."

## Game Concept

Kiri (Finnish for "the final sprint") is a turn-based, single-player tactical cycling race. The
player manages a team of two riders against 1–5 AI teams. Each turn every rider secretly chooses
an **effort** from 1 to 9 and a **lane preference**; then all riders move at once. The tension
comes from two resources: **Energy**, which drains over the whole race, and **Strain**, which
builds up from hard turns and makes a rider **crack** if pushed too far. Riding in another
rider's **shelter** saves both. The wind decides where shelter is: straight behind in a
headwind, diagonally behind on the windward side in a crosswind. That gives the game echelons
and gutter tactics.

The idea comes from flAImme, where bots simulated optimal moves in a cycling race. Kiri is its own
game: effort dials instead of card decks, two-resource fatigue, wind-dependent shelter, rider
archetypes and intermediate sprints.

### Rules summary (normative)

1. **Track**: a line of squares. Each square has a terrain (flat, climb, descent, cobbles) and a
   width of 2 or 3 lanes. One square is the **sprint line**, one is the **finish line**, and there
   are run-off squares after the finish.
2. **Movement**: an effort E gives a movement budget of 2×E. Entering a square costs budget by
   terrain: flat 2, descent 1, cobbles 3, climb 4. A rider advances square by square while the budget
   covers the next square, and always moves at least one square.
3. **Archetypes**: Rouleur (energy 110, cobbles cost 2), Climber (energy 100, climbs cost 3),
   Sprinter (energy 95, climbs cost 5, **Kick**: +4 budget when starting within 12 squares of
   the finish with effort 7 or more).
4. **Energy cost** per effort 1–9: 0, 1, 2, 3, 5, 7, 9, 12, 15. A rider can't choose an effort
   it can't pay for. A sheltered rider pays less (rounded down): 50% less in a headwind, 30%
   in calm, 40% in a crosswind. A rider that starts its turn on a descent with effort 4 or less
   recovers 2 energy.
5. **Strain** (0–10): after each turn, strain changes by effort − 5, plus 1 extra recovery if the
   rider was sheltered. If strain reaches 10, the rider **cracks**: strain drops to 6 and the
   rider's effort is capped at 3 for the next 2 turns.
6. **Shelter**: a rider is sheltered at the start of a turn when the shelter square is occupied.
   In calm or headwind, that is the next square in the same lane. In a crosswind it is the next
   square one lane toward the wind. Riders on climb squares are never sheltered.
7. **Resolution order**: the rider furthest ahead moves first; ties go to the lower lane, then
   the lower rider id. A rider stops on the furthest reachable square with a free lane. It takes
   the free lane closest to its lane preference, and on a tie the lower lane.
8. **Sprint and finish points**: the first three riders over the sprint line score 5/3/1. Finishers
   score 15/12/10/8/6/5/4/3/2/1 by finish order. Riders who finish in the same turn are ordered
   by distance past the line, then by resolution order.
9. **End**: the race ends when every rider has finished, or after 60 turns. Riders still racing at
   the cap are ranked by position. The first rider over the line wins the stage. Teams rank by
   total points.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Race a single stage against AI (Priority: P1)

The player opens the game, starts a quick race on a preset stage against AI teams, chooses an
effort and lane preference for each of their two riders every turn, watches all riders move, and
sees the final results.

**Why this priority**: this is the whole game loop. Without it there is no game.

**Independent Test**: start a quick race and play it to the end using only effort and lane
choices. The results screen shows a finish order and points for every rider.

**Acceptance Scenarios**:

1. **Given** the title screen, **When** the player picks "Quick race", **Then** a race starts on a
   preset stage with the player's two riders and at least one AI team on the start grid.
2. **Given** a race in progress, **When** the player sets effort for both riders and confirms,
   **Then** all riders move following the rules summary, and the race log describes each rider's
   move, shelter and cracks.
3. **Given** a rider with 4 energy, **When** the player views the effort options, **Then**
   efforts costing more than 4 are disabled.
4. **Given** the last rider crosses the finish, **When** the turn resolves, **Then** a results
   screen shows finish order, sprint points, finish points and team standings.

---

### User Story 2 - Understand a move before committing it (Priority: P1)

Before confirming a turn, the player sees, for the selected effort, the energy cost (including any
shelter discount), the strain after the turn, whether the rider will crack, and the square it
would reach if not blocked.

**Why this priority**: the constitution requires readable play; without previews the effort
choice is guesswork.

**Independent Test**: on any turn, select different efforts and check that the cost, strain and
ghost marker change and match the rules summary.

**Acceptance Scenarios**:

1. **Given** a sheltered rider in a headwind, **When** the player hovers effort 8, **Then** the
   preview shows cost 6 (12 halved) and a shelter indicator.
2. **Given** a rider with strain 7, **When** the player selects effort 8, **Then** the preview warns
   that the rider will crack.
3. **Given** a rider two flat squares before a climb, **When** effort 4 is selected, **Then** the
   ghost marker shows the rider 3 squares ahead (2 flat + 1 climb = 8 budget).

---

### User Story 3 - Set up a race (Priority: P2)

The player configures a race: stage (preset or random with a seed), wind, number of AI teams (1–5),
and the archetypes of their two riders.

**Why this priority**: it gives the game replay value, but the core loop works without it.

**Independent Test**: set up a race with a random stage, seed 42, crosswind from the left, 5 AI
teams and two climbers. The race starts with those settings, and the same seed always produces
the same stage.

**Acceptance Scenarios**:

1. **Given** the setup screen, **When** the player enters seed 42 twice on different visits,
   **Then** the generated stage is identical both times.
2. **Given** a setup with 5 AI teams, **When** the race starts, **Then** 12 riders are on the grid.

---

### User Story 4 - AI rivals with distinct personalities (Priority: P2)

Each AI team has a visible personality that shapes its riding: **Diesel** (steady, sustainable
effort), **Wheelsucker** (hunts shelter and attacks late), **Attacker** (early breakaways,
contests the sprint line) and **Planner** (looks ahead and weighs distance against energy).

**Why this priority**: interesting rivals are the heart of the flAImme idea.

**Independent Test**: run automated races with only AI teams. Every race finishes within the turn
cap, and the personalities make measurably different choices (for example, Attackers have the
highest average early effort).

**Acceptance Scenarios**:

1. **Given** an all-AI race, **When** it is simulated to the end, **Then** it finishes within 60
   turns with no rule violations.
2. **Given** a Wheelsucker rider behind a group, **When** it picks an effort before the final
   section, **Then** it prefers an effort that ends in a sheltered position if one exists.

---

### User Story 5 - Three-stage tour (Priority: P3)

The player rides a tour of three stages in a row. Points add up across stages and an overall
leader is shown between stages.

**Why this priority**: adds long-term goals, but builds entirely on the single-stage race.

**Independent Test**: start a tour, finish three stages, and check the overall standings sum the
points of each stage.

**Acceptance Scenarios**:

1. **Given** a finished first tour stage, **When** the player continues, **Then** stage 2 starts
   with energy and strain reset and the standings after stage 1 visible.
2. **Given** a finished third stage, **When** results are shown, **Then** the overall tour winner
   and team classification are displayed.

### Edge Cases

- A rider's target square and every square back to its starting square are full: the rider stays
  on its starting square. Its own spot is always available.
- A square narrows from 3 lanes to 2: lane preferences are clamped to the available lanes.
- Riders reaching the run-off area cannot overflow it; the run-off is long enough to hold every rider.
- Energy is below every cost except effort 1: only effort 1 is selectable.
- A cracked rider: efforts above 3 are disabled for 2 turns, and the UI says why.
- A finished rider takes no further turns and no longer blocks squares.
- The turn cap is reached: the remaining riders are ranked by position and score no finish points.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement every rule in the rules summary exactly as written.
- **FR-002**: The system MUST offer at least 3 preset stages with distinct terrain profiles and
  default winds, plus a random stage generator driven by a numeric seed.
- **FR-003**: Players MUST be able to choose an effort (1–9) and a lane preference (left, keep,
  right) for each of their riders before confirming a turn.
- **FR-004**: The system MUST show, before confirmation, each rider's energy cost, resulting strain,
  crack warning, shelter status and predicted unblocked landing square.
- **FR-005**: The system MUST resolve all riders' moves simultaneously and animate them in
  resolution order.
- **FR-006**: The system MUST keep a race log with one entry per rider per turn (effort, distance,
  shelter, cost, crack, points).
- **FR-007**: The system MUST provide four AI personalities and assign one to each AI team.
- **FR-008**: The system MUST show a results screen with finish order, points and team standings.
- **FR-009**: The system MUST support a three-stage tour with cumulative standings.
- **FR-010**: The system MUST be playable with mouse alone and with keyboard alone (1–9 effort,
  arrow keys for lane, Tab to switch rider, Enter to confirm).
- **FR-011**: Identical setup, seed and player inputs MUST reproduce an identical race.
- **FR-012**: The system MUST include an in-game rules page.

### Key Entities

- **Stage**: name, ordered squares (terrain, width), sprint line index, finish line index,
  default wind.
- **Rider**: id, team, archetype, square, lane, energy, strain, crack turns remaining, finished
  flag and finish turn, points.
- **Team**: id, name, colour, controller (human or AI personality), two riders.
- **Turn Order**: per rider, an effort and a lane preference.
- **Race State**: stage, wind, riders, turn number, sprint results, finish results, log.
- **Tour**: list of stages, cumulative points per rider and team.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time player can start a quick race within 30 seconds of opening the game.
- **SC-002**: A single stage against 3 AI teams takes 10–20 minutes for a human player.
- **SC-003**: Each turn, including AI decisions, resolves and starts animating in under 1 second.
- **SC-004**: In 100 simulated all-AI races, every race ends within the turn cap, and no
  personality wins more than 50% of races (balance).
- **SC-005**: Every rule in the rules summary is covered by at least one passing automated test.

## Assumptions

- Single-player against AI only. Online or hot-seat multiplayer is out of scope for v1.
- Desktop browser first. The layout should still work on a tablet, but phone play is not a v1 target.
- Language of the UI is English, with Finnish flavour names for stages.
- No accounts or saving. A tour is lost if the page is closed.
- Balance numbers in the rules summary are starting values and may be tuned through a single
  constants file.
