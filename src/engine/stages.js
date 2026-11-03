// Races on the 1000 m oval: preset distances and a seeded random race.
(function (Kiri) {
  'use strict';
  const C = Kiri.C;

  function lapPos(race, square) {
    return (((race.startOffset + square) % C.LAP) + C.LAP) % C.LAP;
  }

  function isCurveAt(lapPosition) {
    const p = Math.floor(lapPosition);
    return (p >= 10 && p < 20) || p >= 30;
  }

  function buildRace(name, meters, blurb) {
    const distance = Math.round(meters / C.SEGMENT_M);
    const race = {
      name, meters, blurb: blurb || '', finish: distance,
      startOffset: (((C.FINISH_LAP_POS - distance) % C.LAP) + C.LAP) % C.LAP, squares: [],
    };
    for (let i = 0; i < distance + C.RUNOFF; i++) {
      race.squares.push({ terrain: isCurveAt(lapPos(race, i)) ? 'curve' : 'straight', width: C.LANES });
    }
    return race;
  }

  const PRESET_STAGES = [
    buildRace('Mile', 1609, 'One and a half laps. Gate speed and a good early position count.'),
    buildRace('Classic', 2100, 'Just over two laps: the standard distance.'),
    buildRace('Long', 2600, 'Two and a half laps. Stamina decides it, and a lap in the death seat hurts.'),
  ];

  function generateStage(seed) {
    const rand = Kiri.rng(seed);
    const meters = 1600 + rand.int(0, 60) * 25;
    return buildRace('Random ' + meters + ' m #' + seed, meters, 'Seeded random distance.');
  }

  Object.assign(Kiri, { PRESET_STAGES, generateStage, buildRace, lapPos, isCurveAt });
})(window.Kiri = window.Kiri || {});
