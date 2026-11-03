// Browser storage that never throws: a versioned save slot and small preferences.
(function (Kiri) {
  'use strict';
  const SAVE_KEY = 'kiri.save';
  const PREFS_KEY = 'kiri.prefs';
  // 3 = harness racing; older cycling saves are ignored.
  const SAVE_VERSION = 3;

  function read(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function write(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  function remove(key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
  }

  function loadSave() {
    const s = read(SAVE_KEY);
    if (!s || s.v !== SAVE_VERSION || !s.race || !s.raceSetup) return null;
    return s;
  }

  function writeSave(data) { return write(SAVE_KEY, Object.assign({ v: SAVE_VERSION }, data)); }

  function clearSave() { remove(SAVE_KEY); }

  function prefs() {
    return Object.assign({ difficulty: 'normal', muted: false }, read(PREFS_KEY) || {});
  }

  function setPref(name, value) {
    const p = prefs();
    p[name] = value;
    write(PREFS_KEY, p);
  }

  Kiri.Store = { loadSave, writeSave, clearSave, prefs, setPref, SAVE_KEY, PREFS_KEY, SAVE_VERSION };
})(window.Kiri = window.Kiri || {});
