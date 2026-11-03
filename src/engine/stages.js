// Preset stages and a seeded random stage generator.
(function (Kiri) {
  'use strict';
  const C = Kiri.C;
  const WIDTH = { flat: 3, descent: 3, climb: 2, cobbles: 2 };

  // segments: [terrain, length][]; sprintAt is a fraction of the finish distance.
  function buildStage(name, segments, wind, sprintAt, blurb) {
    const squares = [];
    for (const [terrain, len] of segments) {
      for (let i = 0; i < len; i++) squares.push({ terrain, width: WIDTH[terrain] });
    }
    const finish = squares.length;
    for (let i = 0; i < C.RUNOFF; i++) squares.push({ terrain: 'flat', width: 3 });
    let sprint = Math.round(finish * sprintAt);
    // Nudge the sprint line onto the nearest flat square.
    for (let d = 0; d < finish; d++) {
      if (squares[sprint + d] && squares[sprint + d].terrain === 'flat') { sprint += d; break; }
      if (squares[sprint - d] && squares[sprint - d].terrain === 'flat') { sprint -= d; break; }
    }
    return { name, blurb: blurb || '', squares, sprint, finish, wind };
  }

  const PRESET_STAGES = [
    buildStage('Rannikko', [['flat', 14], ['cobbles', 4], ['flat', 18], ['descent', 3], ['flat', 20], ['cobbles', 5], ['flat', 16]],
      'crossLeft', 0.42, 'Flat coast road, wind off the sea. Echelons decide it.'),
    buildStage('Harju', [['flat', 10], ['climb', 7], ['descent', 5], ['flat', 12], ['climb', 9], ['descent', 6], ['flat', 10], ['climb', 6], ['flat', 9]],
      'calm', 0.45, 'Three climbs along the ridge. A day for climbers.'),
    buildStage('Kivitie', [['flat', 9], ['cobbles', 6], ['flat', 12], ['cobbles', 5], ['flat', 10], ['climb', 4], ['descent', 4], ['cobbles', 7], ['flat', 18]],
      'head', 0.4, 'Old stone roads into a headwind. Hide, then strike.'),
  ];

  const NAMES = ['Kuusikko', 'Järvitie', 'Kalliola', 'Tuulimäki', 'Suonsilta', 'Koivuranta', 'Revontuli', 'Hiekkaharju', 'Pohjoistie', 'Saaristo'];

  function generateStage(seed) {
    const rand = Kiri.rng(seed);
    const target = rand.int(72, 92);
    const segments = [['flat', rand.int(8, 12)]];
    let len = segments[0][1];
    let prev = 'flat';
    const summit = rand() < 0.25;
    const endLen = summit ? rand.int(5, 7) : rand.int(10, 14);
    while (len < target - endLen) {
      let terrain;
      if (prev === 'climb') terrain = rand() < 0.7 ? 'descent' : 'flat';
      else if (prev !== 'flat') terrain = 'flat';
      else terrain = rand.pick(['climb', 'climb', 'cobbles', 'descent', 'flat']);
      const n = { flat: rand.int(6, 14), climb: rand.int(4, 9), descent: rand.int(3, 6), cobbles: rand.int(3, 7) }[terrain];
      segments.push([terrain, n]);
      len += n;
      prev = terrain;
    }
    if (summit && prev === 'climb') segments.push(['flat', 4]);
    segments.push([summit ? 'climb' : 'flat', endLen]);
    const name = NAMES[Math.floor(rand() * NAMES.length)] + ' #' + seed;
    return buildStage(name, segments, rand.pick(C.WINDS), 0.35 + rand() * 0.2,
      summit ? 'Random stage with a summit finish.' : 'Random stage.');
  }

  Object.assign(Kiri, { PRESET_STAGES, generateStage, buildStage });
})(window.Kiri = window.Kiri || {});
