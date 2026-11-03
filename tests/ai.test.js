const ARCH = [['stayer', 'closer'], ['gate', 'stayer'], ['closer', 'gate'], ['stayer', 'gate']];

function aiRace(seed, stage, ctrls, difficulty) {
  const teams = ctrls.map((c, i) => ({ name: c, color: '#000', controller: c, archetypes: ARCH[(i + seed) % ARCH.length] }));
  let s = Kiri.createRace({ stage, teams, seed });
  const rand = Kiri.rng(seed * 31 + 7);
  const efforts = {};
  while (!s.over) {
    const o = {};
    s.teams.forEach((t) => Object.assign(o, Kiri.chooseOrders(s, t.id, rand, difficulty)));
    for (const id in o) {
      const team = s.teams[s.riders[id].team].controller;
      if (s.riders[id].square < s.stage.finish * 0.4) (efforts[team] = efforts[team] || []).push(o[id].effort);
    }
    s = Kiri.resolveTurn(s, o);
  }
  return { s, efforts };
}

describe('AI', () => {
  it('every personality returns legal orders for each of its horses', () => {
    const s = Kiri.createRace({
      stage: Kiri.PRESET_STAGES[1], seed: 4,
      teams: Object.keys(Kiri.PERSONALITIES).map((c) => ({ name: c, color: '#000', controller: c, archetypes: ['stayer', 'closer'] })),
    });
    s.teams.forEach((t) => {
      const o = Kiri.chooseOrders(s, t.id, Kiri.rng(1));
      expect(Object.keys(o).length).toBe(2);
      for (const id in o) expect(Kiri.legalEfforts(s, s.riders[id]).includes(o[id].effort)).toBe(true);
    });
  });

  it('Pocket sitter tucks in behind a horse rather than sitting outside it', () => {
    const st = makeStage('s'.repeat(80));
    const s = makeState(st, [rider({ square: 10, lane: 0, team: 1 }), rider({ square: 6, lane: 0, team: 0 })]);
    s.teams[0].controller = 'wheelsucker';
    s.log.push({ turn: 0, rider: 0, from: 5, to: 10 });
    const o = Kiri.chooseOrders(s, 0, null)[1];
    const p = Kiri.previewOrder(s, 1, o);
    expect(p.reach).toBe(14);
    expect(p.lane).toBe(0);
  });

  it('a turn of AI decisions for 12 horses takes under 100 ms', () => {
    const s = Kiri.createRace({
      stage: Kiri.PRESET_STAGES[1], seed: 2,
      teams: ['planner', 'planner', 'wheelsucker', 'attacker', 'diesel', 'planner'].map((c) => ({ name: c, color: '#000', controller: c, archetypes: ['stayer', 'closer'] })),
    });
    for (let i = 0; i < 3; i++) {
      const o = {};
      s.teams.forEach((t) => Object.assign(o, Kiri.chooseOrders(s, t.id, Kiri.rng(i))));
      Object.assign(s, Kiri.resolveTurn(s, o));
    }
    const t0 = performance.now();
    s.teams.forEach((t) => Kiri.chooseOrders(s, t.id, Kiri.rng(1)));
    expect(performance.now() - t0).toBeLessThan(100);
  });

  it('difficulty: a reference stable wins ≥1.5× as often against Easy as against Hard', () => {
    const N = 60;
    const refWins = (difficulty) => {
      let wins = 0;
      for (let seed = 1; seed <= N; seed++) {
        const rand = Kiri.rng(seed * 7 + 1);
        const pool = Kiri.DIFFICULTY[difficulty].pool;
        const teams = [{ name: 'ref', color: '#000', controller: 'planner', archetypes: ['stayer', 'closer'] }];
        for (let i = 0; i < 3; i++) teams.push({ name: 'ai' + i, color: '#000', controller: pool[(seed + i) % pool.length], archetypes: ['stayer', 'closer'] });
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
    report('Difficulty: reference stable wins out of ' + N + ' vs easy ' + easy + ', normal ' + normal + ', hard ' + hard);
    expect(easy).toBeGreaterThan(hard * 1.5);
  });

  it('100 all-AI races: within the cap, balanced, winners avoid the death seat (SC-002–004)', () => {
    const ctrls = ['diesel', 'wheelsucker', 'attacker', 'planner'];
    const wins = {};
    const early = {};
    let maxTurn = 0;
    let minTurn = Infinity;
    let turns = 0;
    let winnerDeath = 0;
    let winnerTurns = 0;
    let allDeath = 0;
    let allTurns = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const stage = seed % 4 === 0 ? Kiri.generateStage(seed) : Kiri.PRESET_STAGES[seed % 3];
      const { s, efforts } = aiRace(seed, stage, Kiri.rng(seed).shuffle(ctrls));
      expect(s.riders.every((r) => r.finished)).toBe(true);
      maxTurn = Math.max(maxTurn, s.turn - 1);
      minTurn = Math.min(minTurn, s.turn - 1);
      turns += s.turn - 1;
      const w = s.finishOrder[0];
      const wl = s.log.filter((e) => e.rider === w);
      winnerTurns += wl.length;
      winnerDeath += wl.filter((e) => e.position === 'deathSeat').length;
      allTurns += s.log.length;
      allDeath += s.log.filter((e) => e.position === 'deathSeat').length;
      const winner = s.teams[s.riders[w].team].controller;
      wins[winner] = (wins[winner] || 0) + 1;
      for (const k in efforts) early[k] = (early[k] || []).concat(efforts[k]);
    }
    const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
    const winnerShare = winnerDeath / winnerTurns;
    report('Balance over 100 races\nwins: ' + JSON.stringify(wins) + '\nearly avg speed: ' +
      ctrls.map((c) => Kiri.PERSONALITIES[c].name + ' ' + avg(early[c])).join(', ') +
      '\nturns avg ' + (turns / 100).toFixed(1) + ', min ' + minTurn + ', max ' + maxTurn +
      '\ndeath seat share: winners ' + (100 * winnerShare).toFixed(1) + '%, all horses ' + (100 * allDeath / allTurns).toFixed(1) + '%');
    for (const c of ctrls) expect(wins[c] || 0).toBeLessThan(51);
    expect(winnerShare).toBeLessThan(0.25);
    expect(turns / 100).toBeGreaterThan(14);
    expect(turns / 100).toBeLessThan(36);
  });
});
