describe('Rule 2 — movement budget and terrain', () => {
  it('flat: effort E moves E squares', () => {
    const st = makeStage('ffffffffffffffffffff');
    expect(Kiri.pathReach(st, rider({ square: 0 }), 5)).toBe(5);
  });
  it('flat into climb: effort 4 two squares before a climb reaches +3 (US2-3)', () => {
    const st = makeStage('fffccccccffffffffff');
    expect(Kiri.pathReach(st, rider({ square: 0, archetype: 'rouleur' }), 4)).toBe(3);
  });
  it('descent squares cost 1 half-step', () => {
    const st = makeStage('fddddddddddfffffff');
    expect(Kiri.pathReach(st, rider({ square: 1 }), 3)).toBe(7);
  });
  it('cobbles cost 3 for non-rouleurs', () => {
    const st = makeStage('fkkkkkkkkkkfff');
    expect(Kiri.pathReach(st, rider({ square: 0, archetype: 'climber' }), 6)).toBe(4);
  });
  it('always moves at least one square', () => {
    const st = makeStage('fccccccfff');
    expect(Kiri.pathReach(st, rider({ square: 1, archetype: 'sprinter' }), 1)).toBe(2);
  });
  it('start grid squares are flat', () => {
    const st = makeStage('ffffffffff');
    expect(Kiri.pathReach(st, rider({ square: -2 }), 3)).toBe(1);
  });
});

describe('Rule 3 — archetypes', () => {
  it('rouleur pays 2 on cobbles', () => {
    const st = makeStage('fkkkkkkkkkkfff');
    expect(Kiri.pathReach(st, rider({ square: 0, archetype: 'rouleur' }), 6)).toBe(6);
  });
  it('climber pays 3 on climbs, sprinter 5', () => {
    const st = makeStage('fcccccccccccffff');
    expect(Kiri.pathReach(st, rider({ square: 0, archetype: 'climber' }), 6)).toBe(4);
    expect(Kiri.pathReach(st, rider({ square: 0, archetype: 'sprinter' }), 6)).toBe(2);
  });
  it('sprinter Kick adds 4 budget within 12 squares of the finish at effort ≥7', () => {
    const st = makeStage('f'.repeat(30));
    expect(Kiri.pathReach(st, rider({ square: 20, archetype: 'sprinter' }), 7)).toBe(29);
    expect(Kiri.pathReach(st, rider({ square: 20, archetype: 'sprinter' }), 6)).toBe(26);
    expect(Kiri.pathReach(st, rider({ square: 10, archetype: 'sprinter' }), 7)).toBe(17);
  });
});

describe('Rule 4 — energy cost', () => {
  it('base costs per effort', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map((e) => Kiri.energyCost(e, false, 'calm'))).toEqual([0, 1, 2, 3, 5, 7, 9, 12, 15]);
  });
  it('shelter discounts by wind, rounded down (US2-1)', () => {
    expect(Kiri.energyCost(8, true, 'head')).toBe(6);
    expect(Kiri.energyCost(8, true, 'calm')).toBe(8);
    expect(Kiri.energyCost(8, true, 'crossLeft')).toBe(7);
  });
  it('efforts the rider cannot pay are illegal', () => {
    const st = makeStage('ffffffffffffffff');
    const s = makeState(st, [rider({ square: 0, energy: 4 })]);
    expect(Kiri.legalEfforts(s, s.riders[0])).toEqual([1, 2, 3, 4]);
  });
  it('only effort 1 when energy is 0', () => {
    const st = makeStage('ffffffffffffffff');
    const s = makeState(st, [rider({ square: 0, energy: 0 })]);
    expect(Kiri.legalEfforts(s, s.riders[0])).toEqual([1]);
  });
});

describe('Rule 5 — strain and cracking', () => {
  it('strain moves by effort − 5, never below 0', () => {
    expect(Kiri.strainAfter(rider({ strain: 3 }), 8, false)).toEqual({ strain: 6, cracked: false });
    expect(Kiri.strainAfter(rider({ strain: 1 }), 2, false)).toEqual({ strain: 0, cracked: false });
  });
  it('shelter gives one extra recovery', () => {
    expect(Kiri.strainAfter(rider({ strain: 3 }), 5, true)).toEqual({ strain: 2, cracked: false });
  });
  it('reaching 10 cracks: strain → 6 (US2-2)', () => {
    expect(Kiri.strainAfter(rider({ strain: 7 }), 8, false)).toEqual({ strain: 6, cracked: true });
  });
  it('cracked riders are capped at effort 3', () => {
    const st = makeStage('ffffffffffffffff');
    const s = makeState(st, [rider({ square: 0, crack: 2 })]);
    expect(Kiri.legalEfforts(s, s.riders[0])).toEqual([1, 2, 3]);
  });
});

describe('Rule 6 — shelter and wind', () => {
  const st = makeStage('ffffffffffffffffcccccc');
  it('calm/head: occupied square directly ahead in the same lane', () => {
    const s = makeState(st, [rider({ square: 3, lane: 1 }), rider({ square: 4, lane: 1 })], 'head');
    expect(Kiri.isSheltered(s, s.riders[0])).toBe(true);
    expect(Kiri.isSheltered(s, s.riders[1])).toBe(false);
  });
  it('a rider two squares ahead gives no shelter', () => {
    const s = makeState(st, [rider({ square: 3, lane: 1 }), rider({ square: 5, lane: 1 })], 'calm');
    expect(Kiri.isSheltered(s, s.riders[0])).toBe(false);
  });
  it('crosswind from the left: shelter is ahead and one lane left', () => {
    const s = makeState(st, [rider({ square: 3, lane: 1 }), rider({ square: 4, lane: 0 })], 'crossLeft');
    expect(Kiri.isSheltered(s, s.riders[0])).toBe(true);
    const s2 = makeState(st, [rider({ square: 3, lane: 1 }), rider({ square: 4, lane: 1 })], 'crossLeft');
    expect(Kiri.isSheltered(s2, s2.riders[0])).toBe(false);
  });
  it('crosswind gutter: lane 0 in a crosswind from the left is never sheltered', () => {
    const s = makeState(st, [rider({ square: 3, lane: 0 }), rider({ square: 4, lane: 0 })], 'crossLeft');
    expect(Kiri.isSheltered(s, s.riders[0])).toBe(false);
  });
  it('crosswind from the right: shelter is one lane right', () => {
    const s = makeState(st, [rider({ square: 3, lane: 1 }), rider({ square: 4, lane: 2 })], 'crossRight');
    expect(Kiri.isSheltered(s, s.riders[0])).toBe(true);
  });
  it('no shelter on climb squares', () => {
    const s = makeState(st, [rider({ square: 17, lane: 0 }), rider({ square: 18, lane: 0 })], 'calm');
    expect(Kiri.isSheltered(s, s.riders[0])).toBe(false);
  });
  it('finished riders give no shelter', () => {
    const s = makeState(st, [rider({ square: 3, lane: 1 }), rider({ square: 4, lane: 1, finished: true })], 'calm');
    expect(Kiri.isSheltered(s, s.riders[0])).toBe(false);
  });
});
