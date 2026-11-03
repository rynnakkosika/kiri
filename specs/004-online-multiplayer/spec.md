# Feature Specification: Online two-player races

**Feature Branch**: `004-online-multiplayer`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description (Finnish, translated): "Can I play this game with my friend? They live
somewhere else." Option chosen: an online link, with no install for the friend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Host a race and invite a friend (Priority: P1)

The player chooses **Play online → Host**, sets up the race (distance, AI stables, difficulty, own
horses, stable name) and gets a short game code plus an invite link to send to a friend. When the
friend joins, both stables are in the race and the host starts it.

**Why this priority**: this is the whole request.

**Independent Test**: open the game in two browsers. Host in one, join with the code in the
other, and play a race to the end.

**Acceptance Scenarios**:

1. **Given** the title screen, **When** Host is chosen, **Then** a 6-character code and a copyable
   invite link are shown, with "Waiting for your friend…".
2. **Given** a friend opens the invite link (or enters the code), **When** they pick their stable
   name and horses and press Join, **Then** the host sees the friend's stable in the lobby and can
   start the race.
3. **Given** the race started, **When** each player looks at the screen, **Then** each controls only
   their own two horses, and their own stable is highlighted for them.

---

### User Story 2 - Simultaneous turns over the network (Priority: P1)

Each turn both players choose speed and lane for their horses and press Drive. When both have
locked in, the turn resolves and both screens animate the same moves.

**Independent Test**: lock in on one side and check that the other side shows "Your friend has
locked in". Lock in on the other side and check that both animate the same result.

**Acceptance Scenarios**:

1. **Given** one player locked in, **When** the other hasn't yet, **Then** the locked player sees
   "Waiting for your friend…", and the other sees that the friend is ready.
2. **Given** both locked in, **When** the turn resolves, **Then** both players see identical
   positions, energy and log.
3. **Given** a player's horses have finished, **When** the other player still races, **Then** the
   finished player's turns are skipped automatically.
4. **Given** the race ended, **When** results are shown, **Then** both see the same results, and
   the host can start a rematch that the guest joins automatically.

---

### User Story 3 - Connection problems (Priority: P2)

If the connection drops, both players get a clear message. The host can finish the race with the
friend's stable taken over by the AI, and the guest can go back to the menu.

**Acceptance Scenarios**:

1. **Given** a running race, **When** the guest closes their browser, **Then** the host sees "Your
   friend disconnected" with "Continue with AI" and "Quit".
2. **Given** a wrong or expired code, **When** joining, **Then** the guest sees "Game not found"
   and can try again.

### Edge Cases

- The host refreshes the page: the online race is lost and the guest is told (no online save in v1).
- Both players submit in the same instant: the turn resolves exactly once.
- A message for an old turn arrives late: it is ignored.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let one player host and one friend join by code or link, with no
  account or install.
- **FR-002**: The host's game MUST be the single source of truth. It resolves turns with the
  existing engine and sends the resulting state to the guest.
- **FR-003**: Each player MUST be able to give orders only to their own horses. The host MUST
  reject orders for other horses and for any turn except the current one.
- **FR-004**: Each player MUST see the other's lock-in status during a turn.
- **FR-005**: The race MUST support 0–4 AI stables in addition to the two players.
- **FR-006**: Offline play MUST keep working from `file://` without loading any network code.
- **FR-007**: A disconnect MUST be detected and offered "Continue with AI" (host) or "Back to menu" (guest).

### Key Entities

- **Lobby**: code, host stable, guest stable (when joined), race settings.
- **Message**: `hello`, `lobby`, `start`, `orders`, `ready`, `state`, `bye`. Every message carries the turn it belongs to.

## Success Criteria *(mandatory)*

- **SC-001**: A friend can join from the invite link in under 30 seconds.
- **SC-002**: After both lock in, both screens start animating within 1 second.
- **SC-003**: In 100 simulated two-player races through the message protocol (no network), host
  and guest end with identical states.

## Assumptions

- Two human players per race. More than two is out of scope for v1.
- The connection is peer-to-peer (WebRTC). A free public signalling service introduces the two
  browsers. The game data itself goes directly between the players.
- To play online, the game must be served from a web address (for example GitHub Pages), so the
  friend can open it. Publishing is a separate step that the user approves.
