// Screens, game flow and input.
(function (Kiri) {
  'use strict';
  const C = Kiri.C;
  const UI = Kiri.UI;
  const esc = UI.esc;
  const root = document.getElementById('app');

  const TEAM_NAMES = ['Pohjola Pro', 'Revontuli RT', 'Kalevala Velo', 'Saimaa Speed', 'Lappi Racing'];
  const TEAM_COLORS = ['#2f6fdf', '#1f9d57', '#8e44ad', '#d4a106', '#0f8f8f'];
  const HUMAN_COLOR = '#e4572e';
  const SURNAMES = ['Virtanen', 'Korhonen', 'Nieminen', 'Mäkinen', 'Hämäläinen', 'Laine', 'Heikkinen', 'Koskinen', 'Järvinen', 'Lehtonen',
    'Saarinen', 'Salminen', 'Kinnunen', 'Turunen', 'Salo', 'Lindqvist', 'Rantanen', 'Karjalainen', 'Lahtinen', 'Peltonen'];
  const AI_ARCHES = [['rouleur', 'sprinter'], ['climber', 'rouleur'], ['sprinter', 'climber'], ['rouleur', 'climber'], ['climber', 'sprinter']];

  const app = {
    screen: 'title',
    setup: {
      stage: 0, seed: 42, wind: 'default', aiTeams: 3, archetypes: ['rouleur', 'sprinter'], teamName: 'Sisu Cycling',
    },
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
    show('<div class="title-screen"><div class="title-card">' +
      '<div class="logo">KIR<span>I</span></div>' +
      '<div class="tagline">A tactical cycling race. Spend your energy wisely, ride in the wind shadow, and time your final push.</div>' +
      '<div class="menu">' +
      '<button class="btn primary" data-go="quick">Quick race</button>' +
      '<button class="btn" data-go="custom">Custom race</button>' +
      '<button class="btn" data-go="tour">Tour: 3 stages</button>' +
      '<button class="btn" data-go="rules">How to play</button>' +
      '</div><p class="muted small" style="margin-top:28px">Two riders. Nine effort levels. One finish line.</p></div></div>');
    root.querySelector('.menu').addEventListener('click', (e) => {
      const go = e.target.dataset.go;
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
      ? '<div class="field"><label>Stages</label><div>1. Rannikko · 2. Harju · 3. Kivitie</div><div class="muted small">Points add up over all three stages. Energy and strain reset between stages.</div></div>'
      : '<div class="field"><label>Stage</label>' + seg('stage', [[0, 'Rannikko'], [1, 'Harju'], [2, 'Kivitie'], ['random', 'Random']], s.stage) +
        (s.stage === 'random' ? '<div style="margin-top:6px">Seed <input type="number" id="seed" value="' + esc(s.seed) + '"></div>' : '') +
        '<canvas class="stage-preview" id="stagePreview"></canvas><div class="muted small" id="stageBlurb"></div></div>' +
        '<div class="field"><label>Wind</label>' + seg('wind', [['default', 'Stage default'], ['calm', 'Calm'], ['head', 'Headwind'], ['crossLeft', 'Cross ↓'], ['crossRight', 'Cross ↑']], s.wind) + '</div>';
    const archOpts = Object.keys(C.ARCHETYPES).map((k) => [k, C.ARCHETYPES[k].name]);
    show('<div class="page"><div class="page-head"><div><h1>' + (tour ? 'Tour setup' : 'Custom race') + '</h1><div class="muted">Set up the race, then ride.</div></div>' +
      '<button class="btn" id="back">← Back</button></div>' +
      '<div class="setup-grid"><div class="card">' + stageField +
      '<div class="field"><label>AI teams</label>' + seg('aiTeams', [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], s.aiTeams) + '<div class="muted small">Each AI team has a personality: Diesel, Wheelsucker, Attacker or Planner.</div></div>' +
      '</div><div class="card">' +
      '<div class="field"><label>Team name</label><input type="text" id="teamName" maxlength="24" value="' + esc(s.teamName) + '" style="width:100%"></div>' +
      [0, 1].map((i) => '<div class="field"><label>Rider ' + (i + 1) + '</label>' + seg('arch' + i, archOpts, s.archetypes[i]) +
        '<div class="muted small">' + esc(C.ARCHETYPES[s.archetypes[i]].blurb) + ' Energy ' + C.ARCHETYPES[s.archetypes[i]].energy + '.</div></div>').join('') +
      '</div></div><div style="margin-top:18px;text-align:right"><button class="btn primary big" id="start">' + (tour ? 'Start the tour ▶' : 'Start race ▶') + '</button></div></div>');

    root.querySelector('#back').onclick = titleScreen;
    root.querySelectorAll('[data-seg]').forEach((el) => el.addEventListener('click', (e) => {
      const v = e.target.dataset.v;
      if (v === undefined) return;
      const k = el.dataset.seg;
      if (k === 'stage') s.stage = v === 'random' ? 'random' : Number(v);
      else if (k === 'wind') s.wind = v;
      else if (k === 'aiTeams') s.aiTeams = Number(v);
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
      s.teamName = root.querySelector('#teamName').value.trim() || 'Sisu Cycling';
      if (tour) { startTour(); return; }
      app.tour = null;
      const seed = s.stage === 'random' ? Number(s.seed) * 13 + 5 : Math.floor(Math.random() * 100000);
      startRace(buildSetup(setupStage(), s.wind === 'default' ? null : s.wind, seed));
    };
  }

  function drawStagePreview() {
    const cv = root.querySelector('#stagePreview');
    if (!cv) return;
    const stage = setupStage();
    const blurb = root.querySelector('#stageBlurb');
    blurb.textContent = stage.name + ' · ' + stage.finish + ' squares · ' + C.WIND_NAMES[stage.wind] + '. ' + stage.blurb;
    const dpr = window.devicePixelRatio || 1;
    cv.width = cv.clientWidth * dpr;
    cv.height = cv.clientHeight * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    let h = 0;
    const pts = [0];
    for (let i = 0; i < stage.finish; i++) {
      const t = stage.squares[i].terrain;
      h += t === 'climb' ? 1 : t === 'descent' ? -1 : 0;
      pts.push(h);
    }
    const lo = Math.min.apply(null, pts);
    const hi = Math.max.apply(null, pts);
    const sx = (i) => (i / stage.finish) * W;
    const sy = (v) => H - 8 - ((v - lo) / Math.max(1, hi - lo)) * (H - 20);
    for (let i = 0; i < stage.finish; i++) {
      const t = stage.squares[i].terrain;
      ctx.strokeStyle = { flat: '#9aa0a8', climb: '#c26a2b', descent: '#3f7fbf', cobbles: '#7b6f5a' }[t];
      ctx.lineWidth = t === 'cobbles' ? 5 : 3;
      ctx.beginPath(); ctx.moveTo(sx(i), sy(pts[i])); ctx.lineTo(sx(i + 1), sy(pts[i + 1])); ctx.stroke();
    }
    ctx.fillStyle = '#1f9d57';
    ctx.fillRect(sx(stage.sprint) - 1, 0, 2, H);
  }

  function buildSetup(stage, wind, seed, aiCount, archetypes, teamName) {
    const s = app.setup;
    const rand = Kiri.rng(seed);
    const personalities = rand.shuffle(Object.keys(Kiri.PERSONALITIES));
    const names = rand.shuffle(SURNAMES);
    const n = aiCount || s.aiTeams;
    const teams = [{ name: teamName || s.teamName, color: HUMAN_COLOR, controller: 'human', archetypes: (archetypes || s.archetypes).slice(), riderNames: [names[0], names[1]] }];
    for (let i = 0; i < n; i++) {
      teams.push({
        name: TEAM_NAMES[i], color: TEAM_COLORS[i], controller: personalities[i % personalities.length],
        archetypes: AI_ARCHES[(i + seed) % AI_ARCHES.length], riderNames: [names[2 + i * 2], names[3 + i * 2]],
      });
    }
    return { stage, wind, teams, seed };
  }

  function startQuick() {
    const seed = Math.floor(Math.random() * 100000);
    app.tour = null;
    startRace(buildSetup(Kiri.PRESET_STAGES[seed % 3], null, seed, 3, ['rouleur', 'sprinter'], 'Sisu Cycling'));
  }

  function startTour() {
    const seed = Math.floor(Math.random() * 100000);
    app.tour = Kiri.createTour(seed);
    app.tourSetup = buildSetup(app.tour.stages[0], null, seed);
    startRace(Object.assign({}, app.tourSetup, { stage: app.tour.stages[0], seed: seed }));
  }

  function startRace(setup) {
    app.raceSetup = setup;
    app.race = Kiri.createRace(setup);
    app.orders = {};
    app.selected = null;
    app.busy = false;
    defaultOrders();
    raceScreen();
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
    const tourLabel = app.tour ? '<span class="chip">Tour stage ' + (app.tour.index + 1) + '/3</span>' : '';
    show('<div class="race">' +
      '<div class="topbar"><span class="logo-sm">KIR<span>I</span></span><span class="stage-name">' + esc(race.stage.name) + '</span>' + tourLabel +
      UI.windChip(race.wind) + '<span class="chip" id="turnChip"></span><span class="chip" id="toGo"></span><span class="spacer"></span>' +
      '<button class="btn" id="rulesBtn">Rules</button><button class="btn" id="quitBtn">Quit</button></div>' +
      '<div class="track-wrap"><canvas id="track"></canvas><div class="track-tools"><button class="btn" id="followBtn">Follow my riders</button></div><div class="tooltip" id="tip" hidden></div></div>' +
      '<canvas id="profile" title="Stage profile: click to look there"></canvas>' +
      '<div class="race-main"><div class="controls"><div class="rider-cards" id="cards"></div>' +
      '<div class="ride-row"><button class="btn primary big" id="rideBtn">Ride ▶</button>' +
      '<span class="muted small"><kbd>1</kbd>–<kbd>9</kbd> effort · <kbd>←</kbd>/<kbd>→</kbd> lane · <kbd>Tab</kbd> switch rider · <kbd>Enter</kbd> ride</span>' +
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
        '<br>' + C.ARCHETYPES[st.archetype].name + ' · energy ' + st.energy + '/' + st.maxEnergy + ' · strain ' + st.strain + (st.crack ? ' · cracked' : '') + ' · ' + st.points + ' pts';
    };
    root.querySelector('#rideBtn').onclick = ride;
    root.querySelector('#followBtn').onclick = () => app.renderer.refollow();
    root.querySelector('#quitBtn').onclick = () => { if (confirm('Leave this race?')) titleScreen(); };
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
      const w = Kiri.squareAt(race.stage, p.reach).width;
      return { id: r.id, square: p.reach, lane: Math.max(0, Math.min(w - 1, r.lane + o.lane)), label: String(o.effort) };
    });
    app.renderer.setGhosts(ghosts, app.selected);
    root.querySelector('#rideBtn').disabled = app.busy || race.over;
    root.querySelector('#hint').textContent = UI.shelterHint(race.wind);
  }

  function refreshRace() {
    const race = app.race;
    root.querySelector('#turnChip').textContent = 'Turn ' + Math.min(race.turn, C.TURN_CAP) + ' / ' + C.TURN_CAP;
    const mine = humanRiders().filter((r) => !r.finished);
    const best = mine.length ? Math.max.apply(null, mine.map((r) => r.square)) : race.stage.finish;
    root.querySelector('#toGo').textContent = mine.length ? (race.stage.finish - best) + ' squares to go' : 'Your riders are home';
    root.querySelector('#standings').innerHTML = UI.standingsTable(race, 0);
    root.querySelector('#log').innerHTML = UI.logHtml(race, 0);
    refreshControls();
  }

  function aiOrders(state) {
    const rand = Kiri.rng(app.raceSetup.seed * 1009 + state.turn);
    const orders = {};
    for (const t of state.teams) if (t.controller !== 'human') Object.assign(orders, Kiri.chooseOrders(state, t.id, rand));
    return orders;
  }

  function ride() {
    if (app.busy || app.race.over) return;
    const prev = app.race;
    const orders = Object.assign(aiOrders(prev), {});
    for (const r of humanRiders()) if (!r.finished) orders[r.id] = app.orders[r.id];
    const next = Kiri.resolveTurn(prev, orders);
    app.busy = true;
    refreshControls();
    app.renderer.animateTo(next, () => {
      app.race = next;
      app.busy = false;
      defaultOrders();
      if (app.screen !== 'race') return;
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
    return '<table class="results"><tr><th>#</th><th>Rider</th><th>Team</th><th>Type</th><th>Pts</th></tr>' + rows.map((row, i) => {
      const r = state.riders[row.id];
      return '<tr class="' + (r.team === human ? 'me' : '') + '"><td>' + (i + 1) + (r.capped ? '*' : '') + '</td><td>' + UI.dot(state, r, 20) + ' ' + esc(UI.riderName(r)) + '</td><td>' +
        esc(state.teams[r.team].name) + '</td><td>' + C.ARCHETYPES[r.archetype].name + '</td><td><b>' + pointsOf(row) + '</b></td></tr>';
    }).join('') + '</table>';
  }

  function teamTable(state, teams) {
    return '<table class="results"><tr><th>#</th><th>Team</th><th>Rides like</th><th>Pts</th></tr>' + teams.map((t, i) => {
      const tm = state.teams[t.id];
      return '<tr class="' + (t.id === 0 ? 'me' : '') + '"><td>' + (i + 1) + '</td><td><span class="mini" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + tm.color + '"></span> ' + esc(tm.name) +
        '</td><td class="muted">' + (tm.controller === 'human' ? 'You' : Kiri.PERSONALITIES[tm.controller].name) + '</td><td><b>' + t.points + '</b></td></tr>';
    }).join('') + '</table>';
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
      tourBlock = '<h2 style="margin:26px 0 10px">' + (done ? 'Final tour standings' : 'Tour standings after stage ' + app.tour.index) + '</h2><div class="two-col"><div class="card">' +
        resultsTable(race, ts.riders.slice(0, 10), (row) => row.points, 0) + '</div><div class="card">' + teamTable(race, ts.teams) + '</div></div>';
      buttons = done ? '<button class="btn primary big" data-go="title">Back to menu</button>'
        : '<button class="btn primary big" data-go="next">Stage ' + (app.tour.index + 1) + ': ' + esc(app.tour.stages[app.tour.index].name) + ' ▶</button>';
    } else {
      buttons = '<button class="btn primary big" data-go="rematch">Rematch</button><button class="btn" data-go="custom">New custom race</button><button class="btn" data-go="title">Menu</button>';
    }
    const podium = [1, 0, 2].map((i) => {
      const row = sd.riders[i];
      if (!row) return '';
      const r = race.riders[row.id];
      return '<div class="p' + (i + 1) + '"><div class="place">' + (i + 1) + '</div>' + UI.dot(race, r, 30) + '<div><b>' + esc(UI.riderName(r)) + '</b></div><div class="muted small">' + esc(race.teams[r.team].name) + '</div></div>';
    }).join('');
    const headline = winner.team === 0 ? 'Stage win for ' + esc(UI.riderName(winner)) + '!' : esc(UI.riderName(winner)) + ' wins ' + esc(race.stage.name);
    show('<div class="page"><div class="page-head"><div><h1>' + headline + '</h1><div class="muted">Your best rider: ' +
      myBest.place + '. place · decided in ' + (race.turn - 1) + ' turns</div></div></div>' +
      '<div class="podium">' + podium + '</div>' +
      '<div class="two-col"><div class="card"><h3 style="margin-bottom:8px">Stage result</h3>' + resultsTable(race, sd.riders, (row) => row.points, 0) +
      (race.riders.some((r) => r.capped) ? '<div class="muted small">* still racing at the turn cap</div>' : '') +
      '</div><div class="card"><h3 style="margin-bottom:8px">Teams</h3>' + teamTable(race, sd.teams) + '</div></div>' + tourBlock +
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
    show('<div class="page rules"><div class="page-head"><h1>How to play</h1><button class="btn" id="back">← Back</button></div><div class="card">' +
      '<p>You manage two riders in a race against AI teams. Each turn every rider picks an <b>effort</b> from 1 to 9 and a <b>lane</b>. Then everyone moves at once, starting from the front of the race. The first rider over the line wins the stage; points decide the team classification.</p>' +
      '<h2>Moving</h2><p>Effort E gives a budget of 2×E. Each square costs budget to enter: <b>flat 2</b>, <b>descent 1</b>, <b>cobbles 3</b>, <b>climb 4</b>. So effort 6 means 6 squares on the flat but only 3 up a climb. You always move at least one square.</p>' +
      '<p>If the square you reach is full, you stop on the furthest square behind it with a free lane. You take the free lane closest to your lane choice.</p>' +
      '<h2>Energy</h2><table class="results" style="width:auto"><tr><td>Effort</td>' + costs + '</tr><tr><td>Energy cost</td>' + costRow + '</tr></table>' +
      '<p>Energy has to last the whole stage. Freewheeling down a descent at effort 4 or less recovers 2 energy.</p>' +
      '<h2>Strain</h2><p>Strain shows short-term fatigue, from 0 to 10. Each turn it changes by effort − 5, so effort 8 adds 3 and effort 3 removes 2. If it hits 10 the rider <b>cracks</b>: for two turns their effort is capped at 3.</p>' +
      '<h2>Shelter and wind</h2><p>A rider who starts the turn in another rider\'s wind shadow pays less energy and sheds an extra point of strain. Where the shadow is depends on the wind:</p><ul>' +
      '<li><b>Calm</b> or <b>headwind</b>: directly behind a rider. Saves 30% in calm, 50% in a headwind.</li>' +
      '<li><b>Crosswind</b>: one square behind and one lane away from the wind. Saves 40%. The rider at the edge of the road in the gutter gets no shelter, so echelons form.</li>' +
      '<li>Nobody gets shelter on a climb.</li></ul>' +
      '<h2>Riders</h2><ul><li><b>Rouleur</b>: 110 energy, cobbles cost only 2.</li><li><b>Climber</b>: 100 energy, climbs cost only 3.</li>' +
      '<li><b>Sprinter</b>: 95 energy, climbs cost 5. <b>Kick</b>: in the last 12 squares, effort 7+ gives 2 extra squares.</li></ul>' +
      '<h2>Points</h2><p>Sprint line: 5 / 3 / 1 for the first three across. Finish: 15, 12, 10, 8, 6, 5, 4, 3, 2, 1. After 60 turns the race is stopped.</p>' +
      '<h2>Rivals</h2><ul>' + Object.keys(Kiri.PERSONALITIES).map((k) => '<li><b>' + Kiri.PERSONALITIES[k].name + '</b>: ' + Kiri.PERSONALITIES[k].blurb + '</li>').join('') + '</ul>' +
      '<h2>Tips</h2><ul><li>Effort 5 is strain-neutral. Above it you spend strain you need to recover later.</li><li>Before a climb, check your energy: climbs are slow and you get no shelter.</li>' +
      '<li>In a crosswind, pick your lane so you finish the turn diagonally behind someone.</li><li>Sprinters: save energy, stay close, and let the Kick do the work.</li></ul></div></div>');
    root.querySelector('#back').onclick = () => { if (prevScreen === 'race') raceScreen(); else back(); };
  }

  titleScreen();
  window.KiriApp = app;
})(window.Kiri = window.Kiri || {});
