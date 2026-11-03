// Builders for hand-made test boards.
(function () {
  'use strict';
  // Terrain string: f=flat c=climb d=descent k=cobbles; sprint/finish are square indices.
  window.makeStage = (terrain, opts) => {
    const map = { f: 'flat', c: 'climb', d: 'descent', k: 'cobbles' };
    const squares = terrain.split('').map((ch) => ({ terrain: map[ch], width: ch === 'c' || ch === 'k' ? 2 : 3 }));
    for (let i = 0; i < Kiri.C.RUNOFF; i++) squares.push({ terrain: 'flat', width: 3 });
    return Object.assign({ name: 'test', squares, sprint: 5, finish: terrain.length, wind: 'calm' }, opts || {});
  };

  let nextId = 0;
  window.rider = (o) => Object.assign({
    id: nextId++, team: 0, archetype: 'rouleur', square: 0, lane: 0, energy: 100, maxEnergy: 110,
    strain: 0, crack: 0, finished: false, finishTurn: null, finishPlace: null, capped: false, points: 0,
  }, o);

  window.makeState = (stage, riders, wind) => {
    riders.forEach((r, i) => { r.id = i; });
    return {
      stage, wind: wind || stage.wind, riders,
      teams: [{ id: 0, name: 'A', color: '#f00', controller: 'human' }, { id: 1, name: 'B', color: '#00f', controller: 'diesel' }],
      turn: 1, sprintDone: [], finishOrder: [], log: [], over: false,
    };
  };

  window.allOrders = (state, effort, lane) => {
    const o = {};
    state.riders.forEach((r) => { if (!r.finished) o[r.id] = { effort, lane: lane || 0 }; });
    return o;
  };
})();
