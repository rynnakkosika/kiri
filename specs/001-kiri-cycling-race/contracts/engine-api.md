# Contract: Kiri engine API (`window.Kiri`)

UI and AI code use only these functions. All of them are pure: inputs are never mutated.

## rules.js

- `energyCost(effort, sheltered, wind) → number`
- `budget(rider, effort, stage) → number` — includes the sprinter Kick
- `stepCost(archetype, terrain) → number`
- `pathReach(stage, rider, effort) → square` — furthest square reachable, ignoring blocking
- `isSheltered(state, rider) → boolean`
- `strainAfter(rider, effort, sheltered) → { strain, cracked }`
- `maxEffort(rider) → number` — combines crack cap and energy
- `legalEfforts(state, rider) → number[]`

## race.js

- `createRace({ stage, wind?, teams: [{name, color, controller, archetypes: [a, b]}], seed }) → RaceState`
- `previewOrder(state, riderId, order) → { cost, strain, cracked, sheltered, reach, legal }`
- `resolveTurn(state, ordersByRiderId) → RaceState` — throws on an illegal order
- `standings(state) → { riders: [{id, place, points}], teams: [{id, points}] }`
- `isOver(state) → boolean`

## stages.js

- `PRESET_STAGES: Stage[]`
- `generateStage(seed) → Stage`

## ai/bots.js

- `chooseOrders(state, teamId, rng) → { [riderId]: Order }`

## tour.js

- `createTour(seed, setup) → Tour`
- `recordStage(tour, raceState) → Tour`
- `tourStandings(tour) → standings`
