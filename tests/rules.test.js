describe('Rule 1 — oval track and races', () => {
  it('a lap is 40 segments: straight 0–9, curve 10–19, straight 20–29, curve 30–39', () => {
    const marks = [0, 9, 10, 19, 20, 29, 30, 39].map(Kiri.isCurveAt);
    expect(marks).toEqual([false, false, true, true, false, false, true, true]);
  });
  it('races finish at the end of the home straight', () => {
    for (const r of Kiri.PRESET_STAGES) expect(Kiri.lapPos(r, r.finish)).toBe(Kiri.C.FINISH_LAP_POS);
  });
  it('preset distances: 1609, 2100, 2600 m', () => {
    expect(Kiri.PRESET_STAGES.map((r) => r.finish)).toEqual([64, 84, 104]);
  });
  it('segment terrain follows the oval', () => {
    const r = Kiri.PRESET_STAGES[1];
    r.squares.slice(0, 60).forEach((sq, i) => expect(sq.terrain === 'curve').toBe(Kiri.isCurveAt(Kiri.lapPos(r, i))));
  });
});

describe('Rule 2 — movement', () => {
  it('straight: speed S moves S segments in any lane', () => {
    const st = makeStage('ssssssssssssssssssss');
    expect(Kiri.pathReach(st, rider({ square: 0, lane: 3 }), 5, 0)).toBe(5);
  });
  it('curve: lanes 1–2 pay 2, lane 3 pays 3, lane 4 pays 4', () => {
    const st = makeStage('cccccccccccccccccccc');
    expect(Kiri.pathReach(st, rider({ square: 0, lane: 0 }), 6, 0)).toBe(6);
    expect(Kiri.pathReach(st, rider({ square: 0, lane: 1 }), 6, 0)).toBe(6);
    expect(Kiri.pathReach(st, rider({ square: 0, lane: 2 }), 6, 0)).toBe(4);
    expect(Kiri.pathReach(st, rider({ square: 0, lane: 3 }), 6, 0)).toBe(3);
  });
  it('moving out to lane 3 on a curve pays lane-3 cost (US2-4)', () => {
    const st = makeStage('cccccccccccccccccccc');
    expect(Kiri.pathReach(st, rider({ square: 0, lane: 1 }), 6, 1)).toBe(4);
  });
  it('moving in pays the current, outer lane', () => {
    const st = makeStage('cccccccccccccccccccc');
    expect(Kiri.pathReach(st, rider({ square: 0, lane: 3 }), 6, -1)).toBe(3);
  });
  it('always at least one segment', () => {
    const st = makeStage('cccccccccc');
    expect(Kiri.pathReach(st, rider({ square: 0, lane: 3 }), 1, 0)).toBe(1);
  });
});

describe('Rule 3 — horse types', () => {
  it('closer Kick: +4 budget within 12 segments at speed ≥7', () => {
    const st = makeStage('s'.repeat(30));
    expect(Kiri.pathReach(st, rider({ square: 20, archetype: 'closer' }), 7, 0)).toBe(29);
    expect(Kiri.pathReach(st, rider({ square: 20, archetype: 'closer' }), 6, 0)).toBe(26);
    expect(Kiri.pathReach(st, rider({ square: 10, archetype: 'closer' }), 7, 0)).toBe(17);
  });
  it('gate speed: +4 budget in turns 1–2 only', () => {
    const st = makeStage('s'.repeat(30));
    expect(Kiri.pathReach(st, rider({ square: 0, archetype: 'gate' }), 5, 0, 1)).toBe(7);
    expect(Kiri.pathReach(st, rider({ square: 0, archetype: 'gate' }), 5, 0, 3)).toBe(5);
  });
  it('energy by type', () => {
    expect(['stayer', 'closer', 'gate'].map((a) => Kiri.C.ARCHETYPES[a].energy)).toEqual([125, 110, 110]);
  });
});

