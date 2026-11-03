// HTML builders for rider control cards, standings and the race log.
(function (Kiri) {
  'use strict';
  const C = Kiri.C;

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function riderName(r) { return r.name || 'Rider ' + (r.id + 1); }

  function dot(state, r, size) {
    const st = size ? 'width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.45) + 'px;' : '';
    return '<span class="dot" style="' + st + 'background:' + state.teams[r.team].color + '">' + (r.id + 1) + '</span>';
  }

  // Arrows in screen space: riders travel left→right, so the rider's left is the top of the screen.
  const WIND_ARROW = { calm: '·', head: '←', crossLeft: '↓', crossRight: '↑' };
  function windChip(wind) {
    return '<span class="chip" title="' + esc(C.WIND_NAMES[wind]) + '"><span class="wind-arrow">' + WIND_ARROW[wind] + '</span>' + esc(C.WIND_NAMES[wind]) + '</span>';
  }

  function shelterHint(wind) {
    if (wind === 'crossLeft') return 'Shelter: one square ahead, one lane to the left (↑).';
    if (wind === 'crossRight') return 'Shelter: one square ahead, one lane to the right (↓).';
    return 'Shelter: directly behind another rider.';
  }

  function riderCard(state, r, order, selected) {
    const arch = C.ARCHETYPES[r.archetype];
    if (r.finished) {
      return '<div class="rider-card done">' + head(state, r, arch, '<span class="chip good">Finished #' + r.finishPlace + '</span>') +
        '<div class="muted">Done for the day. ' + r.points + ' pts.</div></div>';
    }
    const p = Kiri.previewOrder(state, r.id, order);
    const legal = Kiri.legalEfforts(state, r);
    const sheltered = p.sheltered;
    const chips = [];
    if (sheltered) chips.push('<span class="chip good" title="Energy discount this turn">Sheltered</span>');
    else if (Kiri.squareAt(state.stage, r.square).terrain === 'climb') chips.push('<span class="chip">On a climb: no shelter</span>');
    if (r.crack > 0) chips.push('<span class="chip bad" title="Effort capped at 3">Cracked · ' + r.crack + '</span>');
    else if (r.strain >= 8) chips.push('<span class="chip warn">Red zone</span>');
    const terrain = Kiri.squareAt(state.stage, r.square).terrain;
    chips.push('<span class="chip">' + terrain + '</span>');

    let effortBtns = '';
    for (let e = 1; e <= 9; e++) {
      const ok = legal.includes(e);
      const cost = Kiri.energyCost(e, sheltered, state.wind);
      const cracks = Kiri.strainAfter(r, e, sheltered).cracked;
      const why = !ok ? (r.crack > 0 && e > C.CRACK_MAX_EFFORT ? 'Cracked: max effort 3' : 'Not enough energy') : 'Cost ' + cost + (cracks ? ' — will crack!' : '');
      effortBtns += '<button data-act="effort" data-rider="' + r.id + '" data-v="' + e + '"' + (ok ? '' : ' disabled') +
        ' class="' + (order.effort === e ? 'on ' : '') + (cracks ? 'crack' : '') + '" title="' + esc(why) + '"><b>' + e + '</b><small>' + cost + '⚡</small></button>';
    }

    const after = Math.max(0, Math.min(r.maxEnergy, r.energy - p.cost + p.recovery));
    const energyBar = '<div class="meter"><span>Energy</span><div class="bar">' +
      '<i class="cost" style="width:' + (100 * Math.max(r.energy, after) / r.maxEnergy) + '%"></i>' +
      '<i class="after" style="width:' + (100 * after / r.maxEnergy) + '%"></i></div><span>' + r.energy + ' → ' + after + '</span></div>';
    let segs = '';
    for (let i = 0; i < 10; i++) {
      const now = i < r.strain;
      const then = i < p.strain;
      const red = i >= 7 ? ' red' : '';
      segs += '<i class="' + (now && then ? 'on' : !now && then ? 'ghost' : '') + red + '"></i>';
    }
    const strainBar = '<div class="meter"><span>Strain</span><div class="strain-bar">' + segs + '</div><span>' + r.strain + ' → ' + (p.cracked ? '💥' : p.strain) + '</span></div>';

    const lanes = [[-1, 'Left ↑'], [0, 'Keep'], [1, 'Right ↓']].map(([v, l]) =>
      '<button data-act="lane" data-rider="' + r.id + '" data-v="' + v + '" class="' + ((order.lane || 0) === v ? 'on' : '') + '">' + l + '</button>').join('');

    const dist = p.reach - r.square;
    const notes = [];
    if (p.reach >= state.stage.finish) notes.push('<b>reaches the finish!</b>');
    else if (r.square < state.stage.sprint && p.reach >= state.stage.sprint && state.sprintDone.length < 3) notes.push('crosses the sprint');
    if (p.kick) notes.push('<b>Kick +2</b>');
    if (p.recovery) notes.push('recovers +' + p.recovery + '⚡');
    if (p.cracked) notes.push('<b>will CRACK</b> (max effort 3 for 2 turns)');
    const preview = '<div class="preview' + (p.cracked ? ' bad' : '') + '">→ <b>+' + dist + '</b> squares if unblocked · costs <b>' + p.cost + '⚡</b>' +
      (sheltered && C.EFFORT_COST[order.effort] !== p.cost ? ' <span class="muted">(was ' + C.EFFORT_COST[order.effort] + ')</span>' : '') +
      (notes.length ? ' · ' + notes.join(' · ') : '') + '</div>';

    return '<div class="rider-card' + (selected ? ' selected' : '') + '" data-act="select" data-rider="' + r.id + '">' +
      head(state, r, arch, chips.join('')) + energyBar + strainBar +
      '<div class="efforts">' + effortBtns + '</div>' +
      '<div class="lane-row"><span class="muted">Lane</span><div class="seg">' + lanes + '</div></div>' + preview + '</div>';
  }

  function head(state, r, arch, chips) {
    return '<div class="rc-head">' + dot(state, r) + '<div><div class="rc-name">' + esc(riderName(r)) + '</div>' +
      '<div class="muted small" title="' + esc(arch.blurb) + '">' + arch.name + ' · ' + r.points + ' pts</div></div><div class="rc-chips">' + chips + '</div></div>';
  }

  function standingsTable(state, human) {
    const order = Kiri.standings(state).riders;
    const leader = Math.max.apply(null, state.riders.map((r) => r.square));
    return '<table class="standings">' + order.map((row) => {
      const r = state.riders[row.id];
      const gap = r.finished ? '#' + r.finishPlace : r.square === leader ? 'lead' : '−' + (leader - r.square);
      return '<tr class="' + (r.team === human ? 'me' : '') + '"><td>' + row.place + '</td><td><span class="mini" style="background:' + state.teams[r.team].color + '"></span> ' +
        (r.id + 1) + ' ' + esc(riderName(r)) + '</td><td class="muted">' + C.ARCHETYPES[r.archetype].name[0] + '</td><td>' + gap + '</td><td>' + r.points + '</td></tr>';
    }).join('') + '</table>';
  }

  function logHtml(state, human) {
    if (!state.log.length) return '<div class="muted">The race log fills in as riders move.</div>';
    const byTurn = {};
    for (const e of state.log) (byTurn[e.turn] = byTurn[e.turn] || []).push(e);
    return Object.keys(byTurn).map(Number).sort((a, b) => b - a).slice(0, 12).map((t) => {
      const lines = byTurn[t].map((e) => {
        const r = state.riders[e.rider];
        const extra = e.notes.map((n) => n === 'CRACKS' ? '<span class="crack">cracks!</span>' : /sprint|finishes|kick/.test(n) ? '<span class="hl">' + esc(n) + '</span>' : esc(n));
        return '<div class="line' + (r.team === human ? ' me' : '') + '">' + (r.id + 1) + ' ' + esc(riderName(r)) + ': effort ' + e.effort + ', +' + (e.to - e.from) +
          (e.sheltered ? ' in shelter' : '') + ', ' + e.cost + '⚡' + (extra.length ? ' · ' + extra.join(' · ') : '') + '</div>';
      }).join('');
      return '<div class="turn">Turn ' + t + '</div>' + lines;
    }).join('');
  }

  Kiri.UI = { esc, riderName, dot, windChip, shelterHint, riderCard, standingsTable, logHtml };
})(window.Kiri = window.Kiri || {});
