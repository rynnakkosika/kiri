// Host-side protocol for online two-player races. Pure: no network, no DOM.
// The host owns the race; each player stable submits orders for the current turn, and once both
// are in (or a stable has no horses left running) the host adds AI orders and resolves.
(function (Kiri) {
  'use strict';

  const PLAYER_TEAMS = [0, 1];

  class OnlineHost {
    constructor(setup) {
      this.setup = setup;
      this.race = Kiri.createRace(setup);
      this.pending = { 0: null, 1: null };
    }

    // A stable is done for this turn when it submitted, when all its horses are home,
    // or when the AI has taken it over.
    teamDone(team) {
      if (this.pending[team]) return true;
      if (this.race.teams[team].controller !== 'human') return true;
      return this.race.riders.filter((r) => r.team === team).every((r) => r.finished);
    }

    readyStatus() { return { 0: this.teamDone(0), 1: this.teamDone(1) }; }

    // Keep only orders for the sender's own unfinished horses at legal speeds; fill the rest
    // with a safe default so a bad message can never stall or break the race.
    sanitize(team, orders) {
      const out = {};
      for (const r of this.race.riders) {
        if (r.team !== team || r.finished) continue;
        const legal = Kiri.legalEfforts(this.race, r);
        const o = orders && orders[r.id];
        const ok = o && legal.includes(o.effort) && [-1, 0, 1].includes(o.lane || 0);
        out[r.id] = ok ? { effort: o.effort, lane: o.lane || 0 } : { effort: legal.filter((e) => e <= 5).pop(), lane: 0 };
      }
      return out;
    }

    // Returns { accepted, resolved, race }. Orders for any turn but the current one are ignored.
    submit(team, turn, orders) {
      if (this.race.over || turn !== this.race.turn || !PLAYER_TEAMS.includes(team) || this.pending[team]) {
        return { accepted: false, resolved: false };
      }
      this.pending[team] = this.sanitize(team, orders);
      return Object.assign({ accepted: true }, this.tryResolve());
    }

    tryResolve() {
      if (this.race.over || !PLAYER_TEAMS.every((t) => this.teamDone(t))) return { resolved: false };
      const orders = Kiri.aiOrdersFor(this.race, this.setup.seed, this.setup.difficulty);
      for (const t of PLAYER_TEAMS) Object.assign(orders, this.pending[t] || {});
      this.race = Kiri.resolveTurn(this.race, orders);
      this.pending = { 0: null, 1: null };
      return { resolved: true, race: this.race };
    }

    // The friend left: their stable is driven by the AI from now on.
    takeOver(team) {
      this.race = Kiri.clone(this.race);
      this.race.teams[team].controller = 'planner';
      this.pending[team] = null;
    }
  }

  // 6-character game codes without look-alike characters.
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  function makeCode(rand) {
    let s = '';
    for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
    return s;
  }

  function normalizeCode(text) {
    return String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }

  Object.assign(Kiri, { OnlineHost, makeCode, normalizeCode });
})(window.Kiri = window.Kiri || {});
