# Feature Specification: Travbana, the 12-horse field and the Elo ladder

**Feature Branch**: `006-travbana-ladder`

**Created**: 2026-11-05

**Status**: Phase 1 in progress (offline parts); phase 2 (server) needs a free Cloudflare account

**Input**: User description (Finnish, translated): "Rename the game Travbana and add a ladder.
12 horses per race. Post positions are drawn." Clarified: "The ladder is for all players. If
there are 1000 players, I climb by winning or placing well and lose points when I finish at the
back. Starting level could be 1000 points. Races with friends, a single race or a cup, count only
on their own ladder. Only 12 fit in a race; the ladder and Elo decide who races whom, and AI bots
fill the field when there aren't enough players. A private race with friends can have as many
horses as wanted, 12 at most; AI bots take over horses with no player." Then: "By ladder I meant
an Elo system; the starting level could be, for example, 10 in money."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The game is called Travbana (Priority: P1)

Everything the player sees says Travbana: the title screen, the browser tab, the installed app,
the Play Store listing, the privacy policy and the icons' splash text.

**Acceptance Scenarios**:

1. **Given** any screen, **When** the player looks at a logo or title, **Then** it reads Travbana.
2. **Given** an older save from Kiri, **When** the game opens, **Then** the player can still continue it.

---

### User Story 2 - A full 12-horse field with a visible post draw (Priority: P1)

A race has at most 12 horses (4 lanes × 3 rows behind the autostart gate). Quick races and ladder
races always have a full 12. Before the start the player sees the draw: every horse's post
position 1–12, with their own horses highlighted.

**Acceptance Scenarios**:

1. **Given** a quick race, **When** it starts, **Then** there are 12 horses.
2. **Given** a new race, **When** it is created, **Then** each horse gets a distinct post 1–N drawn
   from the race seed; post 1 is the rail in the front row, posts 5–8 the second row, 9–12 the third.
3. **Given** the draw screen, **When** the player continues, **Then** the race starts with horses at
   their drawn posts, and each horse card shows its post.
4. **Given** the same seed, **When** the race is created twice, **Then** the draw is the same.

---

### User Story 3 - Ladder rating with Elo, shown as money (Priority: P1)

Every ladder player has an Elo rating. It starts at 1000 and is shown as ladder money: 1000 Elo =
10.00. Placing well against higher-rated stables earns more; finishing behind lower-rated stables
costs more. The money is only a score: it can't be bought, cashed out or bet.

**Acceptance Scenarios**:

1. **Given** a new player, **When** they open the ladder, **Then** their balance is 10.00.
2. **Given** a finished ladder race, **When** ratings update, **Then** each human stable's change is
   computed against every other stable in the race, AI bots included, and only humans' ratings change.
3. **Given** a race where everyone is rated equally, **When** it ends, **Then** the winner gains, the
   last loses, and the changes add up to roughly zero among the humans when there are no bots.

---

### User Story 4 - Public ladder races matched by rating (Priority: P2, needs server)

The player presses **Ladder race**. The server puts them in a race with up to 11 other players of
similar rating. If the field isn't full within a short wait, AI bots fill the remaining places.
The race runs on the server; each player drives their own stable, and the ladder table lists all
players by rating.

**Acceptance Scenarios**:

1. **Given** several players queue, **When** a race forms, **Then** players are grouped by nearest
   rating, at most 6 stables (12 horses) per race.
2. **Given** a race that isn't full after the wait (default 30 s), **When** it starts, **Then** AI
   stables take the empty places.
3. **Given** a player who disconnects or doesn't lock in before the turn timer, **When** the turn
   resolves, **Then** an AI drives their horses, and the race still counts for them.

---

### User Story 5 - Private races and private ladders with friends (Priority: P2, needs server)

Friends create a private group with a code. They play single races or a cup (3 races). A private
race has 1–6 human stables (2–12 horses); AI bots take any empty stables the host adds. Results
count only on that group's own ladder, never on the public one.

**Acceptance Scenarios**:

1. **Given** a private group, **When** a race ends, **Then** only the group's ladder changes.
2. **Given** a cup, **When** all 3 races end, **Then** the cup winner is the stable with the most prize money.

## Requirements *(mandatory)*

- **FR-001**: The visible name is Travbana. Internal code names (`Kiri` namespace, `kiri.*` storage
  keys) stay, so saves and links keep working.
- **FR-002**: A race has at most 12 horses (`C.FIELD_MAX`). Quick and ladder races have 12.
- **FR-003**: Post positions are drawn from the race seed and stored on each horse (`post`).
- **FR-004**: Elo is pure engine code (`src/engine/elo.js`), tested in the browser tests. Stables are
  ranked by prize money won in the race, ties by best horse place. Pairwise expected score uses the
  standard 400-point logistic curve; K = 32 is split across the other stables in the race.
- **FR-005**: AI bots in a rated race are rated at the average of the humans in that race and never
  change rating.
- **FR-006**: Ladder money = Elo / 100, shown with two decimals. It is never real money.
- **FR-007**: Public and private ladders are kept apart.
- **FR-008** (phase 2): The server is authoritative: it runs the same engine and AI, so a player can't
  change their own result. Identity is an anonymous player ID kept on the device plus a chosen
  stable name, with no passwords or email.

## Phase 2 design note: server

A static site can't hold a shared ladder, so phase 2 adds a small server. The proposal is
**Cloudflare Workers + Durable Objects** on the free plan. It runs JavaScript, so the existing
engine and AI run unchanged on the server, and WebSockets carry the turns. Each race is one
Durable Object with a turn timer, one more handles the matchmaking queue, and ratings are stored
in SQLite. Firebase's free plan can't run server code, and Supabase's free projects pause after
a week without use.

The user creates the free Cloudflare account themselves. Development and testing run locally with
`wrangler dev` and need no account.

## Success Criteria

- **SC-001**: All browser tests pass, including new draw and Elo tests.
- **SC-002**: Quick race shows the draw and runs with 12 horses on a 360 px phone without layout breakage.
- **SC-003**: The Android build and PWA show the name Travbana.
