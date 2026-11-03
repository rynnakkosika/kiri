# Implementation Plan: Online two-player races

**Branch**: `004-online-multiplayer` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-online-multiplayer/spec.md`

## Summary

Host-authoritative peer-to-peer play. The host's browser owns the race state and runs the existing
pure engine and AI. The guest sends only its orders and renders the states the host sends back.
Pure protocol logic (`Kiri.OnlineHost`) is separate from transport (`Kiri.Net`, a thin wrapper
over PeerJS WebRTC data channels), so the protocol can be tested without a network. PeerJS is
loaded only when the player opens the online menu, so offline play stays dependency-free.

## Technical Context

**Language/Version**: JavaScript (ES2020)

**Primary Dependencies**: PeerJS 1.5.4 from unpkg, loaded lazily for online play only; it uses the
free PeerJS cloud signalling server

**Storage**: none for online games (no online save in v1); lobby name and horse prefs reuse `kiri.prefs`

**Testing**: protocol tests run host and guest logic against each other in memory; manual two-tab test over the real network

**Target Platform**: browsers with WebRTC (all current desktop and mobile browsers)

**Constraints**: offline play from `file://` must not touch the network

## Constitution Check

| Principle | Compliance | Status |
|-----------|-----------|--------|
| I. Original Design | No rule changes | Pass |
| II. Pure Deterministic Engine | Engine untouched; the host is the only resolver; AI seeded by race seed and turn | Pass |
| III. Zero-Install Play | Requires amendment 1.2.0: one pinned library is allowed for the optional online mode, loaded lazily. Offline play is unchanged | Pass after amendment |
| IV. Tested Rules | Protocol tests: ownership checks, turn gating, finished-player skip, identical end states | Pass |
| V. Readable Play | Lock-in status shown for both players | Pass |

## Project Structure

```text
src/ai/bots.js          # + aiOrdersFor(state, seed, difficulty), shared by solo and host
src/net/protocol.js     # Kiri.OnlineHost (pure): lobby, start, orders, resolution, messages out
src/net/peer.js         # Kiri.Net: lazy PeerJS load, host(code)/join(code), send, onMessage, onClose
src/ui/app.js           # online menu, lobby, invite link, lock-in flow, disconnect handling; myTeam instead of 0
src/ui/panels.js        # standings/log highlight myTeam; "Friend" label
tests/online.test.js    # protocol tests (SC-003)
```

## Design Notes

- **Code**: 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. The peer id is `kiri-trot-<code>`.
  The invite link is `<page url>?join=<code>`.
- **Messages** (JSON): guest → host: `hello {name, archetypes}`, `orders {turn, orders}`.
  Host → guest: `lobby {settings, host, guest}`, `start {race, myTeam: 1, setup}`, `ready {turn, host, guest}`,
  `state {race}`, `bye {reason}`.
- **Turn gating**: the host holds `pending[team]`. A team counts as done if it submitted for
  `race.turn`, or if all its horses have finished. When both are done, the host adds AI orders
  and resolves.
- **Validation**: orders are kept only for horses whose `team` matches the sender and only at a legal
  speed; anything else is dropped and replaced by a safe default (the highest legal speed ≤ 5).
- **Disconnect**: the PeerJS `close` and `error` events lead to a banner. "Continue with AI" turns the
  guest stable's controller into `planner`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Third-party library (PeerJS) | WebRTC needs signalling, and players can't run a server | Hand-copying WebRTC offers between players is unusable; writing our own signalling server needs hosting |
