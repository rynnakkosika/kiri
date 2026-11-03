// Race lifecycle (spec rules 7–9): create, preview, resolve, standings.
(function (Kiri) {
  'use strict';
  const C = Kiri.C;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function createRace(setup) {
    const rand = Kiri.rng(setup.seed || 1);
    const stage = setup.stage;
    const teams = setup.teams.map((t, i) => ({
      id: i, name: t.name, color: t.color, controller: t.controller,
    }));
    const riders = [];
    setup.teams.forEach((t, ti) => {
      t.archetypes.forEach((a, ai) => {
        riders.push({
          id: riders.length, team: ti, archetype: a, name: (t.riderNames && t.riderNames[ai]) || null,
          square: 0, lane: 0,
          energy: C.ARCHETYPES[a].energy, maxEnergy: C.ARCHETYPES[a].energy,
          strain: 0, crack: 0, finished: false, finishTurn: null, finishPlace: null, capped: false, points: 0,
        });
      });
    });
    // Start grid: three abreast behind the line, in seeded random order.
    rand.shuffle(riders.map((r) => r.id)).forEach((id, i) => {
      riders[id].square = -1 - Math.floor(i / 3);
      riders[id].lane = i % 3;
    });
    return {
      stage, wind: setup.wind || stage.wind, teams, riders,
      turn: 1, sprintDone: [], finishOrder: [], log: [], over: false,
    };
  }

  function previewOrder(state, riderId, order) {
    const r = state.riders[riderId];
    const sheltered = Kiri.isSheltered(state, r);
    const cost = Kiri.energyCost(order.effort, sheltered, state.wind);
    const st = Kiri.strainAfter(r, order.effort, sheltered);
    const recovery = Kiri.squareAt(state.stage, r.square).terrain === 'descent' && order.effort <= C.DESCENT_RECOVERY_MAX_EFFORT
      ? C.DESCENT_RECOVERY : 0;
    return {
      cost, recovery, sheltered, strain: st.strain, cracked: st.cracked,
      reach: Kiri.pathReach(state.stage, r, order.effort),
      legal: Kiri.legalEfforts(state, r).includes(order.effort),
      kick: Kiri.budget(r, order.effort, state.stage) > 2 * order.effort,
    };
  }

  function resolutionOrder(riders) {
    return riders.slice().sort((a, b) => b.square - a.square || a.lane - b.lane || a.id - b.id);
  }

  function resolveTurn(state, orders) {
    if (state.over) throw new Error('Race is over');
    const s = clone(state);
    const active = s.riders.filter((r) => !r.finished);
    // Everything that depends on the start-of-turn board is fixed first.
    const pre = {};
    for (const r of active) {
      const o = orders[r.id];
      if (!o) throw new Error('Missing order for rider ' + r.id);
      const p = previewOrder(state, r.id, o);
      if (!p.legal) throw new Error('Illegal effort ' + o.effort + ' for rider ' + r.id);
      pre[r.id] = Object.assign(p, { from: r.square, fromLane: r.lane, lanePref: o.lane || 0, effort: o.effort });
    }

    const taken = new Map(); // square -> Set(lanes)
    const occupy = (sq, l) => { if (!taken.has(sq)) taken.set(sq, new Set()); taken.get(sq).add(l); };
    active.forEach((r) => occupy(r.square, r.lane));

    const order = resolutionOrder(active);
    const moves = [];
    order.forEach((r, idx) => {
      const p = pre[r.id];
      taken.get(r.square).delete(r.lane);
      let sq = p.reach;
      let lane = -1;
      for (; sq >= r.square; sq--) {
        const w = Kiri.squareAt(s.stage, sq).width;
        lane = Kiri.pickLane(w, r.lane + p.lanePref, taken.get(sq) || new Set());
        if (lane >= 0) break;
      }
      if (lane < 0) { sq = r.square; lane = r.lane; }
      const blocked = sq < p.reach;
      r.square = sq;
      r.lane = lane;
      occupy(sq, lane);

      r.energy = Math.max(0, Math.min(r.maxEnergy, r.energy - p.cost + p.recovery));
      if (r.crack > 0) r.crack--;
      r.strain = p.strain;
      if (p.cracked) r.crack = C.CRACK_TURNS;
      moves.push({ r, p, idx, blocked });
    });

    // Line crossings, furthest first, then resolution order.
    const byLine = (line) => moves
      .filter((m) => m.p.from < line && m.r.square >= line)
      .sort((a, b) => b.r.square - a.r.square || a.idx - b.idx);

    const notes = {};
    const note = (id, t) => { (notes[id] = notes[id] || []).push(t); };
    for (const m of byLine(s.stage.sprint)) {
      const slot = s.sprintDone.length;
      s.sprintDone.push(m.r.id);
      if (slot < C.SPRINT_POINTS.length) {
        m.r.points += C.SPRINT_POINTS[slot];
        note(m.r.id, 'sprint +' + C.SPRINT_POINTS[slot]);
      }
    }
    for (const m of byLine(s.stage.finish)) {
      s.finishOrder.push(m.r.id);
      m.r.finished = true;
      m.r.finishTurn = s.turn;
      m.r.finishPlace = s.finishOrder.length;
      const pts = C.FINISH_POINTS[m.r.finishPlace - 1] || 0;
      m.r.points += pts;
      note(m.r.id, 'finishes #' + m.r.finishPlace + (pts ? ' +' + pts : ''));
    }

    for (const m of moves) {
      if (m.blocked) note(m.r.id, 'blocked');
      if (m.p.kick) note(m.r.id, 'kick');
      if (m.p.recovery) note(m.r.id, 'recovers ' + m.p.recovery);
      if (m.p.cracked) note(m.r.id, 'CRACKS');
      s.log.push({
        turn: s.turn, rider: m.r.id, effort: m.p.effort, from: m.p.from, fromLane: m.p.fromLane, to: m.r.square,
        lane: m.r.lane, sheltered: m.p.sheltered, cost: m.p.cost, strain: m.r.strain, cracked: m.p.cracked,
        notes: notes[m.r.id] || [],
      });
    }

    s.turn++;
    if (s.riders.every((r) => r.finished)) s.over = true;
    else if (s.turn > C.TURN_CAP) {
      s.over = true;
      resolutionOrder(s.riders.filter((r) => !r.finished)).forEach((r) => {
        r.capped = true;
        r.finishPlace = s.finishOrder.length + 1;
        s.finishOrder.push(r.id);
      });
    }
    return s;
  }

  function isOver(state) { return state.over; }

  function standings(state) {
    const riders = resolutionOrder(state.riders).sort((a, b) => {
      const pa = a.finishPlace || Infinity;
      const pb = b.finishPlace || Infinity;
      return pa - pb;
    }).map((r, i) => ({ id: r.id, place: i + 1, points: r.points, finished: r.finished }));
    const teams = state.teams.map((t) => ({
      id: t.id,
      points: state.riders.filter((r) => r.team === t.id).reduce((n, r) => n + r.points, 0),
    })).sort((a, b) => b.points - a.points || a.id - b.id);
    return { riders, teams };
  }

  Object.assign(Kiri, { createRace, previewOrder, resolveTurn, resolutionOrder, standings, isOver, clone });
})(window.Kiri = window.Kiri || {});
