function onlineSetup(seed, aiCount) {
  const ctrls = ['planner', 'wheelsucker', 'attacker', 'diesel'];
  const teams = [
    { name: 'Host', color: '#e4572e', controller: 'human', archetypes: ['stayer', 'closer'] },
    { name: 'Guest', color: '#d6336c', controller: 'human', archetypes: ['gate', 'stayer'] },
  ];
  for (let i = 0; i < aiCount; i++) teams.push({ name: 'AI' + i, color: '#000', controller: ctrls[i], archetypes: ['closer', 'gate'] });
  return { stage: Kiri.PRESET_STAGES[seed % 3], teams, seed, difficulty: 'normal' };
}

// Each player's browser picks orders with the AI as a stand-in for a human.
function playerOrders(race, team, rand) {
  const t = Kiri.clone(race);
  t.teams[team].controller = 'diesel';
  return Kiri.chooseOrders(t, team, rand);
}

describe('Online protocol (004)', () => {
  it('waits for both stables before resolving', () => {
    const h = new Kiri.OnlineHost(onlineSetup(1, 2));
    const r1 = h.submit(0, 1, playerOrders(h.race, 0, Kiri.rng(1)));
    expect(r1.accepted).toBe(true);
    expect(r1.resolved).toBe(false);
    expect(h.readyStatus()).toEqual({ 0: true, 1: false });
    const r2 = h.submit(1, 1, playerOrders(h.race, 1, Kiri.rng(2)));
    expect(r2.resolved).toBe(true);
    expect(h.race.turn).toBe(2);
    expect(h.readyStatus()).toEqual({ 0: false, 1: false });
  });

  it('ignores orders for other turns and double submits', () => {
    const h = new Kiri.OnlineHost(onlineSetup(2, 1));
    expect(h.submit(1, 5, {}).accepted).toBe(false);
    expect(h.submit(1, 1, {}).accepted).toBe(true);
    expect(h.submit(1, 1, {}).accepted).toBe(false);
    expect(h.submit(3, 1, {}).accepted).toBe(false);
  });

  it('drops orders for horses the sender does not own', () => {
    const h = new Kiri.OnlineHost(onlineSetup(3, 0));
    const hostHorse = h.race.riders.find((r) => r.team === 0).id;
    const guestHorse = h.race.riders.find((r) => r.team === 1).id;
    const clean = h.sanitize(1, { [hostHorse]: { effort: 1, lane: 0 }, [guestHorse]: { effort: 9, lane: 7 } });
    expect(clean[hostHorse]).toBe(undefined);
    expect(clean[guestHorse].lane).toBe(0);
    expect(Object.keys(clean).length).toBe(2);
  });

  it('a stable whose horses are all home is skipped; AI-only turns resolve on their own', () => {
    const h = new Kiri.OnlineHost(onlineSetup(4, 1));
    h.race.riders.filter((r) => r.team === 1).forEach((r) => { r.finished = true; });
    expect(h.teamDone(1)).toBe(true);
    expect(h.submit(0, 1, {}).resolved).toBe(true);
    h.race.riders.filter((r) => r.team === 0).forEach((r) => { r.finished = true; });
    expect(h.tryResolve().resolved).toBe(true);
  });

  it('AI takes over a stable after a disconnect', () => {
    const h = new Kiri.OnlineHost(onlineSetup(5, 0));
    h.takeOver(1);
    expect(h.race.teams[1].controller).toBe('planner');
    expect(h.submit(0, 1, {}).resolved).toBe(true);
  });

  it('game codes: 6 characters, no look-alikes; input is normalized', () => {
    const c = Kiri.makeCode(Kiri.rng(9));
    expect(c.length).toBe(6);
    expect(/[01IOL]/.test(c)).toBe(false);
    expect(Kiri.normalizeCode(' ab-c d3e4 ')).toBe('ABCD3E');
  });

  it('host and guest end with identical states over 100 races (SC-003)', () => {
    let same = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const h = new Kiri.OnlineHost(onlineSetup(seed, seed % 5));
      let guestView = JSON.parse(JSON.stringify(h.race)); // what the guest received in "start"
      const ra = Kiri.rng(seed);
      const rb = Kiri.rng(seed + 1000);
      let safety = 0;
      while (!h.race.over && safety++ < 200) {
        let res = { resolved: false };
        if (!h.teamDone(1)) res = h.submit(1, guestView.turn, JSON.parse(JSON.stringify(playerOrders(guestView, 1, rb))));
        if (!res.resolved && !h.teamDone(0)) res = h.submit(0, h.race.turn, playerOrders(h.race, 0, ra));
        if (!res.resolved) res = h.tryResolve();
        if (res.resolved) guestView = JSON.parse(JSON.stringify(res.race)); // "state" message
      }
      if (h.race.over && JSON.stringify(guestView) === JSON.stringify(h.race)) same++;
    }
    expect(same).toBe(100);
  });
});
