function quickSetup(n, seed) {
  const ctrls = ['human', 'diesel', 'wheelsucker', 'attacker', 'planner', 'diesel'];
  const teams = [];
  for (let i = 0; i < n; i++) teams.push({ name: 'T' + i, color: '#000', controller: ctrls[i], archetypes: ['rouleur', 'sprinter'] });
  return { stage: Kiri.PRESET_STAGES[0], teams, seed: seed || 3 };
}

describe('Race setup', () => {
  it('places every rider on the start grid, three abreast', () => {
    const s = Kiri.createRace(quickSetup(6));
    expect(s.riders.length).toBe(12);
    expect(s.riders.every((r) => r.square < 0)).toBe(true);
    const spots = new Set(s.riders.map((r) => r.square + ':' + r.lane));
    expect(spots.size).toBe(12);
  });
  it('energy matches archetype', () => {
    const s = Kiri.createRace(quickSetup(2));
    expect(s.riders[0].energy).toBe(110);
    expect(s.riders[1].energy).toBe(95);
  });
});

describe('Rule 7 — resolution order, blocking and lanes', () => {
  const st = makeStage('ffffffffffffffffffffffffffffff');
  it('leader moves first; ties go to lower lane, then id', () => {
    const s = makeState(st, [rider({ square: 2, lane: 2 }), rider({ square: 2, lane: 0 }), rider({ square: 5, lane: 1 })]);
    expect(Kiri.resolutionOrder(s.riders).map((r) => r.id)).toEqual([2, 1, 0]);
  });
  it('a full square pushes the rider back to the previous square', () => {
    const s = makeState(st, [rider({ square: 5, lane: 0 }), rider({ square: 5, lane: 1 }), rider({ square: 5, lane: 2 }), rider({ square: 2, lane: 1 })]);
    const o = allOrders(s, 3);
    o[3] = { effort: 6, lane: 0 };
    const n = Kiri.resolveTurn(s, o);
    expect(n.riders[3].square).toBe(7);
    expect(n.log.find((e) => e.rider === 3).notes.includes('blocked')).toBe(true);
  });
  it('takes the free lane nearest the preference, lower lane on a tie', () => {
    const s = makeState(st, [rider({ square: 6, lane: 1 }), rider({ square: 2, lane: 1 })]);
    const o = { 0: { effort: 1, lane: 0 }, 1: { effort: 5, lane: 0 } };
    const n = Kiri.resolveTurn(s, o);
    expect(n.riders[0].square).toBe(7);
    expect(n.riders[1].square).toBe(7);
    expect(n.riders[1].lane).toBe(0);
  });
  it('lane preference right moves one lane right', () => {
    const s = makeState(st, [rider({ square: 2, lane: 1 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 3, lane: 1 } });
    expect(n.riders[0].lane).toBe(2);
  });
  it('narrowing road clamps the lane', () => {
    const st2 = makeStage('fffffkkkkkkffff');
    const s = makeState(st2, [rider({ square: 2, lane: 2, archetype: 'rouleur' })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 3, lane: 0 } });
    expect(n.riders[0].square).toBe(5);
    expect(n.riders[0].lane).toBe(1);
  });
  it('fully boxed in: stays on its own square', () => {
    const st2 = makeStage('ffffkkkkffff');
    const s = makeState(st2, [rider({ square: 3, lane: 0 }), rider({ square: 3, lane: 1 }), rider({ square: 3, lane: 2 })]);
    const n = Kiri.resolveTurn(s, allOrders(s, 1));
    expect(n.riders.map((r) => r.square)).toEqual([4, 4, 3]);
    expect(n.riders[2].lane).toBe(2);
  });
  it('energy, strain and crack are applied', () => {
    const s = makeState(st, [rider({ square: 0, strain: 7, energy: 50 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 8 } });
    expect(n.riders[0].energy).toBe(38);
    expect(n.riders[0].strain).toBe(6);
    expect(n.riders[0].crack).toBe(2);
    const n2 = Kiri.resolveTurn(n, { 0: { effort: 3 } });
    expect(n2.riders[0].crack).toBe(1);
    const n3 = Kiri.resolveTurn(n2, { 0: { effort: 3 } });
    expect(n3.riders[0].crack).toBe(0);
  });
  it('descent recovery at effort ≤ 4', () => {
    const st3 = makeStage('fddddddddfffffff');
    const s = makeState(st3, [rider({ square: 1, energy: 50 })]);
    expect(Kiri.resolveTurn(s, { 0: { effort: 4 } }).riders[0].energy).toBe(49);
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

describe('Rule 8 — sprint and finish points', () => {
  const st = makeStage('ffffffffffffffffffff', { sprint: 5 });
  it('first three over the sprint line score 5/3/1, furthest first', () => {
    const s = makeState(st, [rider({ square: 1, lane: 0 }), rider({ square: 1, lane: 1 }), rider({ square: 1, lane: 2 }), rider({ square: 0, lane: 0 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 6 }, 1: { effort: 5 }, 2: { effort: 4 }, 3: { effort: 6 } });
    expect(n.riders.map((r) => r.points)).toEqual([5, 3, 0, 1]);
  });
  it('finishers ordered by distance past the line; points 15/12/…', () => {
    const s = makeState(st, [rider({ square: 17, lane: 0 }), rider({ square: 16, lane: 0 }), rider({ square: 10, lane: 0 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 3 }, 1: { effort: 6 }, 2: { effort: 1 } });
    expect(n.finishOrder).toEqual([1, 0]);
    expect(n.riders[1].points).toBe(15);
    expect(n.riders[0].points).toBe(12);
    expect(n.riders[0].finished).toBe(true);
  });
  it('finished riders stop taking turns and stop blocking', () => {
    const s = makeState(st, [rider({ square: 19, lane: 0 }), rider({ square: 15, lane: 0 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 1 }, 1: { effort: 1 } });
    expect(n.riders[0].finished).toBe(true);
    const n2 = Kiri.resolveTurn(n, { 1: { effort: 5 } });
    expect(n2.riders[1].finished).toBe(true);
  });
});

describe('Rule 9 — race end', () => {
  it('ends when everyone has finished', () => {
    const st = makeStage('ffffff', { sprint: 2 });
    const s = makeState(st, [rider({ square: 0 })]);
    expect(Kiri.resolveTurn(s, { 0: { effort: 9 } }).over).toBe(true);
  });
  it('turn cap ranks the rest by position with no finish points', () => {
    const st = makeStage('f'.repeat(200), { sprint: 150 });
    let s = makeState(st, [rider({ square: 0, lane: 0 }), rider({ square: 1, lane: 1 })]);
    for (let t = 0; t < Kiri.C.TURN_CAP; t++) s = Kiri.resolveTurn(s, { 0: { effort: 1 }, 1: { effort: 1 } });
    expect(s.over).toBe(true);
    expect(s.finishOrder).toEqual([1, 0]);
    expect(s.riders[1].points).toBe(0);
    expect(s.riders[1].capped).toBe(true);
  });
  it('standings sum team points', () => {
    const st = makeStage('ffffffff', { sprint: 2 });
    const s = makeState(st, [rider({ square: 0, team: 0 }), rider({ square: 0, lane: 1, team: 1 })]);
    const n = Kiri.resolveTurn(s, { 0: { effort: 9 }, 1: { effort: 5 } });
    const sd = Kiri.standings(n);
    expect(sd.riders[0].id).toBe(0);
    expect(sd.teams[0].id).toBe(0);
    expect(sd.teams[0].points).toBe(15 + 5);
  });
});

describe('Previews (US2)', () => {
  const st = makeStage('ffffffffffffffffffff');
  it('sheltered headwind effort 8 previews cost 6', () => {
    const s = makeState(st, [rider({ square: 3 }), rider({ square: 4 })], 'head');
    const p = Kiri.previewOrder(s, 0, { effort: 8 });
    expect(p.cost).toBe(6);
    expect(p.sheltered).toBe(true);
  });
  it('strain 7 effort 8 previews a crack', () => {
    const s = makeState(st, [rider({ square: 3, strain: 7 })]);
    expect(Kiri.previewOrder(s, 0, { effort: 8 }).cracked).toBe(true);
  });
  it('preview reach matches resolution when unblocked', () => {
    const s = makeState(st, [rider({ square: 3 })]);
    const p = Kiri.previewOrder(s, 0, { effort: 6 });
    expect(Kiri.resolveTurn(s, { 0: { effort: 6 } }).riders[0].square).toBe(p.reach);
  });
});

describe('Determinism (FR-011)', () => {
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

describe('Tour (US5)', () => {
  it('totals add up over three stages', () => {
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
    expect(tour.index).toBe(3);
    expect(tour.totals).toEqual(sums);
    const ts = Kiri.tourStandings(tour, race);
    expect(ts.riders[0].points).toBe(Math.max.apply(null, Object.values(sums)));
  });
});
