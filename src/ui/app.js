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
  const HORSE_NAMES = ['Starfall', 'Storm Son', 'Lightning Lad', 'Wind Daughter', 'Golden Hoof', 'Northern Light', 'Little Thunder', 'Silverwing',
    'Frost Prince', 'Steady Flame', 'Summer Fling', 'North Star', 'Mist Maiden', 'Iron Mare', 'Frostlight', 'Dark Winter',
    'Wave Prince', 'Blazing Dawn', 'Sparkle', 'Ice Crystal'];
  const DIFFICULTY_BLURB = {
    easy: 'Rivals misjudge their pace and make their run late. Good for learning.',
    normal: 'A mixed field of all four driving styles.',
    hard: 'Mostly Tacticians, no mistakes, early drives for home. Same rules for everyone.',
  };
  const AI_ARCHES = [['stayer', 'closer'], ['gate', 'stayer'], ['closer', 'gate'], ['stayer', 'gate'], ['gate', 'closer']];

  const app = {
    screen: 'title',
    setup: {
      stage: 1, seed: 42, aiTeams: 5, archetypes: ['stayer', 'closer'], teamName: 'Talli Sisu',
      difficulty: Kiri.Store.prefs().difficulty,
    },
    difficulty: 'normal',
    myTeam: 0, // the stable this browser drives: 0 solo or host, 1 online guest
    online: null, // { role: 'host' | 'guest', host?: Kiri.OnlineHost, status } during online play
    race: null,
    raceSetup: null,
    tour: null,
    orders: {},
    selected: null,
    busy: false,
    renderer: null,
    back: null,
  };

  function driverLabel(team) {
    if (team.id === app.myTeam) return 'You';
    if (team.controller === 'human') return 'Your friend';
    return Kiri.PERSONALITIES[team.controller].name;
  }

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
      '<div class="logo">TRAVBAN<span>A</span></div>' +
      '<div class="tagline">Harness racing on the oval. Sit in cover, stay out of the death seat, and time your drive for home.</div>' +
      '<div class="menu">' + cont +
      '<button class="btn' + (save ? '' : ' primary') + '" data-go="quick">Quick race</button>' +
      '<button class="btn" data-go="custom">Custom race</button>' +
      '<button class="btn" data-go="tour">Series: 3 races</button>' +
      '<button class="btn" data-go="online">Play with a friend 🌐</button>' +
      '<button class="btn" data-go="rules">How to play</button>' +
      '</div><p class="muted small" style="margin-top:28px">Two trotters. Nine speeds. One finish post.</p></div></div>');
    root.querySelector('.menu').addEventListener('click', (e) => {
      const go = e.target.dataset.go;
      if (go === 'continue') continueSaved(save);
      if (go === 'quick') startQuick();
      if (go === 'custom') setupScreen('custom');
      if (go === 'tour') setupScreen('tour');
      if (go === 'online') onlineScreen();
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
    const hosting = mode === 'host';
    // Online games can have zero AI stables: just you and your friend.
    if (hosting && s.aiTeams > 4) s.aiTeams = 4;
    const aiOptions = (hosting ? [[0, '0']] : []).concat([[1, '1'], [2, '2'], [3, '3'], [4, '4']]).concat(hosting ? [] : [[5, '5']]);
    const stageField = tour
      ? '<div class="field"><label>Races</label><div>1. Mile 1609 m · 2. Classic 2100 m · 3. Long 2600 m</div><div class="muted small">Prize money adds up over all three races. Energy and strain reset between races.</div></div>'
      : '<div class="field"><label>Distance</label>' + seg('stage', [[0, 'Mile 1609 m'], [1, 'Classic 2100 m'], [2, 'Long 2600 m'], ['random', 'Random']], s.stage) +
        (s.stage === 'random' ? '<div style="margin-top:6px">Seed <input type="number" id="seed" value="' + esc(s.seed) + '"></div>' : '') +
        '<canvas class="stage-preview" id="stagePreview"></canvas><div class="muted small" id="stageBlurb"></div></div>';
    const archOpts = Object.keys(C.ARCHETYPES).map((k) => [k, C.ARCHETYPES[k].name]);
    const title = tour ? 'Series setup' : hosting ? 'Host a game' : 'Custom race';
    const sub = hosting ? 'Set up the race. Then you get a code and a link for your friend.' : 'Set up the race, then drive.';
    show('<div class="page"><div class="page-head"><div><h1>' + title + '</h1><div class="muted">' + sub + '</div></div>' +
      '<button class="btn" id="back">← Back</button></div>' +
      '<div class="setup-grid"><div class="card">' + stageField +
      '<div class="field"><label>AI stables</label>' + seg('aiTeams', aiOptions, s.aiTeams) + '<div class="muted small">Each AI stable has a driving style: ' + Object.keys(Kiri.PERSONALITIES).map((k) => Kiri.PERSONALITIES[k].name).join(', ') + '.</div></div>' +
      '<div class="field"><label>Difficulty</label>' + seg('difficulty', Object.keys(Kiri.DIFFICULTY).map((k) => [k, Kiri.DIFFICULTY[k].name]), s.difficulty) +
      '<div class="muted small">' + DIFFICULTY_BLURB[s.difficulty] + '</div></div>' +
      '</div><div class="card">' +
      '<div class="field"><label>Stable name</label><input type="text" id="teamName" maxlength="24" value="' + esc(s.teamName) + '" style="width:100%"></div>' +
      [0, 1].map((i) => '<div class="field"><label>Horse ' + (i + 1) + '</label>' + seg('arch' + i, archOpts, s.archetypes[i]) +
        '<div class="muted small">' + esc(C.ARCHETYPES[s.archetypes[i]].blurb) + ' Energy ' + C.ARCHETYPES[s.archetypes[i]].energy + '.</div></div>').join('') +
      '</div></div><div style="margin-top:18px;text-align:right"><button class="btn primary big" id="start">' + (tour ? 'Start the series ▶' : hosting ? 'Create game ▶' : 'Start race ▶') + '</button></div></div>');

    root.querySelector('#back').onclick = hosting ? onlineScreen : titleScreen;
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
      if (hosting) { hostLobby(); return; }
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
    // A full field: you plus five AI stables, 12 horses (spec 006).
    startRace(buildSetup(Kiri.PRESET_STAGES[1], seed, 5, ['stayer', 'closer'], 'Talli Sisu'));
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
    app.myTeam = 0;
    app.online = null;
    app.orders = {};
    app.selected = null;
    app.busy = false;
    defaultOrders();
    autosave();
    drawScreen();
  }

  // The post draw (spec 006): every horse's post position before the start, yours highlighted.
  function drawScreen() {
    app.screen = 'draw';
    const race = app.race;
    const rows = race.riders.slice().sort((a, b) => a.post - b.post).map((r) => {
      const team = race.teams[r.team];
      const mine = r.team === app.myTeam;
      return '<tr class="' + (mine ? 'mine' : '') + '"><td class="post-no">' + r.post + '</td><td>' + UI.dot(race, r) + ' ' + esc(UI.riderName(r)) +
        '</td><td class="muted">' + esc(team.name) + (mine ? ' <span class="chip good">You</span>' : '') + '</td></tr>';
    });
    const rowName = ['Front row', 'Second row', 'Third row'];
    let body = '';
    for (let i = 0; i < rows.length; i += C.LANES) {
      body += '<tr class="row-head"><td colspan="3">' + rowName[i / C.LANES] + '</td></tr>' + rows.slice(i, i + C.LANES).join('');
    }
    show('<div class="page"><div class="page-head"><div><h1>Post draw</h1><div class="muted">' + esc(race.stage.name) + ' ' + race.stage.meters + ' m · ' +
      race.riders.length + ' horses · autostart</div></div></div>' +
      '<div class="card"><p class="muted small" style="margin-top:0">Posts were drawn by lot. Post 1 starts on the rail in the front row; the back rows start a length behind.</p>' +
      '<table class="draw-table">' + body + '</table></div>' +
      '<button class="btn primary big" id="goBtn" style="margin-top:16px">To the start ▶</button></div>');
    root.querySelector('#goBtn').onclick = raceScreen;
  }

  function autosave(race) {
    if (app.online) return; // online races are not saved in v1
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
    app.myTeam = 0;
    app.online = null;
    app.selected = null;
    app.busy = false;
    defaultOrders();
    if (app.race.over) resultsScreen();
    else raceScreen();
  }

  function humanRiders() { return app.race.riders.filter((r) => r.team === app.myTeam); }

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
    const friend = app.online && race.teams[1 - app.myTeam];
    const tourLabel = (app.tour ? '<span class="chip">Series race ' + (app.tour.index + 1) + '/3</span>' : '') +
      (friend ? '<span class="chip good">🌐 Online vs ' + esc(friend.name) + '</span>' : '');
    show('<div class="race">' +
      '<div class="topbar"><span class="logo-sm">TRAVBAN<span>A</span></span><span class="stage-name">' + esc(race.stage.name) + ' ' + race.stage.meters + ' m</span>' + tourLabel +
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
    app.renderer.setState(race, app.myTeam);
    const tip = root.querySelector('#tip');
    app.renderer.onHover = (r, x, y) => {
      if (!r) { tip.hidden = true; return; }
      const st = app.race.riders[r.id];
      tip.hidden = false;
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
      tip.innerHTML = '<b>' + (st.id + 1) + ' ' + esc(UI.riderName(st)) + '</b> · ' + esc(app.race.teams[st.team].name) +
        ' (' + driverLabel(app.race.teams[st.team]) + ')' +
        '<br>' + C.ARCHETYPES[st.archetype].name + ' · ' + UI.LANE_NAMES[st.lane] + ' · energy ' + st.energy + '/' + st.maxEnergy + ' · strain ' + st.strain + (st.crack ? ' · galloping' : '');
    };
    root.querySelector('#rideBtn').onclick = ride;
    root.querySelector('#quitBtn').onclick = () => {
      if (!confirm(app.online ? 'Leave the online race? Your friend will be told.' : 'Leave this race? Your progress will be lost.')) return;
      if (app.online) leaveOnline('quit');
      else Kiri.Store.clearSave();
      titleScreen();
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
    const btn = root.querySelector('#rideBtn');
    const home = humanRiders().every((r) => r.finished);
    btn.disabled = app.busy || race.over || (app.online && (app.online.locked || home));
    btn.textContent = app.online && app.online.locked ? 'Locked in ✓' : 'Drive ▶';
    let hint = UI.positionHint();
    if (app.online) {
      const friend = race.teams[1 - app.myTeam].name;
      if (home) hint = 'Your horses are home. Watching ' + friend + ' finish…';
      else if (app.online.locked) hint = app.online.friendReady ? 'Both locked in…' : 'Waiting for ' + friend + '…';
      else hint = app.online.friendReady ? friend + ' has locked in. Your move!' : friend + ' is choosing…';
    }
    root.querySelector('#hint').textContent = hint;
  }

  function refreshRace() {
    const race = app.race;
    root.querySelector('#turnChip').textContent = 'Turn ' + Math.min(race.turn, C.TURN_CAP) + ' / ' + C.TURN_CAP;
    const mine = humanRiders().filter((r) => !r.finished);
    const best = mine.length ? Math.max.apply(null, mine.map((r) => r.square)) : race.stage.finish;
    root.querySelector('#toGo').textContent = mine.length ? (race.stage.finish - best) * C.SEGMENT_M + ' m to go' : 'Your horses are home';
    root.querySelector('#standings').innerHTML = UI.standingsTable(race, app.myTeam);
    root.querySelector('#log').innerHTML = UI.logHtml(race, app.myTeam);
    refreshControls();
  }

  function turnSounds(state) {
    const entries = state.log.filter((e) => e.turn === state.turn - 1);
    const has = (pred) => entries.some((e) => e.notes.some(pred));
    if (has((n) => n.startsWith('finishes'))) Kiri.Sound.play('finish');
    // The bell rings as the leaders start the last lap.
    const lastLap = state.stage.finish - C.LAP;
    if (entries.some((e) => e.from < lastLap && e.to >= lastLap) && !state.log.some((e) => e.turn < state.turn - 1 && e.to >= lastLap)) Kiri.Sound.play('sprint');
    if (entries.some((e) => e.cracked && state.riders[e.rider].team === app.myTeam)) Kiri.Sound.play('crack');
  }

  function myOrders() {
    const orders = {};
    for (const r of humanRiders()) if (!r.finished) orders[r.id] = app.orders[r.id];
    return orders;
  }

  function ride() {
    if (app.busy || app.race.over) return;
    if (app.online) { lockIn(); return; }
    const prev = app.race;
    const orders = Object.assign(Kiri.aiOrdersFor(prev, app.raceSetup.seed, app.difficulty), myOrders());
    const next = Kiri.resolveTurn(prev, orders);
    // Save the resolved turn now, so a reload mid-animation doesn't replay it.
    autosave(next);
    playTurn(next);
  }

  // Animate a resolved turn (computed here, or received from the online host).
  function playTurn(next) {
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
      else if (app.online) onlineAfterTurn();
      // Skip ahead automatically once both human horses are home.
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
      return '<tr class="' + (t.id === app.myTeam ? 'me' : '') + '"><td>' + (i + 1) + '</td><td><span class="mini" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + tm.color + '"></span> ' + esc(tm.name) +
        '</td><td class="muted">' + driverLabel(tm) + '</td><td><b>' + UI.euros(t.points) + '</b></td></tr>';
    }).join('') + '</table>';
  }

  // How each of the player's horses spent the race: turns in cover, in the death seat, wide.
  function tripSummary(race) {
    return race.riders.filter((r) => r.team === app.myTeam).map((r) => {
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
    const myBest = sd.riders.find((row) => race.riders[row.id].team === app.myTeam);
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
        resultsTable(race, ts.riders.slice(0, 10), (row) => row.points, app.myTeam) + '</div><div class="card">' + teamTable(race, ts.teams) + '</div></div>';
      buttons = done ? '<button class="btn primary big" data-go="title">Back to menu</button>'
        : '<button class="btn primary big" data-go="next">Race ' + (app.tour.index + 1) + ': ' + esc(app.tour.stages[app.tour.index].name) + ' ▶</button>';
    } else if (app.online && app.online.role === 'host') {
      buttons = '<button class="btn primary big" data-go="online-rematch">Rematch with your friend</button><button class="btn" data-go="online-quit">Menu</button>';
    } else if (app.online) {
      buttons = '<span class="muted" style="align-self:center">Waiting for the host to start a rematch…</span><button class="btn" data-go="online-quit">Menu</button>';
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
    const headline = winner.team === app.myTeam ? esc(UI.riderName(winner)) + ' wins for your stable!' : esc(UI.riderName(winner)) + ' wins the ' + esc(race.stage.name);
    show('<div class="page"><div class="page-head"><div><h1>' + headline + '</h1><div class="muted">Your best horse: ' +
      myBest.place + '. place · ' + race.stage.meters + ' m in ' + (race.turn - 1) + ' turns</div></div></div>' +
      '<div class="podium">' + podium + '</div>' +
      '<div class="card" style="margin-bottom:14px"><h3 style="margin-bottom:6px">Your trip</h3><ul style="margin:0;padding-left:18px">' + tripSummary(race) + '</ul></div>' +
      '<div class="two-col"><div class="card"><h3 style="margin-bottom:8px">Result</h3>' + resultsTable(race, sd.riders, (row) => row.points, app.myTeam) +
      (race.riders.some((r) => r.capped) ? '<div class="muted small">* still on the track at the turn cap</div>' : '') +
      '</div><div class="card"><h3 style="margin-bottom:8px">Stables</h3>' + teamTable(race, sd.teams) + '</div></div>' + tourBlock +
      '<div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap" id="resBtns">' + buttons + '</div></div>');
    root.querySelector('#resBtns').addEventListener('click', (e) => {
      const go = e.target.dataset.go;
      if (go === 'title') titleScreen();
      if (go === 'custom') setupScreen('custom');
      if (go === 'rematch') startRace(app.raceSetup);
      if (go === 'online-rematch') startOnlineRace();
      if (go === 'online-quit') { leaveOnline('quit'); titleScreen(); }
      if (go === 'next') startRace(Object.assign({}, app.tourSetup, { stage: app.tour.stages[app.tour.index], seed: app.tour.seed + app.tour.index }));
    });
  }

  // ---------- Online: two players, host-authoritative ----------
  const GUEST_COLOR = '#d6336c';

  function onlineScreen() {
    app.screen = 'online';
    show('<div class="page"><div class="page-head"><div><h1>Play with a friend</h1><div class="muted">One of you hosts, the other joins with a code. Nothing to install.</div></div>' +
      '<button class="btn" id="back">← Back</button></div><div class="two-col">' +
      '<div class="card"><h3 style="margin-bottom:6px">Host a game</h3><p class="muted">Choose the race and your horses. You get a code and a link to send to your friend.</p><button class="btn primary big" id="hostBtn">Host ▶</button></div>' +
      '<div class="card"><h3 style="margin-bottom:6px">Join a game</h3><p class="muted">Got a code from your friend? Enter it here, or just open the link they sent.</p><button class="btn big" id="joinBtn">Join ▶</button></div>' +
      '</div><p class="muted small" style="margin-top:16px">The connection goes directly between your browsers (WebRTC). A free public service (PeerJS) only introduces the two browsers to each other.</p></div>');
    root.querySelector('#back').onclick = titleScreen;
    root.querySelector('#hostBtn').onclick = () => setupScreen('host');
    root.querySelector('#joinBtn').onclick = () => joinScreen('');
  }

  function inviteLink(code) {
    // Inside the Android app the page lives at https://localhost, so invite friends to the web version.
    if (Kiri.isNative) return Kiri.PUBLIC_URL + '?join=' + code;
    return location.origin + location.pathname + '?join=' + code;
  }

  function isLocalAddress() {
    if (Kiri.isNative) return false;
    return location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  }

  function leaveOnline(reason) {
    const o = app.online;
    if (!o) return;
    o.closing = true;
    try { o.link && o.link.send({ type: 'bye', reason }); } catch (e) { /* already gone */ }
    setTimeout(() => o.link && o.link.close(), 150);
    app.online = null;
    app.myTeam = 0;
  }

  // A small overlay for connection problems.
  function banner(text, buttons) {
    const old = document.getElementById('netBanner');
    if (old) old.remove();
    const div = document.createElement('div');
    div.id = 'netBanner';
    div.className = 'net-banner';
    div.innerHTML = '<div>' + text + '</div><div class="net-actions">' + buttons.map((b, i) => '<button class="btn' + (i === 0 ? ' primary' : '') + '" data-i="' + i + '">' + esc(b[0]) + '</button>').join('') + '</div>';
    div.addEventListener('click', (e) => {
      const i = e.target.dataset.i;
      if (i === undefined) return;
      div.remove();
      buttons[Number(i)][1]();
    });
    document.body.appendChild(div);
  }

  function onDisconnect() {
    const o = app.online;
    if (!o || o.closing) return;
    if (o.role === 'host' && o.host && app.screen === 'race') {
      banner('Your friend disconnected.', [
        ['Continue with AI', () => {
          o.host.takeOver(1);
          app.race = o.host.race;
          app.online = null;
          app.renderer.setState(app.race, app.myTeam);
          refreshRace();
        }],
        ['Quit', () => { leaveOnline('quit'); titleScreen(); }],
      ]);
    } else if (o.role === 'host') {
      o.guest = null;
      if (app.screen === 'lobby') renderHostLobby();
      else banner('Your friend left.', [['Back to menu', () => { leaveOnline('quit'); titleScreen(); }]]);
    } else {
      banner('The connection to the host was lost.', [['Back to menu', () => { leaveOnline('quit'); titleScreen(); }]]);
    }
  }

  // ----- Host side -----
  function hostLobby() {
    app.screen = 'lobby';
    app.online = { role: 'host', code: null, guest: null, link: null, host: null, locked: false, friendReady: false };
    show('<div class="page"><h1>Creating your game…</h1><p class="muted">Connecting to the matchmaking service.</p></div>');
    const o = app.online;
    Kiri.Net.host(() => Kiri.makeCode(Kiri.rng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0)), {
      onReady: (code) => { o.code = code; renderHostLobby(); },
      onOpen: () => {},
      onMessage: onHostMessage,
      onClose: onDisconnect,
      onError: (type) => {
        if (app.online !== o) return;
        show('<div class="page"><h1>Couldn\'t create the game</h1><p class="muted">The online service is not reachable (' + esc(type) + '). Check your internet connection and try again.</p><button class="btn" id="back">← Back</button></div>');
        root.querySelector('#back').onclick = onlineScreen;
      },
    }).then((link) => { o.link = link; }).catch((err) => {
      show('<div class="page"><h1>Couldn\'t go online</h1><p class="muted">' + esc(err.message) + '</p><button class="btn" id="back">← Back</button></div>');
      root.querySelector('#back').onclick = onlineScreen;
    });
  }

  function renderHostLobby() {
    const o = app.online;
    if (!o || app.screen !== 'lobby') return;
    const s = app.setup;
    const link = inviteLink(o.code);
    const race = setupStage();
    const guest = o.guest
      ? '<div class="chip good">✓ ' + esc(o.guest.name) + ' joined with ' + o.guest.archetypes.map((a) => C.ARCHETYPES[a].name).join(' + ') + '</div>'
      : '<div class="muted">Waiting for your friend… <span class="pulse">●</span></div>';
    show('<div class="page"><div class="page-head"><div><h1>Your game is ready</h1><div class="muted">' + esc(race.name) + ' ' + race.meters + ' m · ' +
      s.aiTeams + ' AI stable' + (s.aiTeams === 1 ? '' : 's') + ' · ' + Kiri.DIFFICULTY[s.difficulty].name + '</div></div><button class="btn" id="back">Cancel</button></div>' +
      '<div class="card"><div class="field"><label>Game code</label><div class="game-code">' + o.code + '</div></div>' +
      '<div class="field"><label>Invite link</label><div style="display:flex;gap:8px;flex-wrap:wrap"><input type="text" id="inviteLink" readonly value="' + esc(link) + '" style="flex:1;min-width:0;width:auto"><button class="btn" id="copyBtn">Copy</button></div>' +
      (isLocalAddress() ? '<div class="muted small" style="margin-top:6px">⚠ This game runs from your own computer, so the link only works here. Your friend can enter the code on the published game page instead.</div>' : '') +
      '</div><div class="field"><label>Your friend</label>' + guest + '</div>' +
      '<button class="btn primary big" id="goBtn"' + (o.guest ? '' : ' disabled') + '>Start the race ▶</button></div></div>');
    root.querySelector('#back').onclick = () => { leaveOnline('cancel'); onlineScreen(); };
    root.querySelector('#copyBtn').onclick = () => {
      const el = root.querySelector('#inviteLink');
      el.select();
      const done = () => { root.querySelector('#copyBtn').textContent = 'Copied ✓'; };
      if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, () => { document.execCommand('copy'); done(); });
      else { document.execCommand('copy'); done(); }
    };
    root.querySelector('#goBtn').onclick = startOnlineRace;
  }

  function onHostMessage(msg) {
    const o = app.online;
    if (!o || !msg || typeof msg !== 'object') return;
    if (msg.type === 'hello') {
      const archetypes = (msg.archetypes || []).filter((a) => C.ARCHETYPES[a]).slice(0, 2);
      while (archetypes.length < 2) archetypes.push('stayer');
      o.guest = { name: String(msg.name || 'Friend').slice(0, 24), archetypes };
      o.link.send({ type: 'lobby', host: app.setup.teamName, race: setupStage().name, meters: setupStage().meters, aiTeams: app.setup.aiTeams, difficulty: app.setup.difficulty });
      renderHostLobby();
    } else if (msg.type === 'orders' && o.host) {
      hostHandle(o.host.submit(1, msg.turn, msg.orders));
    } else if (msg.type === 'bye') {
      onDisconnect();
    }
  }

  function startOnlineRace() {
    const o = app.online;
    if (!o || !o.guest) return;
    const s = app.setup;
    const seed = Math.floor(Math.random() * 100000);
    const setup = buildSetup(setupStage(), seed, s.aiTeams);
    // Guest stable goes second; give it names the AI stables don't use.
    const used = new Set(setup.teams.flatMap((t) => t.riderNames));
    const free = HORSE_NAMES.filter((n) => !used.has(n));
    setup.teams.splice(1, 0, { name: o.guest.name, color: GUEST_COLOR, controller: 'human', archetypes: o.guest.archetypes, riderNames: [free[0], free[1]] });
    o.host = new Kiri.OnlineHost(setup);
    o.locked = false;
    o.friendReady = false;
    app.raceSetup = setup;
    app.difficulty = setup.difficulty;
    app.tour = null;
    app.race = o.host.race;
    app.myTeam = 0;
    app.orders = {};
    app.selected = null;
    app.busy = false;
    defaultOrders();
    o.link.send({ type: 'start', race: app.race, seed: setup.seed, difficulty: setup.difficulty });
    raceScreen();
  }

  // After a submit on the host: tell the guest who is ready, or broadcast the resolved turn.
  function hostHandle(res) {
    const o = app.online;
    if (!o || !res.accepted && !res.resolved) return;
    if (res.resolved) {
      o.link.send({ type: 'state', race: res.race });
      o.locked = false;
      o.friendReady = false;
      playTurn(res.race);
    } else {
      o.friendReady = o.host.pending[1] !== null;
      o.link.send({ type: 'ready', turn: o.host.race.turn, ready: o.host.readyStatus() });
      refreshControls();
    }
  }

  // ----- Guest side -----
  function joinScreen(code) {
    app.screen = 'join';
    const s = app.setup;
    const archOpts = Object.keys(C.ARCHETYPES).map((k) => [k, C.ARCHETYPES[k].name]);
    show('<div class="page"><div class="page-head"><div><h1>Join a game</h1><div class="muted">Enter the code your friend sent you.</div></div><button class="btn" id="back">← Back</button></div>' +
      '<div class="setup-grid"><div class="card"><div class="field"><label>Game code</label><input type="text" id="code" maxlength="8" value="' + esc(code) + '" style="width:100%;font-size:22px;letter-spacing:4px;text-transform:uppercase" placeholder="ABC123"></div>' +
      '<div class="field"><label>Stable name</label><input type="text" id="teamName" maxlength="24" value="' + esc(s.teamName) + '" style="width:100%"></div></div>' +
      '<div class="card">' + [0, 1].map((i) => '<div class="field"><label>Horse ' + (i + 1) + '</label>' + seg('arch' + i, archOpts, s.archetypes[i]) + '</div>').join('') + '</div></div>' +
      '<div id="joinStatus" class="muted" style="margin-top:12px"></div><div style="margin-top:14px;text-align:right"><button class="btn primary big" id="joinGo">Join ▶</button></div></div>');
    root.querySelector('#back').onclick = () => { leaveOnline('cancel'); history.replaceState(null, '', location.pathname); onlineScreen(); };
    root.querySelectorAll('[data-seg]').forEach((el) => el.addEventListener('click', (e) => {
      const v = e.target.dataset.v;
      if (v === undefined) return;
      s.archetypes[el.dataset.seg === 'arch0' ? 0 : 1] = v;
      s.teamName = root.querySelector('#teamName').value;
      joinScreen(root.querySelector('#code').value);
    }));
    root.querySelector('#joinGo').onclick = () => {
      const c = Kiri.normalizeCode(root.querySelector('#code').value);
      s.teamName = root.querySelector('#teamName').value.trim() || 'Talli Sisu';
      const status = root.querySelector('#joinStatus');
      if (c.length !== 6) { status.textContent = 'The code has 6 characters.'; return; }
      status.textContent = 'Connecting…';
      root.querySelector('#joinGo').disabled = true;
      connectAsGuest(c, status);
    };
  }

  function connectAsGuest(code, status) {
    leaveOnline('retry');
    const o = { role: 'guest', code, link: null, locked: false, friendReady: false };
    app.online = o;
    let opened = false;
    Kiri.Net.join(code, {
      onOpen: () => {
        opened = true;
        o.link.send({ type: 'hello', name: app.setup.teamName, archetypes: app.setup.archetypes });
        if (status) status.innerHTML = '<span class="chip good">✓ Connected</span> Waiting for the host to start the race…';
      },
      onMessage: onGuestMessage,
      onClose: onDisconnect,
      onError: (type) => {
        if (app.online !== o) return;
        app.online = null;
        if (app.screen === 'join') {
          const el = root.querySelector('#joinStatus');
          el.innerHTML = type === 'notfound' ? '<b>Game not found.</b> Check the code. Your friend must keep the game page open.' : 'Connection failed (' + esc(type) + '). Try again.';
          root.querySelector('#joinGo').disabled = false;
        } else if (!opened || app.screen === 'race') onDisconnect();
      },
    }).then((link) => { o.link = link; }).catch((err) => {
      app.online = null;
      if (status) status.textContent = err.message;
      const b = root.querySelector('#joinGo');
      if (b) b.disabled = false;
    });
  }

  function onGuestMessage(msg) {
    const o = app.online;
    if (!o || !msg || typeof msg !== 'object') return;
    if (msg.type === 'lobby') {
      const st = root.querySelector('#joinStatus');
      if (st) st.innerHTML = '<span class="chip good">✓ Connected to ' + esc(msg.host) + '</span> ' + esc(msg.race) + ' ' + msg.meters + ' m · ' + msg.aiTeams + ' AI stables · ' +
        esc(Kiri.DIFFICULTY[msg.difficulty] ? Kiri.DIFFICULTY[msg.difficulty].name : '') + '. Waiting for the host to start…';
    } else if (msg.type === 'start') {
      app.race = msg.race;
      app.raceSetup = { seed: msg.seed, difficulty: msg.difficulty };
      app.difficulty = msg.difficulty;
      app.tour = null;
      app.myTeam = 1;
      app.orders = {};
      app.selected = null;
      app.busy = false;
      o.locked = false;
      o.friendReady = false;
      defaultOrders();
      history.replaceState(null, '', location.pathname);
      raceScreen();
    } else if (msg.type === 'ready') {
      if (msg.turn !== app.race.turn) return;
      o.friendReady = !!msg.ready[0];
      refreshControls();
    } else if (msg.type === 'state') {
      if (!msg.race || msg.race.turn <= app.race.turn) return; // late duplicate
      o.locked = false;
      o.friendReady = false;
      playTurn(msg.race);
    } else if (msg.type === 'bye') {
      onDisconnect();
    }
  }

  // ----- Both sides -----
  function lockIn() {
    const o = app.online;
    if (o.locked || humanRiders().every((r) => r.finished)) return;
    o.locked = true;
    refreshControls();
    if (o.role === 'host') hostHandle(o.host.submit(0, app.race.turn, myOrders()));
    else o.link.send({ type: 'orders', turn: app.race.turn, orders: myOrders() });
  }

  // When both players' horses are home, the host keeps the AI horses running on its own.
  function onlineAfterTurn() {
    const o = app.online;
    if (o.role !== 'host' || !o.host) return;
    if (o.host.readyStatus()[0] && o.host.readyStatus()[1] && !o.host.pending[0] && !o.host.pending[1]) {
      setTimeout(() => { if (app.online === o && !app.busy) hostHandle(o.host.tryResolve()); }, 300);
    }
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

  // An invite link (?join=CODE) opens the join screen directly.
  const joinCode = Kiri.normalizeCode(new URLSearchParams(location.search).get('join'));
  if (joinCode.length === 6) joinScreen(joinCode);
  else titleScreen();
  window.KiriApp = app;
})(window.Kiri = window.Kiri || {});
