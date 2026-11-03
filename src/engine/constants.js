// Every balance number in Kiri lives here (constitution: tuning never touches logic).
(function (Kiri) {
  'use strict';

  Kiri.C = Object.freeze({
    MIN_EFFORT: 1,
    MAX_EFFORT: 9,
    // Energy cost for effort 1..9 (index 0 unused).
    EFFORT_COST: [0, 0, 1, 2, 3, 5, 7, 9, 12, 15],
    // Shelter discount on energy cost, by wind.
    SHELTER_DISCOUNT: { calm: 0.3, head: 0.5, crossLeft: 0.4, crossRight: 0.4 },
    // Half-step cost of entering a square, by terrain, with archetype overrides.
    STEP_COST: { flat: 2, descent: 1, cobbles: 3, climb: 4 },
    ARCHETYPES: {
      rouleur: { name: 'Rouleur', energy: 110, steps: { cobbles: 2 }, blurb: 'Big engine, at home on cobbles.' },
      climber: { name: 'Climber', energy: 100, steps: { climb: 3 }, blurb: 'Floats up the climbs.' },
      sprinter: { name: 'Sprinter', energy: 95, steps: { climb: 5 }, blurb: 'Deadly Kick in the final 12 squares.' },
    },
    KICK_RANGE: 12,
    KICK_MIN_EFFORT: 7,
    KICK_BONUS: 4,
    DESCENT_RECOVERY: 2,
    DESCENT_RECOVERY_MAX_EFFORT: 4,
    STRAIN_NEUTRAL: 5,
    STRAIN_MAX: 10,
    STRAIN_AFTER_CRACK: 6,
    CRACK_TURNS: 2,
    CRACK_MAX_EFFORT: 3,
    SPRINT_POINTS: [5, 3, 1],
    FINISH_POINTS: [15, 12, 10, 8, 6, 5, 4, 3, 2, 1],
    TURN_CAP: 60,
    RUNOFF: 14,
    WINDS: ['calm', 'head', 'crossLeft', 'crossRight'],
    WIND_NAMES: { calm: 'Calm', head: 'Headwind', crossLeft: 'Crosswind from the left', crossRight: 'Crosswind from the right' },
  });
})(window.Kiri = window.Kiri || {});
