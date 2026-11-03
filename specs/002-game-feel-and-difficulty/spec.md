# Feature Specification: Game feel, difficulty and save

**Feature Branch**: `002-game-feel-and-difficulty`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Improve the game: gameplay and look — e.g. animated riders, sounds,
difficulty level, saving, phone layout."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose a difficulty (Priority: P1)

The player picks Easy, Normal or Hard before a race or tour. Easy rivals make visible mistakes,
while Hard rivals plan carefully and the field is full of Planners. The rules are the same at
every level; only the AI's decisions change.

**Why this priority**: v1 has one fixed strength. New players lose, and experienced players want
a challenge.

**Independent Test**: simulate races of a Normal-strength reference team against Easy fields and
against Hard fields. The reference team wins clearly more often against Easy fields.

**Acceptance Scenarios**:

1. **Given** the setup screen, **When** the player selects Hard, **Then** the race starts with Hard AI
   and the race screen shows the difficulty.
2. **Given** Quick race, **When** it starts, **Then** it uses the last chosen difficulty (Normal by default).
3. **Given** any difficulty, **When** a race is resolved, **Then** the same rules apply to every rider.

---

### User Story 2 - Continue an interrupted race (Priority: P1)

If the player closes or reloads the page mid-race or mid-tour, the title screen offers to
continue exactly where they left off.

**Why this priority**: a tour takes 45+ minutes, and losing it on reload is painful.

**Independent Test**: play three turns, reload the page, choose Continue. The turn, positions,
energy, log and tour standings are all identical to before the reload.

**Acceptance Scenarios**:

1. **Given** a race in progress, **When** the page is reloaded, **Then** the title screen shows
   "Continue" with the stage name and turn.
2. **Given** a continued race, **When** the player rides the next turn, **Then** the outcome matches
   what it would have been without the reload (same seed-driven AI).
3. **Given** a finished race or a quit race, **When** the title screen is shown, **Then** there is no
   Continue option (except between tour stages, where the tour can continue).
4. **Given** storage is unavailable or the save is corrupt, **When** the game starts, **Then** it starts
   normally without errors.

---

### User Story 3 - Riders that look and sound like a race (Priority: P2)

Riders are drawn as cyclists on bikes in team jerseys. They pedal while moving, lean into lane
changes, and leave a short trail showing their last move. Short synthesized sounds mark a turn
being ridden, a sprint line crossing, a crack and the finish. A mute toggle is remembered.

**Why this priority**: makes the race readable at a glance and more fun. It doesn't change the rules.

**Independent Test**: ride a turn and watch pedaling, trails and the sprint bell; toggle mute and
reload, and mute is still on.

**Acceptance Scenarios**:

1. **Given** a resolved turn, **When** the animation ends, **Then** each rider's last move stays visible
   as a faint trail until the next turn is ridden.
2. **Given** sound is on, **When** a rider crosses the sprint line or the finish, **Then** a matching sound plays.
3. **Given** mute is on, **When** anything happens, **Then** no sound plays, and mute survives a reload.

---

### User Story 4 - Play on a phone (Priority: P3)

On a narrow screen (phone portrait, 360–430 px wide) the race screen fits the width with no
sideways scrolling. The track is shorter, the rider cards stack, and tapping a rider shows its
details.

**Why this priority**: nice to have. Desktop stays the main target.

**Independent Test**: open the race screen at 375×812 and play a turn using only taps.

**Acceptance Scenarios**:

1. **Given** a 375 px wide viewport, **When** the race screen is shown, **Then** nothing overflows
   horizontally and all nine effort buttons are tappable.
2. **Given** a touch screen, **When** the player taps a rider on the track, **Then** its details appear.

### Edge Cases

- A save from an older, incompatible version is ignored, not loaded.
- Audio cannot start until the player has interacted with the page; the first sound waits for that.
- If the page is reloaded mid-animation, the saved state is the already-resolved turn.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST offer Easy, Normal and Hard difficulty for custom races and tours, and
  remember the last choice.
- **FR-002**: Difficulty MUST affect only AI decisions (decision noise and personality mix), never
  the rules or rider stats.
- **FR-003**: The system MUST save race state after every resolved turn and offer to continue it
  from the title screen.
- **FR-004**: A continued race MUST be indistinguishable from an uninterrupted one (FR-011 of 001).
- **FR-005**: Riders MUST be drawn as cyclists in team colours with a visible number; the player's
  riders MUST stay distinguishable.
- **FR-006**: Each rider's last move MUST be shown as a trail until the next turn.
- **FR-007**: The system MUST play short sounds for: turn ridden, sprint crossing, crack, finish; with
  a persistent mute toggle.
- **FR-008**: The race screen MUST fit 360 px wide viewports with no horizontal scrolling.

### Key Entities

- **Difficulty**: `easy | normal | hard`; maps to AI noise amplitude and a personality pool.
- **Save**: version, race state, race setup, tour, tour setup, orders, difficulty.
- **Preferences**: difficulty, mute.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Over 60 simulated races, a fixed reference team wins the stage at least 1.5× as often
  against Easy fields as against Hard fields. Stage wins are the measure because finish points
  spread across all places and move little with opponent strength.
- **SC-002**: After a reload, continuing takes one click, and the race state is identical.
- **SC-003**: The race screen runs at 60 fps with 12 cyclists on a mid-range laptop.
- **SC-004**: No horizontal overflow at 360 px width.

## Assumptions

- Saves are kept only in this browser. Moving between devices is out of scope.
- Sounds are synthesized in the browser. No audio files are added (constitution III).
- One save slot is enough.
