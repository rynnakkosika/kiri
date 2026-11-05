// Ladder rating (spec 006): multi-stable Elo, shown to players as money.
(function (Kiri) {
  'use strict';
  const C = Kiri.C;

  // Chance that a stable rated `a` finishes ahead of one rated `b`.
  function expectedScore(a, b) {
    return 1 / (1 + Math.pow(10, (b - a) / 400));
  }

  // Stables ranked for rating: most prize money won in the race, then best horse place.
  // Returns [{ team, place }] with shared places for exact ties.
  function stablePlaces(race) {
    const rows = race.teams.map((t) => {
      const mine = race.riders.filter((r) => r.team === t.id);
      return {
        team: t.id,
        money: mine.reduce((n, r) => n + (r.points || 0), 0),
        best: Math.min.apply(null, mine.map((r) => r.finishPlace || 99)),
      };
    }).sort((a, b) => b.money - a.money || a.best - b.best);
    let place = 0;
    return rows.map((row, i) => {
      if (i === 0 || row.money !== rows[i - 1].money || row.best !== rows[i - 1].best) place = i + 1;
      return { team: row.team, place };
    });
  }

  // entries: [{ id, rating, place, bot }] — bots are rated at the humans' average and never change.
  // Returns { [id]: change } for the humans, rounded to whole Elo points.
  function eloChanges(entries) {
    const humans = entries.filter((e) => !e.bot);
    if (!humans.length || entries.length < 2) return {};
    const avg = humans.reduce((n, e) => n + e.rating, 0) / humans.length;
    const rated = entries.map((e) => Object.assign({}, e, { rating: e.bot ? avg : e.rating }));
    const k = C.ELO_K / (entries.length - 1);
    const out = {};
    for (const me of rated) {
      if (me.bot) continue;
      let delta = 0;
      for (const other of rated) {
        if (other === me) continue;
        const score = me.place < other.place ? 1 : me.place === other.place ? 0.5 : 0;
        delta += k * (score - expectedScore(me.rating, other.rating));
      }
      out[me.id] = Math.round(delta);
    }
    return out;
  }

  function eloToMoney(elo) { return elo / C.ELO_PER_MONEY; }

  // "10.00" style label for a rating; signed for changes ("+0.16", "−0.08").
  function ladderMoney(elo, signed) {
    const v = eloToMoney(elo);
    const s = Math.abs(v).toFixed(2);
    if (!signed) return (v < 0 ? '−' : '') + s;
    return (v > 0 ? '+' : v < 0 ? '−' : '±') + s;
  }

  Object.assign(Kiri, { expectedScore, stablePlaces, eloChanges, eloToMoney, ladderMoney });
})(window.Kiri = window.Kiri || {});
