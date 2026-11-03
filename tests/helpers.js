// Builders for hand-made test boards.
(function () {
  'use strict';
  // Segment string: s = straight, c = curve. Every segment is four lanes wide.
  window.makeStage = (terrain, opts) => {
    const map = { s: 'straight', c: 'curve' };
    const squares = terrain.split('').map((ch) => ({ terrain: map[ch], width: Kiri.C.LANES }));
    for (let i = 0; i < Kiri.C.RUNOFF; i++) squares.push({ terrain: 'straight', width: Kiri.C.LANES });
    return Object.assign({ name: 'test', squares, finish: terrain.length }, opts || {});
  };

  let nextId = 0;
  window.rider = (o) => Object.assign({
    id: nextId++, team: 0, archetype: 'stayer', square: 0, lane: 0, energy: 100, maxEnergy: 115,
    strain: 0, crack: 0, finished: false, finishTurn: null, finishPlace: null, capped: false, points: 0,
  }, o);

  window.makeState = (stage, riders) => {
    riders.forEach((r, i) => { r.id = i; });
    return {
      stage, riders,
      teams: [{ id: 0, name: 'A', color: '#f00', controller: 'human' }, { id: 1, name: 'B', color: '#00f', controller: 'diesel' }],
      turn: 5, finishOrder: [], log: [], over: false,
    };
  };

  window.allOrders = (state, effort, lane) => {
    const o = {};
    state.riders.forEach((r) => { if (!r.finished) o[r.id] = { effort, lane: lane || 0 }; });
    return o;
  };
})();
