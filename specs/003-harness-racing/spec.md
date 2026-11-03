# Feature Specification: Harness racing theme

**Feature Branch**: `003-harness-racing`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description (Finnish, translated): "Make the theme harness racing (ravit): horses
race on an oval track. Take trotting endurance rules into account. For example, in the death seat
(second lane, outside, without cover) a horse tires a lot. Passing through the third or fourth lane
also takes strength, especially in the curves."

## Concept

Kiri becomes a harness racing game. The player owns a stable of two trotters and races them against
1–5 AI stables on a 1000 m oval. The core loop stays the same: each turn every horse gets a
**speed** 1–9 and a lane change, and then all horses move at once. Energy and strain still drive
the decisions. The wind and slope rules are replaced with trotting's positional economy:

- **Cover**: a horse sitting directly behind another horse ("in cover") saves energy.
- **Death seat**: the horse in lane 2, outside the leader with nobody in front of it, pays the most.
- **Wide lanes**: lanes 3 and 4 are longer in the curves and cost more energy.
- **Boxed in**: lane changes are limited, so a horse on the rail can get stuck behind and inside other horses.
- **Galloping**: a horse pushed past its limit breaks into a gallop and has to be pulled back to a trot.

## Rules summary (normative; replaces the 001 rules summary)

1. **Track**: a 1000 m oval split into 40 segments of 25 m. In order: home straight (10 segments),
   curve (10), back straight (10), curve (10). Horses run counter-clockwise. There are 4 lanes; lane 1
   is the inside rail. The finish line is at the end of the home straight. A race is 1609 m (64
   segments), 2100 m (84) or 2600 m (104); seeded random races use other distances from 1600 to
   3100 m. Run-off segments follow the finish line.
2. **Movement**: speed S gives a budget of 2×S. Each segment entered costs budget: 2 on a straight. On a
   curve it costs 2 in lanes 1–2, 3 in lane 3 and 4 in lane 4. The lane used for the cost is the outer
   of the horse's current lane and its requested lane. A horse always moves at least one segment.
3. **Horse types**: **Stayer** has 125 energy. **Closer** has 110 energy and a **Kick**: +4 budget when
   starting within 12 segments of the finish at speed 7 or more. **Gate speed** has 110 energy and +4
   budget in turns 1 and 2.
4. **Energy cost**: the base cost for speeds 1–9 is 0, 1, 2, 3, 5, 7, 9, 12, 15. It is multiplied by
   the horse's position at the start of the turn and rounded to the nearest whole number:
   - **In cover** (a horse in the next segment, same lane): ×0.6 in lane 1, ×0.7 in lane 2,
     ×0.85 in lanes 3–4.
   - **Open** (no cover): ×1.0 in lane 1, ×1.3 in lane 2, ×1.5 in lane 3, ×1.7 in lane 4.
   - **Death seat** (lane 2, no cover, a horse in lane 1 in the same or the next segment): ×1.6.
   - **Wide in a curve** (lane 3 or 4 and starting on a curve segment): a further ×1.25.
   A horse cannot choose a speed it can't pay for. An **exhausted** horse (energy 0) may still trot
   at speeds 1–3 for free.
5. **Strain** (0–10): after each turn strain changes by speed − 5. It is 1 lower if the horse was in
   cover and 1 higher if it was in the death seat. At 10 the horse **breaks into a gallop**: strain
   drops to 5 and its speed is capped at 3 for the next 2 turns.
6. **Lanes**: a horse can change at most one lane per turn, and never into a lane where another
   horse runs right alongside it (same segment) at the start of the turn. That is how a rail horse
   gets boxed in. It takes the free lane closest to its request among its current lane and the
   allowed lanes next to it. If none is free on the segment it
   reaches, it drops back a segment at a time. Its own spot is always free.
7. **Resolution order**: the horse furthest ahead moves first. Ties go to the inner lane, then the
   lower horse number. Finished horses don't block.
8. **Prize money**: the purse pays 10 000 / 5 000 / 2 500 / 1 500 / 1 000 / 800 / 600 / 400 € by
   finish order. Horses finishing in the same turn are ordered by distance past the line, then by
   resolution order. Stables rank by total earnings.
9. **End**: the race ends when every horse has finished, or after 60 turns. Horses still running at
   the cap are placed by position and earn nothing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drive a trotting race on an oval (Priority: P1)

The player starts a race, sees the whole oval with every horse and sulky on it, sets speed and lane
for both horses each turn, and watches them trot around the track to the finish.

**Why this priority**: this is the new game.

