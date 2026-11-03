// Canvas renderer: the whole oval, horses with sulkies, ghosts, trails and move animation.
(function (Kiri) {
  'use strict';
  const C = Kiri.C;

  const COATS = ['#7a4a2a', '#5b3420', '#2b1d16', '#9a5b2e', '#8c8c86', '#6b3d22'];
  const SAND = '#c89a6a';
  const SAND_DARK = '#b8875a';
  const INFIELD = '#5f9150';

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  class Renderer {
    constructor(canvas, profile) {
      this.c = canvas;
      this.p = profile;
      this.ctx = canvas.getContext('2d');
      this.pctx = profile.getContext('2d');
      this.state = null;
      this.human = 0;
      this.ghosts = [];
      this.selected = null;
      this.anim = null;
      this.pos = {}; // riderId -> {x: segment, y: lane} as drawn
      this.motion = {}; // riderId -> {moving, stride}
      this.trails = [];
      this.onHover = null;
      this.time = 0;
      this.bindInput();
      const loop = (t) => { this.time = t; this.frame(t); this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
    }

    destroy() { cancelAnimationFrame(this.raf); clearTimeout(this.animTimer); }

    setState(state, humanTeam) {
      this.state = state;
      this.human = humanTeam;
      if (!this.anim) for (const r of state.riders) this.pos[r.id] = { x: r.square, y: r.lane };
      this.trails = this.lastMoves(state);
    }

    lastMoves(state) {
      return state.log.filter((e) => e.turn === state.turn - 1)
        .map((e) => ({ id: e.rider, from: { x: e.from, y: e.fromLane }, to: { x: e.to, y: e.lane } }));
    }

    setGhosts(ghosts, selected) { this.ghosts = ghosts; this.selected = selected; }

    // The whole oval is always in view; kept for API compatibility with the race screen.
    refollow() {}

    animateTo(newState, done) {
      const entries = newState.log.filter((e) => e.turn === newState.turn - 1);
      const tracks = entries.map((e, i) => {
        const dist = Math.max(1, e.to - e.from);
        return { id: e.rider, from: { x: e.from, y: e.fromLane }, to: { x: e.to, y: e.lane }, delay: i * 45, dur: Math.min(900, 320 + dist * 45) };
      });
      const total = tracks.reduce((m, t) => Math.max(m, t.delay + t.dur), 0);
      this.trails = this.lastMoves(newState);
      this.anim = { start: performance.now(), tracks, total, done, next: newState };
      // Animation frames pause in background tabs; never let a turn hang on them.
      this.animTimer = setTimeout(() => this.finishAnim(), total + 400);
    }

    finishAnim() {
      const a = this.anim;
      if (!a) return;
      clearTimeout(this.animTimer);
      this.anim = null;
      this.state = a.next;
      for (const r of this.state.riders) this.pos[r.id] = { x: r.square, y: r.lane };
      for (const id in this.motion) this.motion[id].moving = false;
      a.done();
    }

    stepAnim(now) {
      const a = this.anim;
      const t = now - a.start;
      for (const tr of a.tracks) {
        const k = ease(Math.max(0, Math.min(1, (t - tr.delay) / tr.dur)));
        const next = { x: tr.from.x + (tr.to.x - tr.from.x) * k, y: tr.from.y + (tr.to.y - tr.from.y) * k };
        const m = this.motion[tr.id] || (this.motion[tr.id] = { moving: false, stride: 0 });
        const dx = next.x - this.pos[tr.id].x;
        m.moving = dx > 0.0005;
        m.stride += dx * 9 + (m.moving ? 0.15 : 0);
        this.pos[tr.id] = next;
      }
      if (t >= a.total) this.finishAnim();
    }

    bindInput() {
      this.c.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') this.updateHover(e); });
      // A tap inspects the horse under the finger; touch has no hover.
      this.c.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') this.updateHover(e); });
      this.c.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'mouse' && this.onHover) this.onHover(null);
      });
    }

    updateHover(e) {
      if (!this.state) return;
      const rect = this.c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let hit = null;
      let best = (this.geo.seg * 0.7) ** 2;
      for (const r of this.state.riders) {
        const p = this.place(this.pos[r.id]);
        const d = (p.x - mx) ** 2 + (p.y - my) ** 2;
        if (d < best) { best = d; hit = r; }
      }
      if (this.onHover) this.onHover(hit, mx, my);
    }

    // Oval geometry fitted to the canvas: segment length s, rail radius R0, lane width lw.
    layout() {
      const W = this.c.clientWidth;
      const H = this.c.clientHeight;
      // Total width = 10s (straight) + 2(R0 + 4lw) + margins, with R0 = 10s/π and lw = 0.75s.
      const wUnits = 10 + 2 * (10 / Math.PI + 4 * 0.75) + 1.2;
      // Height leaves room below the oval for the grandstand.
      const hUnits = 2 * (10 / Math.PI + 4 * 0.75) + 3.4;
      const s = Math.min(W / wUnits, H / hUnits);
      const R0 = (10 * s) / Math.PI;
      this.geo = { seg: s, R0, lw: 0.75 * s, cx: W / 2, cy: H / 2 - s * 0.9, hl: 5 * s, W, H };
    }

    // Lap position (in segments, fractional) and lane (fractional) → screen point and heading.
    lapPoint(p, lane) {
      const g = this.geo;
      const r = g.R0 + (lane + 0.5) * g.lw;
      p = ((p % C.LAP) + C.LAP) % C.LAP;
      if (p < 10) return { x: g.cx - g.hl + (p / 10) * 2 * g.hl, y: g.cy + r, a: 0 };
      if (p < 20) {
        const th = Math.PI / 2 - ((p - 10) / 10) * Math.PI;
        return { x: g.cx + g.hl + r * Math.cos(th), y: g.cy + r * Math.sin(th), a: th - Math.PI / 2 };
      }
      if (p < 30) return { x: g.cx + g.hl - ((p - 20) / 10) * 2 * g.hl, y: g.cy - r, a: Math.PI };
      const th = -Math.PI / 2 - ((p - 30) / 10) * Math.PI;
      return { x: g.cx - g.hl + r * Math.cos(th), y: g.cy + r * Math.sin(th), a: th - Math.PI / 2 };
    }

    // Segment index → middle of that segment on the oval.
    place(pos) {
      const race = this.state.stage;
      return this.lapPoint(race.startOffset + pos.x + 0.5, pos.y);
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      for (const cv of [this.c, this.p]) {
        const w = Math.round(cv.clientWidth * dpr);
        const h = Math.round(cv.clientHeight * dpr);
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      }
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.layout();
    }

    frame(now) {
      if (!this.state) return;
      this.resize();
      if (this.anim) this.stepAnim(now);
      this.drawTrack();
      this.drawTrails();
      this.drawGhosts();
      this.drawHorses();
      this.drawProgress();
    }

    // Stadium shape at radius r around the oval centre.
    ovalPath(ctx, r) {
      const g = this.geo;
      ctx.beginPath();
      ctx.moveTo(g.cx - g.hl, g.cy + r);
      ctx.lineTo(g.cx + g.hl, g.cy + r);
      ctx.arc(g.cx + g.hl, g.cy, r, Math.PI / 2, -Math.PI / 2, true);
      ctx.lineTo(g.cx - g.hl, g.cy - r);
      ctx.arc(g.cx - g.hl, g.cy, r, -Math.PI / 2, Math.PI / 2, true);
      ctx.closePath();
    }

    drawTrack() {
      const ctx = this.ctx;
      const g = this.geo;
      const race = this.state.stage;
      ctx.fillStyle = '#4f7f42';
      ctx.fillRect(0, 0, g.W, g.H);
      const outer = g.R0 + C.LANES * g.lw;
      // Track surface.
      this.ovalPath(ctx, outer + g.lw * 0.35);
      ctx.fillStyle = SAND;
      ctx.fill();
      this.ovalPath(ctx, g.R0 - g.lw * 0.1);
      ctx.fillStyle = INFIELD;
      ctx.fill();
      // Infield: a pond and the totalisator board, just for looks.
      ctx.fillStyle = '#6aa0c8';
      ctx.beginPath(); ctx.ellipse(g.cx + g.hl * 0.45, g.cy, g.R0 * 0.35, g.R0 * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2e3a2c';
      ctx.fillRect(g.cx - g.hl * 0.6, g.cy - g.R0 * 0.18, g.hl * 0.6, g.R0 * 0.36);
      ctx.fillStyle = '#ffd84d';
      ctx.font = '700 ' + Math.max(9, g.seg * 0.36) + 'px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(race.name.toUpperCase() + ' · ' + race.meters + ' m', g.cx - g.hl * 0.3, g.cy);
      ctx.textBaseline = 'alphabetic';
      // Lane lines and harrowing stripes.
      ctx.strokeStyle = SAND_DARK;
      ctx.lineWidth = 1;
      ctx.setLineDash([g.seg * 0.25, g.seg * 0.35]);
      for (let l = 1; l < C.LANES; l++) { this.ovalPath(ctx, g.R0 + l * g.lw); ctx.stroke(); }
      ctx.setLineDash([]);
      // Rails.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      this.ovalPath(ctx, g.R0 - g.lw * 0.1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 2;
      this.ovalPath(ctx, outer + g.lw * 0.35); ctx.stroke();
      // Grandstand along the home straight with a bobbing crowd.
      const gy = g.cy + outer + g.lw * 0.9;
      ctx.fillStyle = '#3b3f45';
      ctx.fillRect(g.cx - g.hl * 0.9, gy, g.hl * 1.8, Math.min(g.lw * 2.2, g.H - gy - 2));
      for (let i = 0; i < 46; i++) {
        const x = g.cx - g.hl * 0.86 + (i / 46) * g.hl * 1.72;
        const bob = Math.sin(this.time / 260 + i * 1.7) * 1.2;
        ctx.fillStyle = 'hsl(' + ((i * 47) % 360) + ',55%,60%)';
        ctx.beginPath(); ctx.arc(x, gy + g.lw * 0.55 + (i % 2) * g.lw * 0.6 + bob, Math.max(1.5, g.lw * 0.18), 0, Math.PI * 2); ctx.fill();
      }
      this.drawPost(Kiri.C.FINISH_LAP_POS, 'FINISH', '#111');
      this.drawPost(race.startOffset, 'START', '#1f6fd0');
      this.drawLapBoard();
    }

    drawPost(lapPos, label, color) {
      const ctx = this.ctx;
      const g = this.geo;
      const a = this.lapPoint(lapPos, -0.6);
      const b = this.lapPoint(lapPos, C.LANES - 0.3);
      if (label === 'FINISH') {
        const n = 8;
        for (let i = 0; i < n; i++) {
          ctx.strokeStyle = i % 2 ? '#fff' : '#111';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n);
          ctx.lineTo(a.x + ((b.x - a.x) * (i + 1)) / n, a.y + ((b.y - a.y) * (i + 1)) / n);
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.setLineDash([]);
      }
      const t = this.lapPoint(lapPos, -1.6);
      ctx.font = '800 ' + Math.max(9, g.seg * 0.32) + 'px "Segoe UI", sans-serif';
      const w = ctx.measureText(label).width + 10;
      ctx.fillStyle = color;
      ctx.fillRect(t.x - w / 2, t.y - 8, w, 16);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(label, t.x, t.y + 4);
    }

    drawLapBoard() {
      const ctx = this.ctx;
      const g = this.geo;
      const s = this.state;
      const live = s.riders.filter((r) => !r.finished);
      const lead = live.length ? Math.max.apply(null, live.map((r) => r.square)) : s.stage.finish;
      const toGo = Math.max(0, (s.stage.finish - lead) * C.SEGMENT_M);
      const text = live.length ? toGo + ' m to go' : 'All home';
      ctx.font = '700 ' + Math.max(10, g.seg * 0.36) + 'px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(text, g.cx - g.hl * 0.3, g.cy + g.R0 * 0.18 + Math.max(12, g.seg * 0.45));
    }

    teamColor(r) { return this.state.teams[r.team].color; }

    drawTrails() {
      const ctx = this.ctx;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, this.geo.lw * 0.25);
      for (const t of this.trails) {
        if (t.to.x === t.from.x) continue;
        const end = this.pos[t.id].x;
        const steps = Math.max(2, Math.ceil((end - t.from.x) * 3));
        ctx.strokeStyle = this.teamColor(this.state.riders[t.id]);
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const k = i / steps;
          const pt = this.place({ x: t.from.x + (end - t.from.x) * k, y: t.from.y + (this.pos[t.id].y - t.from.y) * k });
          if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    drawGhosts() {
      if (this.anim) return;
      const ctx = this.ctx;
      const g = this.geo;
      for (const gh of this.ghosts) {
        const r = this.state.riders[gh.id];
        const p = this.place({ x: gh.square, y: gh.lane });
        ctx.strokeStyle = this.teamColor(r);
        ctx.globalAlpha = gh.id === this.selected ? 0.95 : 0.55;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(p.x, p.y, g.lw * 0.62, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fff';
        ctx.font = '800 ' + Math.max(9, g.lw * 0.6) + 'px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(gh.label, p.x, p.y + 4);
        ctx.globalAlpha = 1;
      }
    }

    drawHorses() {
      const s = this.state;
      // Draw back-to-front so horses further round overlap the ones behind.
      const order = s.riders.slice().sort((a, b) => this.pos[a.id].x - this.pos[b.id].x);
      for (const r of order) {
        const p = this.place(this.pos[r.id]);
        this.ctx.globalAlpha = r.finished && !this.anim ? 0.5 : 1;
        this.drawHorse(this.ctx, p, r);
        this.ctx.globalAlpha = 1;
      }
    }

    // Top-down trotter pulling a sulky, facing along the track.
    drawHorse(ctx, p, r) {
      const g = this.geo;
      const mine = r.team === this.human;
      const m = this.motion[r.id] || { moving: false, stride: 0 };
      const k = g.seg / 34;
      const color = this.teamColor(r);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.scale(k, k);
      if (mine && r.id === this.selected && !this.anim) {
        ctx.strokeStyle = '#ffd84d';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(this.time / 220);
        ctx.beginPath(); ctx.ellipse(-4, 0, 27, 12, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = r.finished && !this.anim ? 0.5 : 1;
      }
      ctx.lineCap = 'round';
      // Sulky: shafts, wheels, seat with driver in stable colours.
      ctx.strokeStyle = '#d9d9d9';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-12, -5); ctx.lineTo(4, -4); ctx.moveTo(-12, 5); ctx.lineTo(4, 4); ctx.stroke();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-19, -8); ctx.lineTo(-13, -8); ctx.moveTo(-19, 8); ctx.lineTo(-13, 8); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(-17, 0, 5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mine ? '#ffd84d' : '#f2f2f2';
      ctx.beginPath(); ctx.arc(-15, 0, 3, 0, Math.PI * 2); ctx.fill();
      // Legs: diagonal pairs move together at the trot.
      const ph = m.stride;
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = 2;
      const legs = [[10, -4, 0], [10, 4, Math.PI], [-1, -4, Math.PI], [-1, 4, 0]];
      for (const [lx, ly, off] of legs) {
        const swing = Math.sin(ph + off) * 3.5;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + swing, ly * 1.35); ctx.stroke();
      }
      // Body, neck and head.
      const coat = COATS[r.id % COATS.length];
      ctx.fillStyle = coat;
      ctx.beginPath(); ctx.ellipse(4, 0, 10, 4.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(15, 0, 4.5, 2.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(20, 0, 3.2, 2, 0, 0, Math.PI * 2); ctx.fill();
      // Saddle pad with the start number in stable colours.
      ctx.fillStyle = color;
      ctx.fillRect(0, -4.2, 7, 8.4);
      ctx.strokeStyle = mine ? '#ffd84d' : '#fff';
      ctx.lineWidth = mine ? 1.6 : 0.8;
      ctx.strokeRect(0, -4.2, 7, 8.4);
      ctx.rotate(-p.a);
      ctx.fillStyle = '#fff';
      ctx.font = '800 7px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const nx = Math.cos(p.a) * 3.5;
      const ny = Math.sin(p.a) * 3.5;
      ctx.fillText(String(r.id + 1), nx, ny + 0.5);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
      if (r.crack > 0 && !r.finished) {
        ctx.fillStyle = '#e03131';
        ctx.beginPath(); ctx.arc(p.x, p.y - g.lw * 0.9, Math.max(5, g.lw * 0.3), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '900 ' + Math.max(8, g.lw * 0.4) + 'px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', p.x, p.y - g.lw * 0.9 + 3);
      }
    }

    // Progress strip: every horse by distance covered, with the finish at the right.
    drawProgress() {
      const ctx = this.pctx;
      const W = this.p.clientWidth;
      const H = this.p.clientHeight;
      const s = this.state;
      const css = getComputedStyle(document.documentElement);
      const pad = 14;
      const sx = (sq) => pad + ((sq + 4) / (s.stage.finish + 4)) * (W - 2 * pad);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = css.getPropertyValue('--chip');
      ctx.fillRect(pad, H / 2 - 3, W - 2 * pad, 6);
      // Lap marks every 1000 m before the finish.
      ctx.fillStyle = css.getPropertyValue('--muted');
      ctx.font = '600 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      for (let back = C.LAP; back < s.stage.finish; back += C.LAP) {
        const x = sx(s.stage.finish - back);
        ctx.fillRect(x - 0.5, H / 2 - 8, 1, 16);
        ctx.fillText((back * C.SEGMENT_M) + ' m', x, H - 4);
      }
      ctx.fillStyle = css.getPropertyValue('--ink');
      ctx.fillRect(sx(s.stage.finish) - 1.5, 4, 3, H - 8);
      for (const r of s.riders) {
        const x = sx(Math.min(this.pos[r.id].x, s.stage.finish + 2));
        const y = H / 2 + (r.lane - 1.5) * 5;
        ctx.fillStyle = this.teamColor(r);
        ctx.beginPath(); ctx.arc(x, y, r.team === this.human ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
        if (r.team === this.human) { ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
    }
  }

  Kiri.Renderer = Renderer;
})(window.Kiri = window.Kiri || {});
