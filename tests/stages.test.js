describe('Stages', () => {
  it('three presets with distinct winds', () => {
    expect(Kiri.PRESET_STAGES.length).toBe(3);
    expect(new Set(Kiri.PRESET_STAGES.map((s) => s.wind)).size).toBe(3);
  });
  it('sprint line sits on flat ground before the finish', () => {
    for (const s of Kiri.PRESET_STAGES.concat([Kiri.generateStage(1), Kiri.generateStage(7), Kiri.generateStage(42)])) {
      expect(s.squares[s.sprint].terrain).toBe('flat');
      expect(s.sprint).toBeLessThan(s.finish);
    }
  });
  it('run-off after the finish holds the full field', () => {
    const s = Kiri.PRESET_STAGES[0];
    expect(s.squares.length - s.finish).toBe(Kiri.C.RUNOFF);
  });
  it('same seed → identical stage (US3-1)', () => {
    expect(Kiri.generateStage(42)).toEqual(Kiri.generateStage(42));
  });
  it('different seeds → different stages', () => {
    expect(JSON.stringify(Kiri.generateStage(1)) !== JSON.stringify(Kiri.generateStage(2))).toBe(true);
  });
  it('generated stage lengths stay in 70–110 squares', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = Kiri.generateStage(seed);
      expect(s.finish).toBeGreaterThan(69);
      expect(s.finish).toBeLessThan(111);
    }
  });
});
