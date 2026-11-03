// Synthesized sound effects (no audio files). Created lazily after the first user gesture.
(function (Kiri) {
  'use strict';
  let ctx = null;
  let muted = Kiri.Store ? Kiri.Store.prefs().muted : false;

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(a, freq, start, dur, type, gain) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(a.destination);
    o.start(start);
    o.stop(start + dur + 0.05);
    return o;
  }

  function noise(a, start, dur, from, to, gain) {
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(from, start);
    f.frequency.exponentialRampToValueAtTime(to, start + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start(start);
  }

  const SOUNDS = {
    ride(a, t) { noise(a, t, 0.45, 500, 2200, 0.12); },
    sprint(a, t) { tone(a, 1318, t, 0.25, 'sine', 0.15); tone(a, 1760, t + 0.12, 0.35, 'sine', 0.15); },
    crack(a, t) {
      const o = tone(a, 140, t, 0.4, 'triangle', 0.3);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.4);
    },
    finish(a, t) {
      [523, 659, 784, 1046].forEach((f, i) => tone(a, f, t + i * 0.06, 0.9, 'sine', 0.08));
      noise(a, t + 0.05, 1.6, 900, 1400, 0.07);
    },
  };

  function play(name) {
    if (muted || !SOUNDS[name]) return;
    try {
      const a = audio();
      if (a) SOUNDS[name](a, a.currentTime + 0.02);
    } catch (e) { /* audio unavailable */ }
  }

  function setMuted(m) {
    muted = m;
    if (Kiri.Store) Kiri.Store.setPref('muted', m);
  }

  Kiri.Sound = { play, setMuted, isMuted: () => muted };
})(window.Kiri = window.Kiri || {});
