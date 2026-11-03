// AI personalities. Each scores every (effort, lane) option for each rider and picks the best.
(function (Kiri) {
  'use strict';
  const C = Kiri.C;

  const PERSONALITIES = {
    diesel: { name: 'Diesel', blurb: 'Rides a steady, sustainable tempo.' },
    wheelsucker: { name: 'Wheelsucker', blurb: 'Hides in shelter, then launches late.' },
    attacker: { name: 'Attacker', blurb: 'Attacks early and hunts the sprint line.' },
    planner: { name: 'Planner', blurb: 'Weighs every square against the energy left.' },
  };

  // Difficulty changes only how bots decide (score noise, personality mix), never the rules.
  const DIFFICULTY = {
    easy: { name: 'Easy', noise: 3, lapse: 0.35, allInRange: 10, pool: ['diesel', 'wheelsucker', 'attacker'] },
    normal: { name: 'Normal', noise: 0.6, lapse: 0, allInRange: 30, pool: ['diesel', 'wheelsucker', 'attacker', 'planner'] },
    hard: { name: 'Hard', noise: 0, lapse: 0, allInRange: 40, pool: ['planner', 'planner', 'attacker', 'wheelsucker', 'planner'] },
  };

  // Guess where every other rider ends up: same distance as their last move.
  function predictOthers(state, me) {
    const last = {};
    for (const e of state.log) last[e.rider] = e.to - e.from;
    return state.riders
      .filter((r) => !r.finished && r.id !== me.id)
      .map((r) => ({ square: r.square + (last[r.id] !== undefined ? last[r.id] : 4), lane: r.lane }));
  }

  // Highest effort whose cost, paid every turn to the line, fits the energy left.
  function sustainAt(h, energy) {
    let best = 1;
    for (let e = 1; e <= C.MAX_EFFORT; e++) {
      if (C.EFFORT_COST[e] * Math.ceil(h / (2 * e)) <= energy * 1.15) best = e;
    }
    return best;
  }

  function sustainableEffort(state, r) {
    return sustainAt(Kiri.halfStepsToFinish(state.stage, r.archetype, r.square), r.energy);
  }

  // Planner's estimate of turns to the line if it takes this option, then rides at a sustainable tempo.
  function turnsToFinish(state, r, o) {
    const h = Kiri.halfStepsToFinish(state.stage, r.archetype, o.p.reach);
    if (h <= 0) return 0;
    const energy = Math.max(0, r.energy - o.p.cost + o.p.recovery);
    return 1 + h / (2 * sustainAt(h, energy));
  }

  // Where the bulk of the field will be: the median predicted square of riders still racing.
  function fieldMedian(others) {
    if (!others.length) return 0;
    const sq = others.map((o) => o.square).sort((a, b) => a - b);
    return sq[Math.floor(sq.length / 2)];
  }

  function canGoAllIn(state, r, e) {
    const h = Kiri.halfStepsToFinish(state.stage, r.archetype, r.square);
    return C.EFFORT_COST[e] * Math.ceil(h / (2 * e)) <= r.energy;
  }

  function options(state, r, others) {
    const out = [];
    for (const effort of Kiri.legalEfforts(state, r)) {
      const p = Kiri.previewOrder(state, r.id, { effort });
      for (const lane of [-1, 0, 1]) {
        const w = Kiri.squareAt(state.stage, p.reach).width;
        const taken = new Set(others.filter((o) => o.square === p.reach).map((o) => o.lane));
        let landLane = Kiri.pickLane(w, r.lane + lane, taken);
        if (landLane < 0) landLane = Math.min(w - 1, Math.max(0, r.lane + lane));
        const shelterNext = Kiri.shelteredAt(state.stage, state.wind, p.reach, landLane, others);
        out.push({ effort, lane, p, shelterNext, landLane });
      }
    }
    return out;
  }

  function score(kind, state, r, o, ctx) {
    const progress = o.p.reach - r.square;
    const toFinish = state.stage.finish - r.square;
    const finishes = o.p.reach >= state.stage.finish;
    const sprintOpen = state.sprintDone.length < C.SPRINT_POINTS.length && r.square < state.stage.sprint && o.p.reach >= state.stage.sprint;
    let s = 0;
    if (o.p.cracked && !finishes) s -= 20;
    if (o.p.strain >= 8 && !finishes) s -= 2;
    if (o.shelterNext) s += 1.5;
    if (finishes) s += 30 + o.effort;

    if (ctx.allIn) return s + progress * 3 - o.p.cost * 0.1;

    switch (kind) {
      case 'diesel':
        s += -Math.abs(o.effort - ctx.sustain) * 3 + progress * 0.2;
        break;
      case 'wheelsucker': {
        if (toFinish <= 15) { s += progress * 3 - o.p.cost * 0.1; break; }
        const gap = Math.max(0, ctx.median - o.p.reach);
        s += (o.shelterNext ? 5 : 0) + progress * 0.9 - o.p.cost * 0.45 - gap * 0.9 - (o.effort > ctx.sustain + 1 ? 4 : 0);
        break;
      }
      case 'attacker': {
        const early = r.square < state.stage.finish * 0.6;
        if (early && r.strain <= 5) s += progress * 1.2 - o.p.cost * 0.25;
        else s += -Math.abs(o.effort - Math.min(ctx.sustain, 4)) * 2;
        if (sprintOpen) s += 6;
        break;
      }
      case 'planner':
        s += -turnsToFinish(state, r, o) * 4 + (sprintOpen ? 3 : 0) - Math.max(0, o.p.strain - 6);
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
