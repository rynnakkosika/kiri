function aiRace(seed, stage, ctrls) {
  const arch = [['rouleur', 'sprinter'], ['climber', 'rouleur'], ['sprinter', 'climber'], ['rouleur', 'climber']];
  const teams = ctrls.map((c, i) => ({ name: c, color: '#000', controller: c, archetypes: arch[(i + seed) % arch.length] }));
  let s = Kiri.createRace({ stage, teams, seed });
  const rand = Kiri.rng(seed * 31 + 7);
  const efforts = {};
  while (!s.over) {
    const o = {};
    s.teams.forEach((t) => Object.assign(o, Kiri.chooseOrders(s, t.id, rand)));
    for (const id in o) {
      const team = s.teams[s.riders[id].team].controller;
      if (s.riders[id].square < s.stage.finish * 0.4) (efforts[team] = efforts[team] || []).push(o[id].effort);
    }
    s = Kiri.resolveTurn(s, o);
  }
  return { s, efforts };
}

describe('AI (US4)', () => {
  it('every personality returns legal orders for each of its riders', () => {
    const s = Kiri.createRace({
      stage: Kiri.PRESET_STAGES[1], seed: 4,
      teams: Object.keys(Kiri.PERSONALITIES).map((c) => ({ name: c, color: '#000', controller: c, archetypes: ['climber', 'rouleur'] })),
    });
    s.teams.forEach((t) => {
      const o = Kiri.chooseOrders(s, t.id, Kiri.rng(1));
      expect(Object.keys(o).length).toBe(2);
      for (const id in o) expect(Kiri.legalEfforts(s, s.riders[id]).includes(o[id].effort)).toBe(true);
    });
  });

  it('Wheelsucker picks a landing in shelter when one is available', () => {
    const st = makeStage('f'.repeat(60), { sprint: 50 });
    const s = makeState(st, [rider({ square: 10, lane: 1, team: 1 }), rider({ square: 6, lane: 1, team: 0 })], 'head');
    s.teams[0].controller = 'wheelsucker';
    // Leader last moved 5; it should land on 15, so the shelter square is 14.
    s.log.push({ turn: 0, rider: 0, from: 5, to: 10 });
    const o = Kiri.chooseOrders(s, 0, null)[1];
    const p = Kiri.previewOrder(s, 1, o);
    expect(p.reach).toBe(14);
  });

  it('a mid-race turn of AI decisions for 12 riders takes under 100 ms (SC-003)', () => {
    const s = Kiri.createRace({
      stage: Kiri.PRESET_STAGES[0], seed: 2,
      teams: ['planner', 'planner', 'wheelsucker', 'attacker', 'diesel', 'planner'].map((c) => ({ name: c, color: '#000', controller: c, archetypes: ['rouleur', 'sprinter'] })),
    });
    const t0 = performance.now();
    s.teams.forEach((t) => Kiri.chooseOrders(s, t.id, Kiri.rng(1)));
    expect(performance.now() - t0).toBeLessThan(100);
  });

  it('difficulty: a reference team wins ≥1.5× as often against Easy fields as against Hard (002 SC-001)', () => {
    const N = 60;
    const refWins = (difficulty) => {
      let wins = 0;
      for (let seed = 1; seed <= N; seed++) {
        const rand = Kiri.rng(seed * 7 + 1);
        const pool = Kiri.DIFFICULTY[difficulty].pool;
        const teams = [{ name: 'ref', color: '#000', controller: 'planner', archetypes: ['rouleur', 'sprinter'] }];
        for (let i = 0; i < 3; i++) teams.push({ name: 'ai' + i, color: '#000', controller: pool[(seed + i) % pool.length], archetypes: ['rouleur', 'sprinter'] });
        let s = Kiri.createRace({ stage: Kiri.PRESET_STAGES[seed % 3], teams, seed });
        while (!s.over) {
          const o = {};
          s.teams.forEach((t) => Object.assign(o, Kiri.chooseOrders(s, t.id, rand, t.id === 0 ? 'normal' : difficulty)));
          s = Kiri.resolveTurn(s, o);
        }
        if (s.riders[s.finishOrder[0]].team === 0) wins++;
      }
      return wins;
    };
    const easy = refWins('easy');
    const normal = refWins('normal');
    const hard = refWins('hard');
    report('Difficulty: reference team stage wins out of ' + N + ' vs easy ' + easy + ', normal ' + normal + ', hard ' + hard);
    expect(easy).toBeGreaterThan(hard * 1.5);
  });

  it('100 all-AI races finish within the cap; balance and personality report (SC-004)', () => {
    const ctrls = ['diesel', 'wheelsucker', 'attacker', 'planner'];
    const wins = {};
    const early = {};
    let maxTurn = 0;
    let turns = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const stage = seed % 4 === 0 ? Kiri.generateStage(seed) : Kiri.PRESET_STAGES[seed % 3];
      const order = Kiri.rng(seed).shuffle(ctrls);
      const { s, efforts } = aiRace(seed, stage, order);
      expect(s.riders.every((r) => r.finished)).toBe(true);
      maxTurn = Math.max(maxTurn, s.turn - 1);
      turns += s.turn - 1;
      const winner = s.teams[s.riders[s.finishOrder[0]].team].controller;
      wins[winner] = (wins[winner] || 0) + 1;
      for (const k in efforts) early[k] = (early[k] || []).concat(efforts[k]);
    }
    const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
    report('Balance over 100 races\nwins: ' + JSON.stringify(wins) + '\nearly avg effort: ' +
      ctrls.map((c) => c + ' ' + avg(early[c])).join(', ') + '\navg turns ' + (turns / 100).toFixed(1) + ', max ' + maxTurn);
    for (const c of ctrls) expect(wins[c] || 0).toBeLessThan(51);
    expect(Number(avg(early.attacker))).toBeGreaterThan(Number(avg(early.diesel)));
  });
});
