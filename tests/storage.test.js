describe('Storage (002 US2)', () => {
  const S = Kiri.Store;
  const keep = {};
  const backup = () => { for (const k of [S.SAVE_KEY, S.PREFS_KEY]) keep[k] = localStorage.getItem(k); };
  const restore = () => {
    for (const k in keep) { if (keep[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, keep[k]); }
  };

  it('save round trip keeps the race state intact', () => {
    backup();
    const race = Kiri.createRace({ stage: Kiri.PRESET_STAGES[0], seed: 3, teams: [{ name: 'A', color: '#000', controller: 'human', archetypes: ['stayer', 'closer'] }] });
    S.writeSave({ race, raceSetup: { seed: 3 }, difficulty: 'hard' });
    const back = S.loadSave();
    restore();
    expect(JSON.stringify(back.race)).toBe(JSON.stringify(race));
    expect(back.difficulty).toBe('hard');
  });
  it('corrupt JSON → no save, no throw', () => {
    backup();
    localStorage.setItem(S.SAVE_KEY, '{not json');
    const s = S.loadSave();
    restore();
    expect(s).toBe(null);
  });
  it('save from another version is ignored', () => {
    backup();
    localStorage.setItem(S.SAVE_KEY, JSON.stringify({ v: 1, race: {}, raceSetup: {} }));
    const s = S.loadSave();
    restore();
    expect(s).toBe(null);
  });
  it('clearSave removes the slot', () => {
    backup();
    S.writeSave({ race: {}, raceSetup: {} });
    S.clearSave();
    const s = S.loadSave();
    restore();
    expect(s).toBe(null);
  });
  it('prefs have defaults and remember changes', () => {
    backup();
    localStorage.removeItem(S.PREFS_KEY);
    const d = S.prefs();
    S.setPref('muted', true);
    const p = S.prefs();
    restore();
    expect(d).toEqual({ difficulty: 'normal', muted: false });
    expect(p.muted).toBe(true);
  });
});