**Independent Test**: start a quick race and finish it. The horses move around the oval, and
the results show finish order and prize money.

**Acceptance Scenarios**:

1. **Given** the title screen, **When** Quick race is chosen, **Then** a 2100 m race starts with horses
   behind the start line, and the whole oval is visible.
2. **Given** a turn is ridden, **When** horses move through a curve, **Then** they follow the curve
   in their lanes.
3. **Given** the last horse finishes, **When** results are shown, **Then** prize money is listed per
   horse and per stable.

### User Story 2 - Positional endurance (Priority: P1)

The player can see and feel the trotting economy: cover saves energy, the death seat burns it,
and going wide in curves costs extra.

**Why this priority**: this is the user's core request.

**Independent Test**: put a horse in each position and check that the previewed cost matches rule 4.

**Acceptance Scenarios**:

1. **Given** a horse in lane 2 alongside the leader with nobody ahead of it, **When** the player
   previews speed 6, **Then** the card shows "Death seat", the cost is 11 (7 × 1.6), and strain
   rises by 2.
2. **Given** a horse directly behind the leader on the rail, **When** it previews speed 6, **Then**
   the cost is 4 (7 × 0.6) and the card shows "In cover".
3. **Given** a horse in lane 3 on a curve, **When** it previews speed 6, **Then** the cost is 13
   (7 × 1.5 × 1.25 = 13.1).
4. **Given** a horse that requests lane 3 while on a curve, **When** the movement is previewed,
   **Then** each curve segment costs 3.

### User Story 3 - Boxed in and galloping (Priority: P2)

A horse on the rail with horses ahead of it and outside it can't get out. A horse pushed to strain
10 gallops and loses its speed.

**Independent Test**: build both situations in tests.

**Acceptance Scenarios**:

1. **Given** a horse in lane 1 with a horse ahead of it and another outside it in lane 2, **When** it
   requests the outside, **Then** it stays in lane 1 if lane 2 is taken at every segment it could reach.
2. **Given** strain 7 and speed 8, **When** the turn is ridden, **Then** the horse gallops: strain 5,
   max speed 3 for 2 turns, and the log says it broke into a gallop.

### User Story 4 - Everything else carries over (Priority: P2)

The setup screen (race distance, AI stables, difficulty, horse types, stable name), save/continue,
the three-race series, sounds, the phone layout, the rules page and the AI personalities all work
in the new theme.

**Independent Test**: play a series of three races (Mile, Classic, Long), reloading in the middle once.

### Edge Cases

- Twelve horses at the start: the autostart grid is three rows of four lanes.
- A horse that wants lane 4 from lane 2 only gets to lane 3 this turn.
- A horse at the leader's side in lane 1 is not in the death seat. Only lane 2 is.
- A finished horse gives no cover and doesn't make another horse's position a death seat.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement the rules summary above, replacing the cycling rules.
- **FR-002**: The track MUST be drawn as an oval, with horses placed in their lanes and facing the
  direction of travel, including through the curves.
- **FR-003**: Before a turn is confirmed, the system MUST show each horse's position (lead, in cover,
  open, death seat, wide in a curve), its cost multiplier and the resulting cost.
- **FR-004**: The race log MUST name positional events: death seat, cover, galloping.
- **FR-005**: The AI MUST weigh positions: prefer cover, avoid the death seat unless attacking, and
  pull out of the pocket in time for the finish.
- **FR-006**: Every 001/002 feature (setup, difficulty, save, series, sounds, phone layout, rules
  page) MUST keep working with the new theme.
- **FR-007**: All texts MUST use harness racing terms: horse, stable, speed, sulky, prize money.

### Key Entities

- **Race (track)**: name, distance, segments (straight/curve, 4 lanes), finish index, start offset on the oval.
- **Horse**: as a rider in 001, with types Stayer, Closer and Gate speed.
- **Stable**: as a team in 001.

## Success Criteria *(mandatory)*

- **SC-001**: Every rule in the summary has a passing automated test.
- **SC-002**: In 100 simulated all-AI races, the winner spent less than 25% of its turns in the
  death seat on average. Sitting outside without cover should not pay off.
- **SC-003**: In the same simulation every race ends within the turn cap, and no personality wins
  more than 50% of races.
- **SC-004**: A race takes 15–35 turns.

## Assumptions

- The cycling theme is replaced, not kept as a second mode.
- The UI stays in English. Horse and stable names are Finnish-flavoured.
- Real trotting rules are simplified: no handicaps, no disqualification for galloping, and no
  "open stretch" lane.
