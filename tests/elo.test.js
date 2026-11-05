describe('Spec 006 — post draw', () => {
  it('every horse gets a distinct post 1–12 that matches its grid slot', () => {
    const s = Kiri.createRace(quickSetup(6, 11));
    expect(s.riders.map((r) => r.post).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const r of s.riders) {
      expect(r.lane).toBe((r.post - 1) % 4);
      expect(r.square).toBe(-1 - Math.floor((r.post - 1) / 4));
    }
  });
  it('the same seed gives the same draw, another seed a different one', () => {
    const a = Kiri.createRace(quickSetup(6, 11)).riders.map((r) => r.post);
    const b = Kiri.createRace(quickSetup(6, 11)).riders.map((r) => r.post);
    const c = Kiri.createRace(quickSetup(6, 12)).riders.map((r) => r.post);
    expect(a).toEqual(b);
    expect(JSON.stringify(a) !== JSON.stringify(c)).toBe(true);
  });
  it('more than 12 horses is refused', () => {
    const setup = quickSetup(6, 1);
    setup.teams.push({ name: 'X', color: '#000', controller: 'diesel', archetypes: ['stayer'] });
    expect(() => Kiri.createRace(setup)).toThrow();
  });
});

describe('Spec 006 — Elo ladder', () => {
  it('starts at 1000, shown as 10.00', () => {
    expect(Kiri.C.ELO_START).toBe(1000);
    expect(Kiri.ladderMoney(Kiri.C.ELO_START)).toBe('10.00');
    expect(Kiri.ladderMoney(16, true)).toBe('+0.16');
    expect(Kiri.ladderMoney(-8, true)).toBe('−0.08');
  });
  it('equal ratings: winner gains, last loses, total about zero', () => {
    const e = [0, 1, 2, 3, 4, 5].map((i) => ({ id: 'p' + i, rating: 1000, place: i + 1 }));
    const d = Kiri.eloChanges(e);
    expect(d.p0).toBeGreaterThan(0);
    expect(d.p5).toBeLessThan(0);
    expect(d.p0).toBe(-d.p5);
    const sum = Object.keys(d).reduce((n, k) => n + d[k], 0);
    expect(Math.abs(sum)).toBeLessThan(3);
  });
  it('beating stronger stables pays more than beating weaker ones', () => {
    const vsStrong = Kiri.eloChanges([{ id: 'a', rating: 1000, place: 1 }, { id: 'b', rating: 1300, place: 2 }]);
    const vsWeak = Kiri.eloChanges([{ id: 'a', rating: 1000, place: 1 }, { id: 'b', rating: 700, place: 2 }]);
    expect(vsStrong.a).toBeGreaterThan(vsWeak.a);
  });
  it('bots count as opponents at the humans\' average but get no change', () => {
    const d = Kiri.eloChanges([{ id: 'me', rating: 1200, place: 1 }, { id: 'bot1', bot: true, place: 2 }, { id: 'bot2', bot: true, place: 3 }]);
    expect(Object.keys(d)).toEqual(['me']);
    expect(d.me).toBe(16); // two wins against equals at K=32 split over 2 opponents
  });
  it('stables are ranked by prize money, then best horse', () => {
    const race = {
      teams: [{ id: 0 }, { id: 1 }, { id: 2 }],
      riders: [
        { team: 0, points: 1000, finishPlace: 5 }, { team: 0, points: 800, finishPlace: 6 },
        { team: 1, points: 10000, finishPlace: 1 }, { team: 1, points: 0, finishPlace: 9 },
        { team: 2, points: 1500, finishPlace: 4 }, { team: 2, points: 400, finishPlace: 8 },
      ],
    };
    expect(Kiri.stablePlaces(race)).toEqual([{ team: 1, place: 1 }, { team: 2, place: 2 }, { team: 0, place: 3 }]);
  });
});
