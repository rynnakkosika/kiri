# Quickstart: Kiri

## Play

Open `index.html` in a browser (double-clicking works). Click **Quick race**.

Each turn, for each of your riders:

1. Pick an effort 1–9 (or press the number keys). The card shows the cost, the strain after the
   turn and a crack warning. A ghost marker on the track shows where the rider lands.
2. Choose a lane preference: ◀ / ● / ▶ (or the arrow keys). Tab switches rider.
3. Press **Ride** (or Enter).

## Test

Open `tests/index.html`. All suites must show green.

## Validation scenarios

1. Sheltered in a headwind, effort 8 costs 6 (spec US2-1).
2. Strain 7 + effort 8 shows a crack warning (US2-2).
3. Effort 4 two flat squares before a climb reaches +3 squares (US2-3).
4. Seed 42 generates the same stage twice (US3-1).
5. 100 all-AI races finish within 60 turns (US4-1, SC-004); check the "balance" output in the test page.
