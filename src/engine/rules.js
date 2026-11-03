// Pure rule functions (spec rules 2–6). No DOM, no state mutation.
(function (Kiri) {
  'use strict';
  const C = Kiri.C;

  // Squares before the start line (negative indices) are flat, 3 lanes wide.
  function squareAt(stage, i) {
    if (i < 0) return { terrain: 'flat', width: 3 };
    return stage.squares[Math.min(i, stage.squares.length - 1)];
  }

  function stepCost(archetype, terrain) {
    const own = C.ARCHETYPES[archetype].steps[terrain];
    return own !== undefined ? own : C.STEP_COST[terrain];
  }

  function budget(rider, effort, stage) {
    let b = 2 * effort;
    const toFinish = stage.finish - rider.square;
    if (rider.archetype === 'sprinter' && effort >= C.KICK_MIN_EFFORT && toFinish > 0 && toFinish <= C.KICK_RANGE) {
      b += C.KICK_BONUS;
    }
    return b;
  }

  // Furthest square reachable ignoring other riders. Always at least one square (rule 2).
  function pathReach(stage, rider, effort) {
    let b = budget(rider, effort, stage);
    let pos = rider.square;
    const last = stage.squares.length - 1;
    while (pos < last) {
      const cost = stepCost(rider.archetype, squareAt(stage, pos + 1).terrain);
      if (cost > b) break;
      b -= cost;
      pos++;
    }
    if (pos === rider.square && pos < last) pos++;
    return pos;
  }

  function shelterLane(wind, lane) {
    if (wind === 'crossLeft') return lane - 1;
    if (wind === 'crossRight') return lane + 1;
    return lane;
  }

  // Rule 6, evaluated against an arbitrary list of (square, lane) spots.
  function shelteredAt(stage, wind, square, lane, spots) {
    if (squareAt(stage, square).terrain === 'climb') return false;
    const target = shelterLane(wind, lane);
    if (target < 0 || target >= squareAt(stage, square + 1).width) return false;
    return spots.some((s) => s.square === square + 1 && s.lane === target);
  }

  function isSheltered(state, rider) {
    const spots = state.riders.filter((r) => !r.finished && r.id !== rider.id);
    return shelteredAt(state.stage, state.wind, rider.square, rider.lane, spots);
  }

  function energyCost(effort, sheltered, wind) {
    const base = C.EFFORT_COST[effort];
    if (!sheltered) return base;
    return Math.floor(base * (1 - C.SHELTER_DISCOUNT[wind]) + 1e-9);
  }

  function strainAfter(rider, effort, sheltered) {
    let s = rider.strain + (effort - C.STRAIN_NEUTRAL) - (sheltered ? 1 : 0);
    s = Math.max(0, s);
    if (s >= C.STRAIN_MAX) return { strain: C.STRAIN_AFTER_CRACK, cracked: true };
    return { strain: s, cracked: false };
  }

  function maxEffort(rider) {
    return rider.crack > 0 ? C.CRACK_MAX_EFFORT : C.MAX_EFFORT;
  }

  function legalEfforts(state, rider) {
    const sheltered = isSheltered(state, rider);
    const out = [];
    for (let e = C.MIN_EFFORT; e <= maxEffort(rider); e++) {
      if (energyCost(e, sheltered, state.wind) <= rider.energy) out.push(e);
    }
    return out;
  }

  // Free lane nearest to the preferred lane; ties go to the lower lane (rule 7).
  function pickLane(width, preferred, taken) {
    const pref = Math.max(0, Math.min(width - 1, preferred));
    let best = -1;
    for (let l = 0; l < width; l++) {
      if (taken.has(l)) continue;
      if (best < 0 || Math.abs(l - pref) < Math.abs(best - pref)) best = l;
    }
    return best;
  }

  // Sum of half-steps from a square to the finish line for an archetype.
  function halfStepsToFinish(stage, archetype, square) {
    let h = 0;
    for (let i = square + 1; i <= stage.finish; i++) h += stepCost(archetype, squareAt(stage, i).terrain);
    return h;
  }

  Object.assign(Kiri, {
    squareAt, stepCost, budget, pathReach, shelterLane, shelteredAt, isSheltered,
    energyCost, strainAfter, maxEffort, legalEfforts, pickLane, halfStepsToFinish,
  });
})(window.Kiri = window.Kiri || {});
