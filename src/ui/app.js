// Screens, game flow and input.
(function (Kiri) {
  'use strict';
  const C = Kiri.C;
  const UI = Kiri.UI;
  const esc = UI.esc;
  const root = document.getElementById('app');

  const TEAM_NAMES = ['Talli Pohjola', 'Revontulen Talli', 'Kalevan Kavio', 'Saimaan Ravi', 'Lapin Ravitalli'];
  const TEAM_COLORS = ['#2f6fdf', '#1f9d57', '#8e44ad', '#d4a106', '#0f8f8f'];
  const HUMAN_COLOR = '#e4572e';
  const HORSE_NAMES = ['Tähtisade', 'Myrskyn Poika', 'Salamaveikko', 'Tuulen Tytär', 'Kultakavio', 'Revontuli', 'Pikku Ukkonen', 'Hopeasiipi',
    'Routaprinssi', 'Sisun Liekki', 'Kesäheila', 'Pohjantähti', 'Usvan Neito', 'Rautatamma', 'Hallan Valo', 'Kaamosveli',
    'Aallon Ruhtinas', 'Leimuava', 'Kipinätär', 'Jäähile'];
  const DIFFICULTY_BLURB = {
    easy: 'Rivals misjudge their pace and make their run late. Good for learning.',
    normal: 'A mixed field of all four driving styles.',
    hard: 'Mostly Tacticians, no mistakes, early drives for home. Same rules for everyone.',
  };
  const AI_ARCHES = [['stayer', 'closer'], ['gate', 'stayer'], ['closer', 'gate'], ['stayer', 'gate'], ['gate', 'closer']];

  const app = {
    screen: 'title',
    setup: {
      stage: 1, seed: 42, aiTeams: 3, archetypes: ['stayer', 'closer'], teamName: 'Talli Sisu',
      difficulty: Kiri.Store.prefs().difficulty,
    },
    difficulty: 'normal',
    race: null,
    raceSetup: null,
    tour: null,
    orders: {},
    selected: null,
    busy: false,
    renderer: null,
    back: null,
  };

  function show(html) {
    if (app.renderer) { app.renderer.destroy(); app.renderer = null; }
    root.innerHTML = html;
    window.scrollTo(0, 0);
  }

  // ---------- Title ----------
  function titleScreen() {
    app.screen = 'title';
    const save = Kiri.Store.loadSave();
    const cont = save
      ? '<button class="btn primary" data-go="continue">Continue: ' + esc(save.race.stage.name) +
        (save.tour ? ' (series race ' + (save.tour.index + 1) + '/3)' : '') + (save.race.over ? ', results' : ', turn ' + save.race.turn) + '</button>'
      : '';
    show('<div class="title-screen"><div class="title-card">' +
      '<div class="logo">KIR<span>I</span></div>' +
      '<div class="tagline">Harness racing on the oval. Sit in cover, stay out of the death seat, and time your drive for home.</div>' +
      '<div class="menu">' + cont +
      '<button class="btn' + (save ? '' : ' primary') + '" data-go="quick">Quick race</button>' +
      '<button class="btn" data-go="custom">Custom race</button>' +
      '<button class="btn" data-go="tour">Series: 3 races</button>' +
      '<button class="btn" data-go="rules">How to play</button>' +
      '</div><p class="muted small" style="margin-top:28px">Two trotters. Nine speeds. One finish post.</p></div></div>');
    root.querySelector('.menu').addEventListener('click', (e) => {
      const go = e.target.dataset.go;
      if (go === 'continue') continueSaved(save);
      if (go === 'quick') startQuick();
      if (go === 'custom') setupScreen('custom');
      if (go === 'tour') setupScreen('tour');
      if (go === 'rules') rulesScreen(titleScreen);
    });
  }

  // ---------- Setup ----------
  function seg(name, options, current) {
    return '<div class="seg" data-seg="' + name + '">' + options.map(([v, l]) =>
      '<button data-v="' + esc(v) + '" class="' + (String(current) === String(v) ? 'on' : '') + '">' + esc(l) + '</button>').join('') + '</div>';
  }

  function setupStage() {
    const s = app.setup;
    return s.stage === 'random' ? Kiri.generateStage(Number(s.seed) || 1) : Kiri.PRESET_STAGES[s.stage];
  }

  function setupScreen(mode) {
    app.screen = 'setup';
    const s = app.setup;
    const tour = mode === 'tour';
    const stageField = tour
      ? '<div class="field"><label>Races</label><div>1. Mile 1609 m · 2. Classic 2100 m · 3. Long 2600 m</div><div class="muted small">Prize money adds up over all three races. Energy and strain reset between races.</div></div>'
      : '<div class="field"><label>Distance</label>' + seg('stage', [[0, 'Mile 1609 m'], [1, 'Classic 2100 m'], [2, 'Long 2600 m'], ['random', 'Random']], s.stage) +
        (s.stage === 'random' ? '<div style="margin-top:6px">Seed <input type="number" id="seed" value="' + esc(s.seed) + '"></div>' : '') +
        '<canvas class="stage-preview" id="stagePreview"></canvas><div class="muted small" id="stageBlurb"></div></div>';
    const archOpts = Object.keys(C.ARCHETYPES).map((k) => [k, C.ARCHETYPES[k].name]);
    show('<div class="page"><div class="page-head"><div><h1>' + (tour ? 'Series setup' : 'Custom race') + '</h1><div class="muted">Set up the race, then drive.</div></div>' +
      '<button class="btn" id="back">← Back</button></div>' +
      '<div class="setup-grid"><div class="card">' + stageField +
      '<div class="field"><label>AI stables</label>' + seg('aiTeams', [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], s.aiTeams) + '<div class="muted small">Each AI stable has a driving style: ' + Object.keys(Kiri.PERSONALITIES).map((k) => Kiri.PERSONALITIES[k].name).join(', ') + '.</div></div>' +
      '<div class="field"><label>Difficulty</label>' + seg('difficulty', Object.keys(Kiri.DIFFICULTY).map((k) => [k, Kiri.DIFFICULTY[k].name]), s.difficulty) +
      '<div class="muted small">' + DIFFICULTY_BLURB[s.difficulty] + '</div></div>' +
      '</div><div class="card">' +
      '<div class="field"><label>Stable name</label><input type="text" id="teamName" maxlength="24" value="' + esc(s.teamName) + '" style="width:100%"></div>' +
      [0, 1].map((i) => '<div class="field"><label>Horse ' + (i + 1) + '</label>' + seg('arch' + i, archOpts, s.archetypes[i]) +
        '<div class="muted small">' + esc(C.ARCHETYPES[s.archetypes[i]].blurb) + ' Energy ' + C.ARCHETYPES[s.archetypes[i]].energy + '.</div></div>').join('') +
      '</div></div><div style="margin-top:18px;text-align:right"><button class="btn primary big" id="start">' + (tour ? 'Start the tour ▶' : 'Start race ▶') + '</button></div></div>');

    root.querySelector('#back').onclick = titleScreen;
    root.querySelectorAll('[data-seg]').forEach((el) => el.addEventListener('click', (e) => {
      const v = e.target.dataset.v;
      if (v === undefined) return;
      const k = el.dataset.seg;
      if (k === 'stage') s.stage = v === 'random' ? 'random' : Number(v);
      else if (k === 'aiTeams') s.aiTeams = Number(v);
      else if (k === 'difficulty') { s.difficulty = v; Kiri.Store.setPref('difficulty', v); }
      else if (k === 'arch0') s.archetypes[0] = v;
      else if (k === 'arch1') s.archetypes[1] = v;
      s.teamName = root.querySelector('#teamName').value;
      setupScreen(mode);
    }));
    const seedEl = root.querySelector('#seed');
    if (seedEl) seedEl.addEventListener('input', () => { s.seed = Number(seedEl.value) || 1; drawStagePreview(); });
    root.querySelector('#teamName').addEventListener('input', (e) => { s.teamName = e.target.value; });
    drawStagePreview();
    root.querySelector('#start').onclick = () => {
      s.teamName = root.querySelector('#teamName').value.trim() || 'Talli Sisu';
      if (tour) { startTour(); return; }
      app.tour = null;
      const seed = s.stage === 'random' ? Number(s.seed) * 13 + 5 : Math.floor(Math.random() * 100000);
      startRace(buildSetup(setupStage(), seed));
    };
  }

  // Small oval with the start point and the distance covered drawn along it.
  function drawStagePreview() {
    const cv = root.querySelector('#stagePreview');
    if (!cv) return;
    const race = setupStage();
    const laps = (race.meters / 1000).toFixed(2).replace(/\.?0+$/, '');
    root.querySelector('#stageBlurb').textContent = race.name + ' · ' + race.meters + ' m (' + laps + ' laps) · ' + race.blurb;
    const dpr = window.devicePixelRatio || 1;
    cv.width = cv.clientWidth * dpr;
    cv.height = cv.clientHeight * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const H = cv.clientHeight;
    const r = H * 0.36;
    const hl = r * 1.57;
    const cx = cv.clientWidth / 2;
    const cy = H / 2;
    const pt = (p) => {
      p = ((p % C.LAP) + C.LAP) % C.LAP;
      if (p < 10) return [cx - hl + (p / 10) * 2 * hl, cy + r];
      if (p < 20) { const t = Math.PI / 2 - ((p - 10) / 10) * Math.PI; return [cx + hl + r * Math.cos(t), cy + r * Math.sin(t)]; }
      if (p < 30) return [cx + hl - ((p - 20) / 10) * 2 * hl, cy - r];
      const t = -Math.PI / 2 - ((p - 30) / 10) * Math.PI;
      return [cx - hl + r * Math.cos(t), cy + r * Math.sin(t)];
    };
    ctx.strokeStyle = '#c89a6a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let p = 0; p <= C.LAP; p += 0.25) { const [x, y] = pt(p); if (p === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    const mark = (p, color) => { const [x, y] = pt(p); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); };
    mark(race.startOffset, '#1f6fd0');
    mark(C.FINISH_LAP_POS, '#111');
  }

  function buildSetup(stage, seed, aiCount, archetypes, teamName) {
    const s = app.setup;
    const rand = Kiri.rng(seed);
    const difficulty = s.difficulty;
    const personalities = rand.shuffle(Kiri.DIFFICULTY[difficulty].pool);
    const names = rand.shuffle(HORSE_NAMES);
    const n = aiCount || s.aiTeams;
    const teams = [{ name: teamName || s.teamName, color: HUMAN_COLOR, controller: 'human', archetypes: (archetypes || s.archetypes).slice(), riderNames: [names[0], names[1]] }];
    for (let i = 0; i < n; i++) {
      teams.push({
        name: TEAM_NAMES[i], color: TEAM_COLORS[i], controller: personalities[i % personalities.length],
        archetypes: AI_ARCHES[(i + seed) % AI_ARCHES.length], riderNames: [names[2 + i * 2], names[3 + i * 2]],
      });
    }
    return { stage, teams, seed, difficulty };
  }

  function startQuick() {
    const seed = Math.floor(Math.random() * 100000);
    app.tour = null;
    startRace(buildSetup(Kiri.PRESET_STAGES[1], seed, 3, ['stayer', 'closer'], 'Talli Sisu'));
  }

  function startTour() {
    const seed = Math.floor(Math.random() * 100000);
    app.tour = Kiri.createTour(seed);
    app.tourSetup = buildSetup(app.tour.stages[0], seed);
    startRace(Object.assign({}, app.tourSetup, { stage: app.tour.stages[0], seed: seed }));
  }

  function startRace(setup) {
    app.raceSetup = setup;
    app.difficulty = setup.difficulty || 'normal';
    app.race = Kiri.createRace(setup);
    app.orders = {};
    app.selected = null;
    app.busy = false;
    defaultOrders();
    autosave();
    raceScreen();
  }

  function autosave(race) {
    Kiri.Store.writeSave({
      race: race || app.race, raceSetup: app.raceSetup, tour: app.tour, tourSetup: app.tourSetup || null,
      orders: app.orders, difficulty: app.difficulty,
    });
  }

  function continueSaved(save) {
    app.raceSetup = save.raceSetup;
    app.race = save.race;
    app.tour = save.tour || null;
    app.tourSetup = save.tourSetup || null;
    app.difficulty = save.difficulty || 'normal';
    app.orders = save.orders || {};
    app.selected = null;
    app.busy = false;
    defaultOrders();
    if (app.race.over) resultsScreen();
    else raceScreen();
  }

  function humanRiders() { return app.race.riders.filter((r) => r.team === 0); }

  function defaultOrders() {
    for (const r of humanRiders()) {
      if (r.finished) continue;
      const legal = Kiri.legalEfforts(app.race, r);
      const prev = app.orders[r.id] ? app.orders[r.id].effort : 5;
      const effort = legal.includes(prev) ? prev : legal.filter((e) => e <= prev).pop() || legal[0];
      app.orders[r.id] = { effort, lane: 0 };
    }
    const live = humanRiders().filter((r) => !r.finished);
    if (!live.some((r) => r.id === app.selected)) app.selected = live.length ? live[0].id : null;
  }

  // ---------- Race ----------
  function raceScreen() {
    app.screen = 'race';
    const race = app.race;
    const tourLabel = app.tour ? '<span class="chip">Series race ' + (app.tour.index + 1) + '/3</span>' : '';
    show('<div class="race">' +
      '<div class="topbar"><span class="logo-sm">KIR<span>I</span></span><span class="stage-name">' + esc(race.stage.name) + ' ' + race.stage.meters + ' m</span>' + tourLabel +
      '<span class="chip">' + Kiri.DIFFICULTY[app.difficulty].name + '</span><span class="chip" id="turnChip"></span><span class="chip" id="toGo"></span><span class="spacer"></span>' +
      '<button class="btn" id="muteBtn" title="Sound on/off"></button><button class="btn" id="rulesBtn">Rules</button><button class="btn" id="quitBtn">Quit</button></div>' +
      '<div class="track-wrap"><canvas id="track"></canvas><div class="tooltip" id="tip" hidden></div></div>' +
      '<canvas id="profile" title="Distance covered by every horse"></canvas>' +
      '<div class="race-main"><div class="controls"><div class="rider-cards" id="cards"></div>' +
      '<div class="ride-row"><button class="btn primary big" id="rideBtn">Drive ▶</button>' +
      '<span class="muted small kbd-hint"><kbd>1</kbd>–<kbd>9</kbd> speed · <kbd>←</kbd>/<kbd>→</kbd> inside/outside · <kbd>Tab</kbd> switch horse · <kbd>Enter</kbd> drive</span>' +
      '<span class="muted small" id="hint"></span></div></div>' +
      '<div class="side"><div class="card"><h3>Race</h3><div id="standings"></div></div><div class="card"><h3>Race log</h3><div class="log" id="log"></div></div></div></div></div>');

    app.renderer = new Kiri.Renderer(root.querySelector('#track'), root.querySelector('#profile'));
    app.renderer.setState(race, 0);
    const tip = root.querySelector('#tip');
    app.renderer.onHover = (r, x, y) => {
      if (!r) { tip.hidden = true; return; }
      const st = app.race.riders[r.id];
      tip.hidden = false;
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
      tip.innerHTML = '<b>' + (st.id + 1) + ' ' + esc(UI.riderName(st)) + '</b> · ' + esc(app.race.teams[st.team].name) +
        (app.race.teams[st.team].controller !== 'human' ? ' (' + Kiri.PERSONALITIES[app.race.teams[st.team].controller].name + ')' : '') +
        '<br>' + C.ARCHETYPES[st.archetype].name + ' · ' + UI.LANE_NAMES[st.lane] + ' · energy ' + st.energy + '/' + st.maxEnergy + ' · strain ' + st.strain + (st.crack ? ' · galloping' : '');
    };
    root.querySelector('#rideBtn').onclick = ride;
    root.querySelector('#quitBtn').onclick = () => {
      if (confirm('Leave this race? Your progress will be lost.')) { Kiri.Store.clearSave(); titleScreen(); }
    };
    const mute = root.querySelector('#muteBtn');
    const paintMute = () => { mute.textContent = Kiri.Sound.isMuted() ? '🔇' : '🔊'; };
    mute.onclick = () => { Kiri.Sound.setMuted(!Kiri.Sound.isMuted()); paintMute(); };
    paintMute();
    root.querySelector('#rulesBtn').onclick = () => rulesScreen(raceScreen);
    root.querySelector('#cards').addEventListener('click', onCardClick);
    refreshRace();
  }

  function onCardClick(e) {
    if (app.busy) return;
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const id = Number(el.dataset.rider);
    if (el.dataset.act === 'effort') app.orders[id].effort = Number(el.dataset.v);
    if (el.dataset.act === 'lane') app.orders[id].lane = Number(el.dataset.v);
    app.selected = id;
    refreshControls();
  }

  function refreshControls() {
    const race = app.race;
    const cards = root.querySelector('#cards');
    if (!cards) return;
    cards.innerHTML = humanRiders().map((r) => UI.riderCard(race, r, app.orders[r.id] || { effort: 1, lane: 0 }, r.id === app.selected)).join('');
    const ghosts = humanRiders().filter((r) => !r.finished).map((r) => {
      const o = app.orders[r.id];
      const p = Kiri.previewOrder(race, r.id, o);
      return { id: r.id, square: p.reach, lane: p.lane, label: String(o.effort) };
    });
    app.renderer.setGhosts(ghosts, app.selected);
    root.querySelector('#rideBtn').disabled = app.busy || race.over;
    root.querySelector('#hint').textContent = UI.positionHint();
  }

  function refreshRace() {
    const race = app.race;
    root.querySelector('#turnChip').textContent = 'Turn ' + Math.min(race.turn, C.TURN_CAP) + ' / ' + C.TURN_CAP;
    const mine = humanRiders().filter((r) => !r.finished);
    const best = mine.length ? Math.max.apply(null, mine.map((r) => r.square)) : race.stage.finish;
    root.querySelector('#toGo').textContent = mine.length ? (race.stage.finish - best) * C.SEGMENT_M + ' m to go' : 'Your horses are home';
    root.querySelector('#standings').innerHTML = UI.standingsTable(race, 0);
    root.querySelector('#log').innerHTML = UI.logHtml(race, 0);
    refreshControls();
  }

  function aiOrders(state) {
    const rand = Kiri.rng(app.raceSetup.seed * 1009 + state.turn);
    const orders = {};
    for (const t of state.teams) if (t.controller !== 'human') Object.assign(orders, Kiri.chooseOrders(state, t.id, rand, app.difficulty));
    return orders;
  }

  function turnSounds(state) {
    const entries = state.log.filter((e) => e.turn === state.turn - 1);
    const has = (pred) => entries.some((e) => e.notes.some(pred));
    if (has((n) => n.startsWith('finishes'))) Kiri.Sound.play('finish');
    // The bell rings as the leaders start the last lap.
    const lastLap = state.stage.finish - C.LAP;
    if (entries.some((e) => e.from < lastLap && e.to >= lastLap) && !state.log.some((e) => e.turn < state.turn - 1 && e.to >= lastLap)) Kiri.Sound.play('sprint');
    if (entries.some((e) => e.cracked && state.riders[e.rider].team === 0)) Kiri.Sound.play('crack');
  }

  function ride() {
    if (app.busy || app.race.over) return;
    const prev = app.race;
    const orders = Object.assign(aiOrders(prev), {});
    for (const r of humanRiders()) if (!r.finished) orders[r.id] = app.orders[r.id];
    const next = Kiri.resolveTurn(prev, orders);
    // Save the resolved turn now, so a reload mid-animation doesn't replay it.
    autosave(next);
    app.busy = true;
    Kiri.Sound.play('ride');
    refreshControls();
    app.renderer.animateTo(next, () => {
      app.race = next;
      app.busy = false;
      defaultOrders();
      if (app.screen !== 'race') return;
      turnSounds(next);
      refreshRace();
      if (next.over) setTimeout(resultsScreen, 900);
      // Skip ahead automatically once both human riders are home.
      else if (humanRiders().every((r) => r.finished)) setTimeout(ride, 250);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (app.screen !== 'race' || app.busy || !app.race || app.race.over) return;
    if (e.target.tagName === 'INPUT') return;
    const id = app.selected;
    if (id === null) return;
    const r = app.race.riders[id];
    if (/^[1-9]$/.test(e.key)) {
      const v = Number(e.key);
      if (Kiri.legalEfforts(app.race, r).includes(v)) { app.orders[id].effort = v; refreshControls(); }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault(); app.orders[id].lane = Math.max(-1, app.orders[id].lane - 1); refreshControls();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault(); app.orders[id].lane = Math.min(1, app.orders[id].lane + 1); refreshControls();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const live = humanRiders().filter((x) => !x.finished);
      const i = live.findIndex((x) => x.id === id);
      app.selected = live[(i + 1) % live.length].id;
      refreshControls();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      ride();
    }
  });

  // ---------- Results ----------
  function resultsTable(state, rows, pointsOf, human) {
    return '<table class="results"><tr><th>#</th><th>Horse</th><th>Stable</th><th>Type</th><th>Prize</th></tr>' + rows.map((row, i) => {
      const r = state.riders[row.id];
      return '<tr class="' + (r.team === human ? 'me' : '') + '"><td>' + (i + 1) + (r.capped ? '*' : '') + '</td><td>' + UI.dot(state, r, 20) + ' ' + esc(UI.riderName(r)) + '</td><td>' +
        esc(state.teams[r.team].name) + '</td><td>' + C.ARCHETYPES[r.archetype].name + '</td><td><b>' + UI.euros(pointsOf(row)) + '</b></td></tr>';
    }).join('') + '</table>';
  }

  function teamTable(state, teams) {
    return '<table class="results"><tr><th>#</th><th>Stable</th><th>Drives like</th><th>Earnings</th></tr>' + teams.map((t, i) => {
      const tm = state.teams[t.id];
      return '<tr class="' + (t.id === 0 ? 'me' : '') + '"><td>' + (i + 1) + '</td><td><span class="mini" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + tm.color + '"></span> ' + esc(tm.name) +
        '</td><td class="muted">' + (tm.controller === 'human' ? 'You' : Kiri.PERSONALITIES[tm.controller].name) + '</td><td><b>' + UI.euros(t.points) + '</b></td></tr>';
    }).join('') + '</table>';
  }

  // How each of the player's horses spent the race: turns in cover, in the death seat, wide.
  function tripSummary(race) {
    return race.riders.filter((r) => r.team === 0).map((r) => {
      const log = race.log.filter((e) => e.rider === r.id);
      const count = (pred) => log.filter(pred).length;
      const cover = count((e) => e.position === 'cover');
      return '<li><b>' + esc(UI.riderName(r)) + '</b>: ' + cover + (cover === 1 ? ' turn' : ' turns') + ' in cover, ' +
        count((e) => e.position === 'deathSeat') + ' in the death seat, ' + count((e) => e.notes.includes('wide in the curve')) + ' wide in a curve' +
        (count((e) => e.cracked) ? ', <span style="color:var(--bad)">galloped ' + count((e) => e.cracked) + '×</span>' : '') + '.</li>';
    }).join('');
  }

  function resultsScreen() {
    app.screen = 'results';
    const race = app.race;
    const sd = Kiri.standings(race);
    const winner = race.riders[sd.riders[0].id];
    const myBest = sd.riders.find((row) => race.riders[row.id].team === 0);
    let tourBlock = '';
    let buttons;
    if (app.tour) {
      app.tour = Kiri.recordStage(app.tour, race);
      const ts = Kiri.tourStandings(app.tour, race);
      const done = Kiri.tourOver(app.tour);
      // Between races the save still holds the finished race and the series before this race
      // was recorded, so continuing re-shows this screen with the same totals.
      if (done) Kiri.Store.clearSave();
      tourBlock = '<h2 style="margin:26px 0 10px">' + (done ? 'Final series standings' : 'Series standings after race ' + app.tour.index) + '</h2><div class="two-col"><div class="card">' +
        resultsTable(race, ts.riders.slice(0, 10), (row) => row.points, 0) + '</div><div class="card">' + teamTable(race, ts.teams) + '</div></div>';
      buttons = done ? '<button class="btn primary big" data-go="title">Back to menu</button>'
        : '<button class="btn primary big" data-go="next">Race ' + (app.tour.index + 1) + ': ' + esc(app.tour.stages[app.tour.index].name) + ' ▶</button>';
    } else {
      Kiri.Store.clearSave();
      buttons = '<button class="btn primary big" data-go="rematch">Rematch</button><button class="btn" data-go="custom">New custom race</button><button class="btn" data-go="title">Menu</button>';
    }
    const podium = [1, 0, 2].map((i) => {
      const row = sd.riders[i];
      if (!row) return '';
      const r = race.riders[row.id];
      return '<div class="p' + (i + 1) + '"><div class="place">' + (i + 1) + '</div>' + UI.dot(race, r, 30) + '<div><b>' + esc(UI.riderName(r)) + '</b></div><div class="muted small">' + esc(race.teams[r.team].name) + '</div></div>';
    }).join('');
    const headline = winner.team === 0 ? esc(UI.riderName(winner)) + ' wins for your stable!' : esc(UI.riderName(winner)) + ' wins the ' + esc(race.stage.name);
    show('<div class="page"><div class="page-head"><div><h1>' + headline + '</h1><div class="muted">Your best horse: ' +
      myBest.place + '. place · ' + race.stage.meters + ' m in ' + (race.turn - 1) + ' turns</div></div></div>' +
      '<div class="podium">' + podium + '</div>' +
      '<div class="card" style="margin-bottom:14px"><h3 style="margin-bottom:6px">Your trip</h3><ul style="margin:0;padding-left:18px">' + tripSummary(race) + '</ul></div>' +
      '<div class="two-col"><div class="card"><h3 style="margin-bottom:8px">Result</h3>' + resultsTable(race, sd.riders, (row) => row.points, 0) +
      (race.riders.some((r) => r.capped) ? '<div class="muted small">* still on the track at the turn cap</div>' : '') +
      '</div><div class="card"><h3 style="margin-bottom:8px">Stables</h3>' + teamTable(race, sd.teams) + '</div></div>' + tourBlock +
      '<div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap" id="resBtns">' + buttons + '</div></div>');
    root.querySelector('#resBtns').addEventListener('click', (e) => {
      const go = e.target.dataset.go;
      if (go === 'title') titleScreen();
      if (go === 'custom') setupScreen('custom');
      if (go === 'rematch') startRace(app.raceSetup);
      if (go === 'next') startRace(Object.assign({}, app.tourSetup, { stage: app.tour.stages[app.tour.index], seed: app.tour.seed + app.tour.index }));
    });
  }

  // ---------- Rules ----------
  function rulesScreen(back) {
    const prevScreen = app.screen;
    app.screen = 'rules';
    const costs = C.EFFORT_COST.slice(1).map((c, i) => '<td>' + (i + 1) + '</td>').join('');
    const costRow = C.EFFORT_COST.slice(1).map((c) => '<td><b>' + c + '</b></td>').join('');
    const A = C.ARCHETYPES;
    show('<div class="page rules"><div class="page-head"><h1>How to play</h1><button class="btn" id="back">← Back</button></div><div class="card">' +
      '<p>You drive two trotters from your stable against AI stables on a 1000 m oval. Horses run counter-clockwise, and lane 1 is the rail. Each turn every horse gets a <b>speed</b> from 1 to 9 and a lane move (<b>inside</b>, <b>keep</b> or <b>outside</b>). Then all horses move at once, starting with the one in front. Prize money goes to the first eight.</p>' +
      '<h2>Moving</h2><p>Speed S gives a budget of 2×S. A track segment is 25 m. Each segment costs <b>2</b> on the straights. In the curves the outer lanes are longer: lanes 1–2 cost <b>2</b>, lane 3 costs <b>3</b> and lane 4 costs <b>4</b>. Moving out pays the outer lane\'s price straight away.</p>' +
      '<p>A horse can move only one lane per turn, and never into a lane where another horse is right alongside it. That is how you get <b>boxed in</b> on the rail. If the segment you would reach is full, you stop on the nearest free one behind it.</p>' +
      '<h2>Energy and position</h2><table class="results" style="width:auto"><tr><td>Speed</td>' + costs + '</tr><tr><td>Base cost</td>' + costRow + '</tr></table>' +
      '<p>The base cost is multiplied by where the horse is at the start of the turn:</p><ul>' +
      '<li><b>In cover</b> (a horse right in front, same lane): ×' + C.COVER_MULT[0] + ' on the rail, ×' + C.COVER_MULT[1] + ' in lane 2, ×' + C.COVER_MULT[2] + ' in lanes 3–4.</li>' +
      '<li><b>Open</b> (nobody in front): ×' + C.OPEN_MULT.join(' / ×') + ' in lanes 1 / 2 / 3 / 4.</li>' +
      '<li><b>Death seat</b> (lane 2, outside a horse on the rail, nobody in front): ×' + C.DEATH_SEAT_MULT + ', and strain rises 1 more.</li>' +
      '<li><b>Wide in a curve</b> (lane 3 or 4 on a curve segment): a further ×' + C.WIDE_CURVE_MULT + '.</li></ul>' +
      '<p>An exhausted horse (energy 0) can still trot at speed 1–3 for free.</p>' +
      '<h2>Strain and galloping</h2><p>Strain runs from 0 to 10. Each turn it changes by speed − 5: one less in cover, one more in the death seat. At 10 the horse <b>breaks into a gallop</b>, and the driver has to settle it: its speed is capped at 3 for two turns.</p>' +
      '<h2>Horses</h2><ul><li><b>' + A.stayer.name + '</b>: ' + A.stayer.energy + ' energy. ' + A.stayer.blurb + '</li>' +
      '<li><b>' + A.closer.name + '</b>: ' + A.closer.energy + ' energy. ' + A.closer.blurb + '</li>' +
      '<li><b>' + A.gate.name + '</b>: ' + A.gate.energy + ' energy. ' + A.gate.blurb + '</li></ul>' +
      '<h2>Prize money</h2><p>' + C.PURSE.map((p) => UI.euros(p)).join(' · ') + '. After ' + C.TURN_CAP + ' turns the race is stopped.</p>' +
      '<h2>Rivals</h2><ul>' + Object.keys(Kiri.PERSONALITIES).map((k) => '<li><b>' + Kiri.PERSONALITIES[k].name + '</b>: ' + Kiri.PERSONALITIES[k].blurb + '</li>').join('') + '</ul>' +
      '<h2>Tips</h2><ul><li>The best trip is usually in the pocket: on the rail, right behind the leader.</li>' +
      '<li>Don\'t sit in the death seat for long. If you go to the front, go all the way.</li>' +
      '<li>Make your move from lane 3 on a straight. In a curve it costs much more.</li>' +
      '<li>Pull out of the pocket before the horse outside you shuts the door.</li></ul></div></div>');
    root.querySelector('#back').onclick = () => { if (prevScreen === 'race') raceScreen(); else back(); };
  }

  titleScreen();
  window.KiriApp = app;
})(window.Kiri = window.Kiri || {});
