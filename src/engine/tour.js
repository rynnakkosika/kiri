// Three-stage tour: points add up across stages (US5).
(function (Kiri) {
  'use strict';

  function createTour(seed) {
    return { index: 0, seed, stages: [Kiri.PRESET_STAGES[0], Kiri.PRESET_STAGES[1], Kiri.PRESET_STAGES[2]], totals: {}, results: [] };
  }

  function recordStage(tour, race) {
    const t = Kiri.clone(tour);
    for (const r of race.riders) t.totals[r.id] = (t.totals[r.id] || 0) + r.points;
    t.results.push(Kiri.standings(race));
    t.index++;
    return t;
  }

  function tourOver(tour) { return tour.index >= tour.stages.length; }

  // Riders and teams ranked by accumulated points; ties go to the better last-stage place.
  function tourStandings(tour, race) {
    const last = tour.results[tour.results.length - 1];
    const lastPlace = {};
    if (last) last.riders.forEach((r) => { lastPlace[r.id] = r.place; });
    const riders = race.riders.map((r) => ({ id: r.id, points: tour.totals[r.id] || 0 }))
      .sort((a, b) => b.points - a.points || (lastPlace[a.id] || 99) - (lastPlace[b.id] || 99));
    const teams = race.teams.map((tm) => ({
      id: tm.id,
      points: race.riders.filter((r) => r.team === tm.id).reduce((n, r) => n + (tour.totals[r.id] || 0), 0),
    })).sort((a, b) => b.points - a.points || a.id - b.id);
    return { riders, teams };
  }

  Object.assign(Kiri, { createTour, recordStage, tourOver, tourStandings });
})(window.Kiri = window.Kiri || {});
