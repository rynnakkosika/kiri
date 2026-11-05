// Race lifecycle (spec 003 rules 6–9): create, preview, resolve, standings.
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
    if (riders.length > C.FIELD_MAX) throw new Error('At most ' + C.FIELD_MAX + ' horses in a race');
    // Autostart: rows of four behind the start line, post positions drawn by seed.
    // Post 1 is the rail in the front row, 5–8 the second row, 9–12 the third.
    rand.shuffle(riders.map((r) => r.id)).forEach((id, i) => {
      riders[id].post = i + 1;
      riders[id].square = -1 - Math.floor(i / C.LANES);
      riders[id].lane = i % C.LANES;
    });
    return { stage, teams, riders, turn: 1, finishOrder: [], log: [], over: false };
  }

  function previewOrder(state, riderId, order) {
    const r = state.riders[riderId];
    const pos = Kiri.position(state, r);
    const cost = Kiri.energyCost(order.effort, pos);
    const st = Kiri.strainAfter(r, order.effort, pos);
    const requested = Kiri.requestedLane(r, order.lane);
    const spots = state.riders.filter((x) => !x.finished && x.id !== r.id);
    // A lane blocked by a horse alongside can't be taken this turn: the horse stays in its lane.
    const lane = Kiri.allowedLanes(r, spots).includes(requested) ? requested : r.lane;
    return {
      pos, cost, strain: st.strain, cracked: st.cracked, requested,
      reach: Kiri.pathReach(state.stage, r, order.effort, lane - r.lane, state.turn),
      lane, laneBlocked: lane !== requested,
      legal: Kiri.legalEfforts(state, r).includes(order.effort),
      kick: r.archetype === 'closer' && Kiri.budget(r, order.effort, state.stage, state.turn) > 2 * order.effort,
      gate: r.archetype === 'gate' && Kiri.budget(r, order.effort, state.stage, state.turn) > 2 * order.effort,
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
      if (!o) throw new Error('Missing order for horse ' + r.id);
      const p = previewOrder(state, r.id, o);
      if (!p.legal) throw new Error('Illegal speed ' + o.effort + ' for horse ' + r.id);
      pre[r.id] = Object.assign(p, { from: r.square, fromLane: r.lane, effort: o.effort });
    }

    const taken = new Map(); // square -> Set(lanes)
    const occupy = (sq, l) => { if (!taken.has(sq)) taken.set(sq, new Set()); taken.get(sq).add(l); };
    active.forEach((r) => occupy(r.square, r.lane));
    const startSpots = active.map((r) => ({ id: r.id, square: r.square, lane: r.lane }));

    const moves = [];
    resolutionOrder(active).forEach((r, idx) => {
      const p = pre[r.id];
      taken.get(r.square).delete(r.lane);
      const allowed = Kiri.allowedLanes(r, startSpots.filter((x) => x.id !== r.id));
      let sq = p.reach;
      let lane = -1;
      for (; sq >= r.square; sq--) {
        lane = Kiri.pickLane(allowed, p.lane, taken.get(sq) || new Set());
        if (lane >= 0) break;
      }
      if (lane < 0) { sq = r.square; lane = r.lane; }
      const blocked = sq < p.reach;
      const boxed = p.requested !== r.lane && lane === r.lane;
      r.square = sq;
      r.lane = lane;
      occupy(sq, lane);

      r.energy = Math.max(0, Math.min(r.maxEnergy, r.energy - p.cost));
      if (r.crack > 0) r.crack--;
      r.strain = p.strain;
      if (p.cracked) r.crack = C.CRACK_TURNS;
      moves.push({ r, p, idx, blocked, boxed });
    });

    const notes = {};
    const note = (id, t) => { (notes[id] = notes[id] || []).push(t); };
    const finishers = moves
      .filter((m) => m.p.from < s.stage.finish && m.r.square >= s.stage.finish)
      .sort((a, b) => b.r.square - a.r.square || a.idx - b.idx);
    for (const m of finishers) {
      s.finishOrder.push(m.r.id);
      m.r.finished = true;
      m.r.finishTurn = s.turn;
      m.r.finishPlace = s.finishOrder.length;
      const prize = C.PURSE[m.r.finishPlace - 1] || 0;
      m.r.points += prize;
      note(m.r.id, 'finishes #' + m.r.finishPlace + (prize ? ' +' + prize + ' €' : ''));
    }

    for (const m of moves) {
      if (m.p.pos.deathSeat) note(m.r.id, 'death seat');
      else if (m.p.pos.covered) note(m.r.id, 'in cover');
      if (m.p.pos.wide) note(m.r.id, 'wide in the curve');
      if (m.boxed) note(m.r.id, 'boxed in');
      else if (m.blocked) note(m.r.id, 'blocked');
      if (m.p.kick) note(m.r.id, 'kick');
      if (m.p.cracked) note(m.r.id, 'GALLOPS');
      s.log.push({
        turn: s.turn, rider: m.r.id, effort: m.p.effort, from: m.p.from, fromLane: m.p.fromLane, to: m.r.square,
        lane: m.r.lane, position: m.p.pos.kind, sheltered: m.p.pos.covered, cost: m.p.cost, strain: m.r.strain,
        cracked: m.p.cracked, notes: notes[m.r.id] || [],
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
