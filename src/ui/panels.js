// HTML builders for horse control cards, standings and the race log.
(function (Kiri) {
  'use strict';
  const C = Kiri.C;

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function riderName(r) { return r.name || 'Horse ' + (r.id + 1); }

  // Non-breaking space so "10 000 €" never wraps.
  function euros(n) { return n.toLocaleString('fi-FI').replace(/\s/g, ' ') + ' €'; }

  function dot(state, r, size) {
    const st = size ? 'width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.45) + 'px;' : '';
    return '<span class="dot" style="' + st + 'background:' + state.teams[r.team].color + '">' + (r.id + 1) + '</span>';
  }

  const LANE_NAMES = ['rail', 'lane 2', 'lane 3', 'lane 4'];

  // Human label and chip class for a position (rule 4).
  function positionInfo(pos, leader, lane) {
    let label;
    let cls;
    if (pos.deathSeat) { label = 'Death seat'; cls = 'bad'; } else if (pos.covered) { label = 'In cover'; cls = 'good'; } else if (leader) { label = 'Leading'; cls = ''; } else { label = 'Open, ' + LANE_NAMES[lane]; cls = lane >= 2 ? 'warn' : ''; }
    const mult = '×' + (Math.round(pos.mult * 100) / 100);
    return { label, cls, mult };
  }

  function positionHint() {
    return 'Cover: sit right behind a horse. Death seat: lane 2 beside the rail horse with nobody ahead.';
  }

  function riderCard(state, r, order, selected) {
    const arch = C.ARCHETYPES[r.archetype];
    if (r.finished) {
      return '<div class="rider-card done">' + head(state, r, arch, '<span class="chip good">Finished #' + r.finishPlace + '</span>') +
        '<div class="muted">In the stable. Earned ' + euros(r.points) + '.</div></div>';
    }
    const p = Kiri.previewOrder(state, r.id, order);
    const legal = Kiri.legalEfforts(state, r);
    const info = positionInfo(p.pos, p.pos.leader, r.lane);
    const chips = ['<span class="chip ' + info.cls + '" title="Energy cost multiplier this turn">' + info.label + ' ' + info.mult + '</span>'];
    if (p.pos.wide) chips.push('<span class="chip warn" title="Lanes 3–4 in a curve: ×1.25">Wide in curve</span>');
    if (r.crack > 0) chips.push('<span class="chip bad" title="Speed capped at 3">Galloping · ' + r.crack + '</span>');
    else if (r.strain >= 8) chips.push('<span class="chip warn">Red zone</span>');
    if (r.energy === 0) chips.push('<span class="chip bad">Exhausted</span>');

    let effortBtns = '';
    for (let e = 1; e <= 9; e++) {
      const ok = legal.includes(e);
      const cost = Kiri.energyCost(e, p.pos);
      const cracks = Kiri.strainAfter(r, e, p.pos).cracked;
      const why = !ok ? (r.crack > 0 && e > C.CRACK_MAX_EFFORT ? 'Galloping: max speed 3' : 'Not enough energy') : 'Cost ' + cost + (cracks ? ' — will break into a gallop!' : '');
      effortBtns += '<button data-act="effort" data-rider="' + r.id + '" data-v="' + e + '"' + (ok ? '' : ' disabled') +
        ' class="' + (order.effort === e ? 'on ' : '') + (cracks ? 'crack' : '') + '" title="' + esc(why) + '"><b>' + e + '</b><small>' + cost + '⚡</small></button>';
    }

    const after = Math.max(0, r.energy - p.cost);
    const energyBar = '<div class="meter"><span>Energy</span><div class="bar">' +
      '<i class="cost" style="width:' + (100 * r.energy / r.maxEnergy) + '%"></i>' +
      '<i class="after" style="width:' + (100 * after / r.maxEnergy) + '%"></i></div><span>' + r.energy + ' → ' + after + '</span></div>';
    let segs = '';
    for (let i = 0; i < 10; i++) {
      const now = i < r.strain;
      const then = i < p.strain;
      const red = i >= 7 ? ' red' : '';
      segs += '<i class="' + (now && then ? 'on' : !now && then ? 'ghost' : '') + red + '"></i>';
    }
    const strainBar = '<div class="meter"><span>Strain</span><div class="strain-bar">' + segs + '</div><span>' + r.strain + ' → ' + (p.cracked ? '💥' : p.strain) + '</span></div>';

    const lanes = [[-1, '← Inside'], [0, 'Keep'], [1, 'Outside →']].map(([v, l]) =>
      '<button data-act="lane" data-rider="' + r.id + '" data-v="' + v + '" class="' + ((order.lane || 0) === v ? 'on' : '') + '">' + l + '</button>').join('');

    const dist = p.reach - r.square;
    const notes = [];
    if (p.reach >= state.stage.finish) notes.push('<b>reaches the finish!</b>');
    if (p.laneBlocked) notes.push('<b>boxed in</b>: a horse alongside blocks that lane');
    else if (p.lane !== r.lane) notes.push('to ' + LANE_NAMES[p.lane]);
    if (p.kick) notes.push('<b>Kick +2</b>');
    if (p.gate) notes.push('<b>gate speed +2</b>');
    if (p.cracked) notes.push('<b>will GALLOP</b> (max speed 3 for 2 turns)');
    const base = C.EFFORT_COST[order.effort];
    const preview = '<div class="preview' + (p.cracked || p.pos.deathSeat ? ' bad' : '') + '">→ <b>+' + dist * C.SEGMENT_M + ' m</b> if unblocked · costs <b>' + p.cost + '⚡</b>' +
      (base !== p.cost ? ' <span class="muted">(' + base + ' ' + info.mult + (p.pos.wide ? ' incl. curve' : '') + ')</span>' : '') +
      (notes.length ? ' · ' + notes.join(' · ') : '') + '</div>';

    return '<div class="rider-card' + (selected ? ' selected' : '') + '" data-act="select" data-rider="' + r.id + '">' +
      head(state, r, arch, chips.join('')) + energyBar + strainBar +
      '<div class="efforts">' + effortBtns + '</div>' +
      '<div class="lane-row"><span class="muted">Lane</span><div class="seg">' + lanes + '</div></div>' + preview + '</div>';
  }

  function head(state, r, arch, chips) {
    return '<div class="rc-head">' + dot(state, r) + '<div><div class="rc-name">' + esc(riderName(r)) + '</div>' +
      '<div class="muted small" title="' + esc(arch.blurb) + '">' + arch.name + ' · ' + LANE_NAMES[r.lane] + '</div></div><div class="rc-chips">' + chips + '</div></div>';
  }

  function standingsTable(state, human) {
    const order = Kiri.standings(state).riders;
    const live = state.riders.filter((r) => !r.finished);
    const leader = live.length ? Math.max.apply(null, live.map((r) => r.square)) : 0;
    return '<table class="standings">' + order.map((row) => {
      const r = state.riders[row.id];
      const gap = r.finished ? '#' + r.finishPlace : r.square === leader ? 'lead' : '−' + (leader - r.square) * C.SEGMENT_M + ' m';
      const where = r.finished ? '' : (Kiri.position(state, r).deathSeat ? '⚠' : '') + (r.lane + 1);
      return '<tr class="' + (r.team === human ? 'me' : '') + '"><td>' + row.place + '</td><td><span class="mini" style="background:' + state.teams[r.team].color + '"></span> ' +
        (r.id + 1) + ' ' + esc(riderName(r)) + '</td><td class="muted" title="Lane">' + where + '</td><td>' + gap + '</td></tr>';
    }).join('') + '</table>';
  }

  function logHtml(state, human) {
    if (!state.log.length) return '<div class="muted">The race log fills in as the horses move.</div>';
    const byTurn = {};
    for (const e of state.log) (byTurn[e.turn] = byTurn[e.turn] || []).push(e);
    return Object.keys(byTurn).map(Number).sort((a, b) => b - a).slice(0, 12).map((t) => {
      const lines = byTurn[t].map((e) => {
        const r = state.riders[e.rider];
        const extra = e.notes.map((n) => n === 'GALLOPS' ? '<span class="crack">breaks into a gallop!</span>' : n === 'death seat' ? '<span class="crack">death seat</span>' : /finishes|kick/.test(n) ? '<span class="hl">' + esc(n) + '</span>' : esc(n));
        return '<div class="line' + (r.team === human ? ' me' : '') + '">' + (r.id + 1) + ' ' + esc(riderName(r)) + ': speed ' + e.effort + ', +' + (e.to - e.from) * C.SEGMENT_M + ' m, ' +
          LANE_NAMES[e.lane] + ', ' + e.cost + '⚡' + (extra.length ? ' · ' + extra.join(' · ') : '') + '</div>';
      }).join('');
      return '<div class="turn">Turn ' + t + '</div>' + lines;
    }).join('');
  }

  Kiri.UI = { esc, riderName, euros, dot, positionHint, riderCard, standingsTable, logHtml, LANE_NAMES };
})(window.Kiri = window.Kiri || {});
