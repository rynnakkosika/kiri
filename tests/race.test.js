function quickSetup(n, seed) {
  const ctrls = ['human', 'diesel', 'wheelsucker', 'attacker', 'planner', 'diesel'];
  const teams = [];
  for (let i = 0; i < n; i++) teams.push({ name: 'T' + i, color: '#000', controller: ctrls[i], archetypes: ['stayer', 'closer'] });
  return { stage: Kiri.PRESET_STAGES[1], teams, seed: seed || 3 };
}

describe('Race setup', () => {
  it('autostart grid: rows of four behind the line', () => {
    const s = Kiri.createRace(quickSetup(6));
    expect(s.riders.length).toBe(12);
    expect(s.riders.every((r) => r.square < 0 && r.square >= -3)).toBe(true);
    expect(new Set(s.riders.map((r) => r.square + ':' + r.lane)).size).toBe(12);
  });
  it('energy matches horse type', () => {
    const s = Kiri.createRace(quickSetup(2));
    expect(s.riders[0].energy).toBe(125);
    expect(s.riders[1].energy).toBe(110);
  });
});

describe('Rule 6–7 — resolution, blocking and lanes', () => {
  const st = makeStage('s'.repeat(40));
  it('leader moves first; ties go to the inner lane, then number', () => {
    const s = makeState(st, [rider({ square: 2, lane: 2 }), rider({ square: 2, lane: 0 }), rider({ square: 5, lane: 1 })]);
    expect(Kiri.resolutionOrder(s.riders).map((r) => r.id)).toEqual([2, 1, 0]);
  });
  it('a full reachable segment pushes the horse back a segment', () => {
    const s = makeState(st, [rider({ square: 5, lane: 0 }), rider({ square: 5, lane: 1 }), rider({ square: 2, lane: 0 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 3 }, 1: { effort: 3 }, 2: { effort: 6 } });
    expect(n.riders[2].square).toBe(7);
    expect(n.riders[2].lane).toBe(0);
    expect(n.log.find((e) => e.rider === 2).notes.includes('blocked')).toBe(true);
  });
  it('lane change is limited to one lane', () => {
    const s = makeState(st, [rider({ square: 2, lane: 0 })]);
    expect(Kiri.resolveTurn(s, { 0: { effort: 3, lane: 1 } }).riders[0].lane).toBe(1);
  });
  it('boxed in: rail horse with horses ahead and outside cannot get out (US3-1)', () => {
    // Horse 2 sits on the rail behind 0, with 1 outside it. All move at the same speed.
    const s = makeState(st, [rider({ square: 6, lane: 0 }), rider({ square: 5, lane: 1 }), rider({ square: 5, lane: 0 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 4 }, 1: { effort: 4 }, 2: { effort: 5, lane: 1 } });
    expect(n.riders[2].lane).toBe(0);
    expect(n.riders[2].square).toBe(9);
    expect(n.log.find((e) => e.rider === 2).notes.includes('boxed in')).toBe(true);
  });
  it('moving inside onto a taken spot tucks in one segment back, in cover', () => {
    // Horse 0 trots onto (10, rail). Horse 1 asks for the rail and reaches 10 too.
    const s = makeState(st, [rider({ square: 9, lane: 0 }), rider({ square: 5, lane: 1 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 1 }, 1: { effort: 5, lane: -1 } });
    expect([n.riders[1].square, n.riders[1].lane]).toEqual([9, 0]);
  });
  it('moving inside never pushes the horse further out', () => {
    // (10, rail), (10, lane 2) and (9, rail) end up taken: horse 3 stays in lane 2 at 9.
    const s = makeState(st, [rider({ square: 9, lane: 0 }), rider({ square: 9, lane: 1 }), rider({ square: 8, lane: 0 }), rider({ square: 5, lane: 1 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 1 }, 1: { effort: 1 }, 2: { effort: 1 }, 3: { effort: 5, lane: -1 } });
    expect([n.riders[3].square, n.riders[3].lane]).toEqual([9, 1]);
  });
  it('a free outside lets the horse pull out', () => {
    const s = makeState(st, [rider({ square: 6, lane: 0 }), rider({ square: 5, lane: 0 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 4 }, 1: { effort: 6, lane: 1 } });
    expect(n.riders[1].lane).toBe(1);
    expect(n.riders[1].square).toBe(11);
  });
  it('energy, strain and gallop are applied (US3-2)', () => {
    const s = makeState(st, [rider({ square: 0, strain: 7, energy: 50 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 8 } });
    expect(n.riders[0].energy).toBe(38);
    expect(n.riders[0].strain).toBe(5);
    expect(n.riders[0].crack).toBe(2);
    expect(n.log[0].notes.includes('GALLOPS')).toBe(true);
    const n2 = Kiri.resolveTurn(n, { 0: { effort: 3 } });
    expect(n2.riders[0].crack).toBe(1);
    expect(Kiri.resolveTurn(n2, { 0: { effort: 3 } }).riders[0].crack).toBe(0);
  });
  it('death seat is logged and costs ×1.6', () => {
    const s = makeState(st, [rider({ square: 4, lane: 1, energy: 50 }), rider({ square: 4, lane: 0 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 6 }, 1: { effort: 6 } });
    expect(n.riders[0].energy).toBe(39);
    expect(n.log.find((e) => e.rider === 0).notes.includes('death seat')).toBe(true);
  });
  it('illegal orders are rejected', () => {
    const s = makeState(st, [rider({ square: 0, energy: 2 })]);
    expect(() => Kiri.resolveTurn(s, { 0: { effort: 9 } })).toThrow();
    expect(() => Kiri.resolveTurn(s, {})).toThrow();
  });
  it('state is not mutated', () => {
    const s = makeState(st, [rider({ square: 0 })]);
    const before = JSON.stringify(s);
    Kiri.resolveTurn(s, { 0: { effort: 5 } });
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('Rule 8 — prize money', () => {
  const st = makeStage('s'.repeat(20));
  it('finishers ordered by distance past the line; purse 10 000 / 5 000 …', () => {
    const s = makeState(st, [rider({ square: 17, lane: 0 }), rider({ square: 16, lane: 1 }), rider({ square: 10, lane: 0 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 3 }, 1: { effort: 6 }, 2: { effort: 1 } });
    expect(n.finishOrder).toEqual([1, 0]);
    expect(n.riders[1].points).toBe(10000);
    expect(n.riders[0].points).toBe(5000);
  });
  it('finished horses stop and stop blocking', () => {
    const s = makeState(st, [rider({ square: 19, lane: 0 }), rider({ square: 15, lane: 0 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 1 }, 1: { effort: 1 } });
    expect(n.riders[0].finished).toBe(true);
    expect(Kiri.resolveTurn(n, { 1: { effort: 5 } }).riders[1].finished).toBe(true);
  });
});

describe('Rule 9 — race end', () => {
  it('ends when everyone has finished', () => {
    const s = makeState(makeStage('ssssss'), [rider({ square: 0 })]);
    expect(Kiri.resolveTurn(s, { 0: { effort: 9 } }).over).toBe(true);
  });
  it('turn cap places the rest by position with no prize money', () => {
    let s = makeState(makeStage('s'.repeat(200)), [rider({ square: 0, lane: 0 }), rider({ square: 1, lane: 1 })]);
    s.turn = 1;
    for (let t = 0; t < Kiri.C.TURN_CAP; t++) s = Kiri.resolveTurn(s, { 0: { effort: 1 }, 1: { effort: 1 } });
    expect(s.over).toBe(true);
    expect(s.finishOrder).toEqual([1, 0]);
    expect(s.riders[1].points).toBe(0);
    expect(s.riders[1].capped).toBe(true);
  });
  it('standings sum stable earnings', () => {
    const s = makeState(makeStage('ssssssss'), [rider({ square: 0, team: 0 }), rider({ square: 0, lane: 1, team: 1 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 9 }, 1: { effort: 5 } });
    const sd = Kiri.standings(n);
    expect(sd.riders[0].id).toBe(0);
    expect(sd.teams[0].points).toBe(10000);
  });
});

describe('Previews', () => {
  const st = makeStage('s'.repeat(20));
  it('preview reach matches resolution when unblocked', () => {
    const s = makeState(st, [rider({ square: 3 })]);
    const p = Kiri.previewOrder(s, 0, { effort: 6 });
    expect(Kiri.resolveTurn(s, { 0: { effort: 6 } }).riders[0].square).toBe(p.reach);
  });
  it('preview shows the position and its cost', () => {
    const s = makeState(st, [rider({ square: 4, lane: 1 }), rider({ square: 4, lane: 0 })]);
    const p = Kiri.previewOrder(s, 0, { effort: 6 });
    expect(p.pos.kind).toBe('deathSeat');
    expect(p.cost).toBe(11);
    expect(p.strain).toBe(2);
  });
});

describe('Determinism', () => {
  it('same seed and orders → same race', () => {
    const play = () => {
      let s = Kiri.createRace(quickSetup(4, 99));
      const rand = Kiri.rng(5);
      while (!s.over) {
        const o = {};
        s.teams.forEach((t) => Object.assign(o, Kiri.chooseOrders(s, t.id, rand)));
        s = Kiri.resolveTurn(s, o);
      }
      return JSON.stringify(s);
    };
    expect(play()).toBe(play());
  });
});

describe('Series', () => {
  it('earnings add up over three races', () => {
    let tour = Kiri.createTour(1);
    const sums = {};
    let race;
    while (!Kiri.tourOver(tour)) {
      const setup = quickSetup(3, 10 + tour.index);
      setup.stage = tour.stages[tour.index];
      race = Kiri.createRace(setup);
      const rand = Kiri.rng(tour.index + 1);
      while (!race.over) {
        const o = {};
        race.teams.forEach((t) => Object.assign(o, Kiri.chooseOrders(race, t.id, rand)));
        race = Kiri.resolveTurn(race, o);
      }
      race.riders.forEach((r) => { sums[r.id] = (sums[r.id] || 0) + r.points; });
      tour = Kiri.recordStage(tour, race);
    }
    expect(tour.totals).toEqual(sums);
  });
});
