# Data Model: Kiri

All state is plain JSON-compatible objects, so a race state can be cloned with `structuredClone`.

## Stage

| Field | Type | Notes |
|-------|------|-------|
| name | string | e.g. "Rannikko" |
| squares | `{terrain: 'flat'\|'climb'\|'descent'\|'cobbles', width: 2\|3}[]` | index 0 = front of start grid |
| sprint | number | sprint line square index; crossing = moving from `< sprint` to `>= sprint` |
| finish | number | finish line index; squares after it are run-off (flat, width 3) |
| wind | `'calm'\|'head'\|'crossLeft'\|'crossRight'` | default wind |

Start grid: riders are placed behind square 0 at negative indices (-1, -2, …), which count as
flat, width 3.

## Rider

| Field | Type | Notes |
|-------|------|-------|
| id | number | 0..n-1, unique in race |
| team | number | team id |
| archetype | `'rouleur'\|'climber'\|'sprinter'` | |
| square, lane | number | lane 0 = leftmost |
| energy, maxEnergy | number | |
| strain | number | 0..10 |
| crack | number | turns left with effort capped at 3 |
| finished | boolean | |
| finishTurn, finishPlace | number\|null | |
| points | number | sprint + finish points this stage |

## Team

`{ id, name, color, controller: 'human' | 'diesel' | 'wheelsucker' | 'attacker' | 'planner' }`

## Order

`{ effort: 1..9, lane: -1 | 0 | 1 }`, meaning lane preference left / keep / right relative to the
current lane.

## RaceState

`{ stage, wind, teams, riders, turn, sprintDone: riderId[], finishOrder: riderId[], log: LogEntry[], over }`

## LogEntry

`{ turn, rider, effort, from, to, sheltered, cost, strain, cracked, notes: string[] }`

## Tour

`{ stageNames: string[], index, totals: { [riderId]: points }, seed }`

## State transitions

`createRace(setup)` → RaceState(turn 1) → `resolveTurn(state, orders)` → RaceState(turn+1) … →
`over = true` when every rider has finished or `turn > 60`.
