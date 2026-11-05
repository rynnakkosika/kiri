// Every balance number in Travbana lives here (constitution: tuning never touches logic).
(function (Kiri) {
  'use strict';

  Kiri.C = Object.freeze({
    MIN_EFFORT: 1,
    MAX_EFFORT: 9,
    // Energy cost for speed 1..9 (index 0 unused).
    EFFORT_COST: [0, 0, 1, 2, 3, 5, 7, 9, 12, 15],

    // Oval: 40 segments of 25 m. 0–9 home straight, 10–19 curve, 20–29 back straight, 30–39 curve.
    SEGMENT_M: 25,
    LAP: 40,
    FINISH_LAP_POS: 10,
    LANES: 4,
    // Half-step cost of entering a segment, by lane (index 0 = lane 1, the rail).
    STRAIGHT_COST: 2,
    CURVE_COST: [2, 2, 3, 4],

    // Energy multipliers by position at the start of the turn (rule 4).
    COVER_MULT: [0.6, 0.7, 0.85, 0.85],
    OPEN_MULT: [1.0, 1.3, 1.5, 1.7],
    DEATH_SEAT_MULT: 1.6,
    WIDE_CURVE_MULT: 1.25,
    WIDE_FROM_LANE: 2,

    ARCHETYPES: {
      stayer: { name: 'Stayer', energy: 125, blurb: 'Deep reserves. Can afford a lap outside.' },
      closer: { name: 'Closer', energy: 110, blurb: 'Kick: +2 segments at speed 7+ in the last 300 m.' },
      gate: { name: 'Gate speed', energy: 110, blurb: 'Fast away: +2 segments in turns 1–2. Grab the lead or the pocket.' },
    },
    KICK_RANGE: 12,
    KICK_MIN_EFFORT: 7,
    KICK_BONUS: 4,
    GATE_TURNS: 2,
    GATE_BONUS: 4,

    STRAIN_NEUTRAL: 5,
    STRAIN_MAX: 10,
    STRAIN_AFTER_CRACK: 5,
    CRACK_TURNS: 2,
    CRACK_MAX_EFFORT: 3,
    // An exhausted horse (energy 0) may still trot this fast for free.
    EXHAUSTED_MAX_EFFORT: 3,

    PURSE: [10000, 5000, 2500, 1500, 1000, 800, 600, 400],

    // A full field: 4 lanes × 3 rows behind the autostart gate (spec 006).
    FIELD_MAX: 12,
    // Ladder (spec 006): Elo starts at 1000 and is shown as money, 100 Elo = 1.00.
    ELO_START: 1000,
    ELO_K: 32,
    ELO_PER_MONEY: 100,
    TURN_CAP: 60,
    RUNOFF: 14,
  });
})(window.Kiri = window.Kiri || {});
