// AI personalities. Each scores every (speed, lane) option for each horse and picks the best.
// Keys stay as in 001 (diesel, wheelsucker, attacker, planner) so saves and tests stay stable.
(function (Kiri) {
  'use strict';
  const C = Kiri.C;

  const PERSONALITIES = {
    diesel: { name: 'Steady', blurb: 'Trots an even, sustainable tempo.' },
    wheelsucker: { name: 'Pocket sitter', blurb: 'Hides in cover on the rail, pulls out late.' },
    attacker: { name: 'Front runner', blurb: 'Goes for the lead early and dares you to come round.' },
    planner: { name: 'Tactician', blurb: 'Weighs every metre against the energy left.' },
  };

  // Difficulty changes only how bots decide (score noise, lapses, sprint timing, personality mix).
  const DIFFICULTY = {
    easy: { name: 'Easy', noise: 3, lapse: 0.35, allInRange: 10, pool: ['diesel', 'wheelsucker', 'attacker'] },
    normal: { name: 'Normal', noise: 0.6, lapse: 0, allInRange: 30, pool: ['diesel', 'wheelsucker', 'attacker', 'planner'] },
    hard: { name: 'Hard', noise: 0, lapse: 0, allInRange: 40, pool: ['planner', 'planner', 'attacker', 'wheelsucker', 'planner'] },
  };

  // Guess where every other horse ends up: same distance as their last move.
  function predictOthers(state, me) {
    const last = {};
    for (const e of state.log) last[e.rider] = e.to - e.from;
    return state.riders
      .filter((r) => !r.finished && r.id !== me.id)
      .map((r) => ({ square: r.square + (last[r.id] !== undefined ? last[r.id] : 4), lane: r.lane }));
  }

  // Highest speed whose cost, paid every turn to the line, fits the energy left.
  function sustainAt(h, energy) {
    let best = 1;
    for (let e = 1; e <= C.MAX_EFFORT; e++) {
      if (C.EFFORT_COST[e] * Math.ceil(h / (2 * e)) <= energy * 1.15) best = e;
    }
    return best;
  }

  // Pace for the rest of the race, assuming the current position's cost multiplier persists.
  function sustainableEffort(state, r) {
    const mult = Math.max(0.6, Kiri.position(state, r).mult);
    return sustainAt(Kiri.halfStepsToFinish(state.stage, r.archetype, r.square), r.energy / mult);
  }

  function canGoAllIn(state, r, e) {
    const h = Kiri.halfStepsToFinish(state.stage, r.archetype, r.square);
    return C.EFFORT_COST[e] * Math.ceil(h / (2 * e)) <= r.energy;
  }

  // Tactician's estimate of turns to the line if it takes this option and then holds a
  // sustainable tempo from the position it lands in.
  function turnsToFinish(state, r, o) {
    const h = Kiri.halfStepsToFinish(state.stage, r.archetype, o.land);
    if (h <= 0) return 0;
    const energy = Math.max(0, r.energy - o.p.cost) / Math.max(0.6, o.next.mult);
    return 1 + h / (2 * sustainAt(h, energy));
  }

  function fieldMedian(others) {
    if (!others.length) return 0;
    const sq = others.map((o) => o.square).sort((a, b) => a - b);
    return sq[Math.floor(sq.length / 2)];
  }

  // Simulate own landing against the predicted field: lane limits, then drop back while full.
  function options(state, r, others) {
    const now = state.riders.filter((x) => !x.finished && x.id !== r.id);
    const out = [];
    for (const effort of Kiri.legalEfforts(state, r)) {
      for (const lane of [-1, 0, 1]) {
        const p = Kiri.previewOrder(state, r.id, { effort, lane });
        const allowed = Kiri.allowedLanes(r, now);
        let land = p.reach;
        let landLane = -1;
        for (; land > r.square; land--) {
          const taken = new Set(others.filter((o) => o.square === land).map((o) => o.lane));
          landLane = Kiri.pickLane(allowed, p.lane, taken);
          if (landLane >= 0) break;
        }
        if (landLane < 0) { land = r.square; landLane = r.lane; }
        const next = Kiri.positionAt(state.stage, land, landLane, others);
        out.push({ effort, lane, p, land, landLane, next });
      }
    }
    return out;
  }

  function score(kind, state, r, o, ctx) {
    const progress = o.land - r.square;
    const toFinish = state.stage.finish - r.square;
    const finishes = o.land >= state.stage.finish;
    const posValue = (1 - o.next.mult) * 3; // cover +1.2, death seat −1.8, lane 4 −2.1
    let s = posValue;
    if (o.p.cracked && !finishes) s -= 20;
    if (o.p.strain >= 8 && !finishes) s -= 2;
    if (finishes) s += 30 + o.effort;

    if (ctx.allIn) return s * 0.3 + progress * 3 - o.p.cost * 0.1;

    switch (kind) {
      case 'diesel':
        s += -Math.abs(o.effort - ctx.sustain) * 3 + progress * 0.2;
        break;
      case 'wheelsucker': {
        if (toFinish <= 15) { s += progress * 3 - o.p.cost * 0.1; break; }
        // Leave the pocket in time: on the rail with ~600 m to go, start looking for a way out.
        if (toFinish <= 26 && r.lane === 0 && o.landLane >= 1) s += 3;
        const gap = Math.max(0, ctx.median - o.land);
        s += posValue * 2 + progress * 0.9 - o.p.cost * 0.45 - gap * 0.9 - (o.effort > ctx.sustain + 1 ? 4 : 0);
        break;
      }
      case 'attacker': {
        const early = r.square < state.stage.finish * 0.6;
        const leads = o.land > ctx.front;
        // Aggressive early, but never so hard that the horse can't trot home.
        const overpace = Math.max(0, o.effort - ctx.sustain - 1) * 3;
        if (early && r.strain <= 5) s += progress * 1.2 - o.p.cost * 0.25 + (leads && o.landLane === 0 ? 4 : 0) - overpace;
        else s += -Math.abs(o.effort - Math.min(ctx.sustain, 5)) * 2 + (leads ? 1.5 : 0);
        break;
      }
      case 'planner':
        s += -turnsToFinish(state, r, o) * 4 + posValue - Math.abs(o.effort - ctx.sustain) * 1.5 - Math.max(0, o.p.strain - 6);
        break;
    }
    return s;
  }

  function chooseOrders(state, teamId, rand, difficulty) {
    const team = state.teams[teamId];
    const kind = PERSONALITIES[team.controller] ? team.controller : 'diesel';
    const d = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    const orders = {};
    for (const r of state.riders) {
      if (r.team !== teamId || r.finished) continue;
      const others = predictOthers(state, r);
      const legal = Kiri.legalEfforts(state, r);
      const top = legal[legal.length - 1];
      const ctx = {
        sustain: sustainableEffort(state, r),
        median: fieldMedian(others),
        front: others.reduce((m, o) => Math.max(m, o.square), -Infinity),
        allIn: canGoAllIn(state, r, top) && state.stage.finish - r.square <= d.allInRange,
      };
      // A lapse: misjudge the tempo, either overcooking it or dawdling.
      if (rand && d.lapse && !ctx.allIn && rand() < d.lapse) {
        const want = rand() < 0.5 ? ctx.sustain + 1 + Math.floor(rand() * 3) : ctx.sustain - 2 - Math.floor(rand() * 2);
        const effort = legal.reduce((b, e) => (Math.abs(e - want) < Math.abs(b - want) ? e : b), legal[0]);
        orders[r.id] = { effort, lane: 0 };
        continue;
      }
      let best = null;
      let bestScore = -Infinity;
      for (const o of options(state, r, others)) {
        const sc = score(kind, state, r, o, ctx) + (rand ? rand() * d.noise : 0);
        if (sc > bestScore) { bestScore = sc; best = o; }
      }
      orders[r.id] = { effort: best.effort, lane: best.lane };
    }
    return orders;
  }

  Object.assign(Kiri, { PERSONALITIES, DIFFICULTY, chooseOrders, sustainableEffort });
})(window.Kiri = window.Kiri || {});
