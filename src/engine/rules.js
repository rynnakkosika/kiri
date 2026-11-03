// Pure rule functions (spec 003 rules 2–6). No DOM, no state mutation.
(function (Kiri) {
  'use strict';
  const C = Kiri.C;

  // Segments behind the start line follow the oval too; they are always four lanes wide.
  function squareAt(stage, i) {
    if (i < 0) {
      const curve = stage.startOffset !== undefined && Kiri.isCurveAt(Kiri.lapPos(stage, i));
      return { terrain: curve ? 'curve' : 'straight', width: C.LANES };
    }
    return stage.squares[Math.min(i, stage.squares.length - 1)];
  }

  function stepCost(terrain, lane) {
    return terrain === 'curve' ? C.CURVE_COST[Math.max(0, Math.min(C.LANES - 1, lane))] : C.STRAIGHT_COST;
  }

  function budget(rider, effort, stage, turn) {
    let b = 2 * effort;
    const toFinish = stage.finish - rider.square;
    if (rider.archetype === 'closer' && effort >= C.KICK_MIN_EFFORT && toFinish > 0 && toFinish <= C.KICK_RANGE) b += C.KICK_BONUS;
    if (rider.archetype === 'gate' && turn !== undefined && turn <= C.GATE_TURNS) b += C.GATE_BONUS;
    return b;
  }

  // Lane a horse ends up requesting: one lane at most from where it is.
  function requestedLane(rider, lanePref) {
    return Math.max(0, Math.min(C.LANES - 1, rider.lane + Math.max(-1, Math.min(1, lanePref || 0))));
  }

  // Furthest segment reachable ignoring other horses, paying curve costs in the outer of the
  // current and requested lane. Always at least one segment (rule 2).
  function pathReach(stage, rider, effort, lanePref, turn) {
    const travel = Math.max(rider.lane, requestedLane(rider, lanePref));
    let b = budget(rider, effort, stage, turn);
    let pos = rider.square;
    const last = stage.squares.length - 1;
    while (pos < last) {
      const cost = stepCost(squareAt(stage, pos + 1).terrain, travel);
      if (cost > b) break;
      b -= cost;
      pos++;
    }
    if (pos === rider.square && pos < last) pos++;
    return pos;
  }

  // Position at a spot, given the other horses' spots (rule 4).
  function positionAt(stage, square, lane, spots) {
    const covered = spots.some((s) => s.square === square + 1 && s.lane === lane);
    const deathSeat = !covered && lane === 1 && spots.some((s) => s.lane === 0 && (s.square === square || s.square === square + 1));
    const wide = lane >= C.WIDE_FROM_LANE && squareAt(stage, square).terrain === 'curve';
    let mult = covered ? C.COVER_MULT[lane] : deathSeat ? C.DEATH_SEAT_MULT : C.OPEN_MULT[lane];
    if (wide) mult *= C.WIDE_CURVE_MULT;
    const kind = covered ? 'cover' : deathSeat ? 'deathSeat' : 'open';
    return { kind, covered, deathSeat, wide, mult };
  }

  function others(state, rider) {
    return state.riders.filter((r) => !r.finished && r.id !== rider.id);
  }

  function position(state, rider) {
    const pos = positionAt(state.stage, rider.square, rider.lane, others(state, rider));
    pos.leader = Kiri.resolutionOrder(state.riders.filter((r) => !r.finished))[0].id === rider.id;
    return pos;
  }

  function energyCost(effort, pos) {
    const base = C.EFFORT_COST[effort];
    return Math.round(base * (pos ? pos.mult : 1) + 1e-9);
  }

  function strainAfter(rider, effort, pos) {
    let s = rider.strain + (effort - C.STRAIN_NEUTRAL);
    if (pos && pos.covered) s -= 1;
    if (pos && pos.deathSeat) s += 1;
    s = Math.max(0, s);
    if (s >= C.STRAIN_MAX) return { strain: C.STRAIN_AFTER_CRACK, cracked: true };
    return { strain: s, cracked: false };
  }

  function maxEffort(rider) {
    return rider.crack > 0 ? C.CRACK_MAX_EFFORT : C.MAX_EFFORT;
  }

  function legalEfforts(state, rider) {
    const pos = position(state, rider);
    const out = [];
    for (let e = C.MIN_EFFORT; e <= maxEffort(rider); e++) {
      // Exhausted horses can still trot slowly for free; they never stop.
      const free = rider.energy === 0 && e <= C.EXHAUSTED_MAX_EFFORT;
      if (free || energyCost(e, pos) <= rider.energy) out.push(e);
    }
    return out;
  }

  // Free lane among the allowed ones, nearest the request; ties go to the inner lane (rule 6).
  function pickLane(allowed, request, taken) {
    let best = -1;
    for (const l of allowed) {
      if (taken.has(l)) continue;
      if (best < 0 || Math.abs(l - request) < Math.abs(best - request) || (Math.abs(l - request) === Math.abs(best - request) && l < best)) best = l;
    }
    return best;
  }

  // One lane at most, and never into a lane where a horse runs right alongside (that is what
  // boxes a horse in on the rail). `spots` are the other horses at the start of the turn.
  function allowedLanes(rider, spots) {
    const out = [];
    for (let l = Math.max(0, rider.lane - 1); l <= Math.min(C.LANES - 1, rider.lane + 1); l++) {
      if (l !== rider.lane && (spots || []).some((s) => s.square === rider.square && s.lane === l)) continue;
      out.push(l);
    }
    return out;
  }

  // Sum of half-steps from a square to the finish line on the rail.
  function halfStepsToFinish(stage, archetype, square) {
    let h = 0;
    for (let i = square + 1; i <= stage.finish; i++) h += stepCost(squareAt(stage, i).terrain, 0);
    return h;
  }

  Object.assign(Kiri, {
    squareAt, stepCost, budget, requestedLane, pathReach, positionAt, position,
    energyCost, strainAfter, maxEffort, legalEfforts, pickLane, allowedLanes, halfStepsToFinish,
  });
})(window.Kiri = window.Kiri || {});