describe('Rule 4 — position and energy', () => {
  const st = makeStage('ssssssssssccccccccccssssssssss');
  const posOf = (riders, i) => { const s = makeState(st, riders); return Kiri.position(s, s.riders[i]); };
  it('base costs', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map((e) => Kiri.energyCost(e, null))).toEqual([0, 1, 2, 3, 5, 7, 9, 12, 15]);
  });
  it('in cover on the rail: ×0.6 (US2-2: speed 6 costs 4)', () => {
    const p = posOf([rider({ square: 3, lane: 0 }), rider({ square: 4, lane: 0 })], 0);
    expect(p.kind).toBe('cover');
    expect(Kiri.energyCost(6, p)).toBe(4);
  });
  it('death seat: lane 2 outside the leader, no cover: ×1.6 (US2-1: speed 6 costs 11)', () => {
    const p = posOf([rider({ square: 4, lane: 1 }), rider({ square: 4, lane: 0 })], 0);
    expect(p.kind).toBe('deathSeat');
    expect(Kiri.energyCost(6, p)).toBe(11);
  });
  it('lane 2 half a length behind the rail horse is also the death seat', () => {
    expect(posOf([rider({ square: 3, lane: 1 }), rider({ square: 4, lane: 0 })], 0).kind).toBe('deathSeat');
  });
  it('lane 2 with cover ahead is not the death seat: ×0.7', () => {
    const p = posOf([rider({ square: 3, lane: 1 }), rider({ square: 4, lane: 1 }), rider({ square: 4, lane: 0 })], 0);
    expect(p.kind).toBe('cover');
    expect(Kiri.energyCost(6, p)).toBe(5);
  });
  it('lane 1 alongside someone is not the death seat', () => {
    expect(posOf([rider({ square: 4, lane: 0 }), rider({ square: 4, lane: 1 })], 0).kind).toBe('open');
  });
  it('open lanes: ×1.0 / ×1.3 / ×1.5 / ×1.7 on a straight', () => {
    expect([0, 1, 2, 3].map((l) => Kiri.energyCost(9, posOf([rider({ square: 2, lane: l })], 0)))).toEqual([15, 20, 23, 26]);
  });
  it('wide in a curve: lane 3 speed 6 costs 13 (US2-3)', () => {
    const p = posOf([rider({ square: 12, lane: 2 })], 0);
    expect(p.wide).toBe(true);
    expect(Kiri.energyCost(6, p)).toBe(13);
  });
  it('lane 2 in a curve is not "wide"', () => {
    expect(posOf([rider({ square: 12, lane: 1 })], 0).wide).toBe(false);
  });
  it('finished horses give no cover and make no death seat', () => {
    expect(posOf([rider({ square: 4, lane: 1 }), rider({ square: 4, lane: 0, finished: true })], 0).kind).toBe('open');
  });
  it('an exhausted horse may still trot at speeds 1–3 for free', () => {
    const s = makeState(st, [rider({ square: 0, energy: 0 })]);
    expect(Kiri.legalEfforts(s, s.riders[0])).toEqual([1, 2, 3]);
    expect(Kiri.resolveTurn(s, { 0: { effort: 3 } }).riders[0].energy).toBe(0);
  });
  it('speeds the horse cannot pay for are illegal', () => {
    const s = makeState(st, [rider({ square: 0, energy: 4 })]);
    expect(Kiri.legalEfforts(s, s.riders[0])).toEqual([1, 2, 3, 4]);
  });
});

describe('Rule 5 — strain and galloping', () => {
  it('strain moves by speed − 5, never below 0', () => {
    expect(Kiri.strainAfter(rider({ strain: 3 }), 8, null)).toEqual({ strain: 6, cracked: false });
    expect(Kiri.strainAfter(rider({ strain: 1 }), 2, null)).toEqual({ strain: 0, cracked: false });
  });
  it('cover −1, death seat +1', () => {
    expect(Kiri.strainAfter(rider({ strain: 3 }), 5, { covered: true }).strain).toBe(2);
    expect(Kiri.strainAfter(rider({ strain: 3 }), 6, { deathSeat: true }).strain).toBe(5);
  });
  it('strain 10 → gallop: strain 5', () => {
    expect(Kiri.strainAfter(rider({ strain: 7 }), 8, null)).toEqual({ strain: 5, cracked: true });
  });
  it('a galloping horse is capped at speed 3', () => {
    const s = makeState(makeStage('ssssssssss'), [rider({ square: 0, crack: 2 })]);
    expect(Kiri.legalEfforts(s, s.riders[0])).toEqual([1, 2, 3]);
  });
});

describe('Rule 6 — lane changes', () => {
  it('at most one lane per turn', () => {
    expect(Kiri.allowedLanes(rider({ lane: 0 }))).toEqual([0, 1]);
    expect(Kiri.allowedLanes(rider({ lane: 2 }))).toEqual([1, 2, 3]);
    expect(Kiri.requestedLane(rider({ lane: 1 }), 5)).toBe(2);
  });
  it('no move into a lane with a horse right alongside', () => {
    expect(Kiri.allowedLanes(rider({ square: 5, lane: 0 }), [{ square: 5, lane: 1 }])).toEqual([0]);
    expect(Kiri.allowedLanes(rider({ square: 5, lane: 0 }), [{ square: 6, lane: 1 }])).toEqual([0, 1]);
  });
  it('free lane nearest the request, inner lane on a tie', () => {
    expect(Kiri.pickLane([0, 1, 2], 1, new Set([1]))).toBe(0);
    expect(Kiri.pickLane([1, 2, 3], 3, new Set([3]))).toBe(2);
    expect(Kiri.pickLane([0, 1], 1, new Set([0, 1]))).toBe(-1);
  });
});
