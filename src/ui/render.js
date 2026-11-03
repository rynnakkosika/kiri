// Canvas renderer: track strip, stage profile, riders, ghosts and move animation.
(function (Kiri) {
  'use strict';

  const TERRAIN = {
    flat: { road: '#5a5e62', mark: null },
    climb: { road: '#7a5d44', mark: '#e7b98a' },
    descent: { road: '#46607a', mark: '#a9cbe8' },
    cobbles: { road: '#7b766b', mark: '#a59f92' },
  };
  const GRASS = '#5b8a47';
  const GRASS_DARK = '#4c7a3b';

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
      this.camX = -6;
      this.follow = true;
      this.anim = null;
      this.pos = {}; // riderId -> {x: squares, y: lane} as drawn
      this.motion = {}; // riderId -> {vx, vy, pedal} for sprite animation
      this.trails = []; // last turn's moves: {id, from, to}
      this.cell = 46;
      this.lane = 38;
      this.particles = [];
      this.hover = null;
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
      this.buildScenery();
      // Start with the camera already on our riders instead of panning from the start line.
      if (this.camTarget === undefined) this.camX = this.camTarget = this.focusSquare() - this.visibleSquares() / 2;
    }

    lastMoves(state) {
      return state.log.filter((e) => e.turn === state.turn - 1)
        .map((e) => ({ id: e.rider, from: { x: e.from, y: e.fromLane }, to: { x: e.to, y: e.lane } }));
    }

    buildScenery() {
      if (this.scenery && this.scenery.stage === this.state.stage) return;
      const rand = Kiri.rng(this.state.stage.squares.length * 7919 + this.state.stage.finish);
      const items = [];
      for (let i = -12; i < this.state.stage.squares.length + 4; i++) {
        if (rand() < 0.35) items.push({ x: i + rand(), side: rand() < 0.5 ? -1 : 1, d: rand(), kind: rand() < 0.75 ? 'tree' : 'rock' });
        const near = Math.abs(i - this.state.stage.finish) < 8 || Math.abs(i - this.state.stage.sprint) < 3;
        if (near && rand() < 0.9) items.push({ x: i + rand(), side: rand() < 0.5 ? -1 : 1, d: rand() * 0.25, kind: 'fan', hue: Math.floor(rand() * 360) });
      }
      this.scenery = { stage: this.state.stage, items };
    }

    setGhosts(ghosts, selected) { this.ghosts = ghosts; this.selected = selected; }

    centerOn(square) { this.follow = false; this.camTarget = square - this.visibleSquares() / 2; }
    refollow() { this.follow = true; }

    visibleSquares() { return this.c.clientWidth / this.cell; }

    // Animate from the current drawn positions to newState, one rider after another in resolution order.
    animateTo(newState, done) {
      const entries = newState.log.filter((e) => e.turn === newState.turn - 1);
      const tracks = entries.map((e, i) => {
        const dist = Math.max(1, e.to - e.from);
        return { id: e.rider, from: { x: e.from, y: e.fromLane }, to: { x: e.to, y: e.lane }, delay: i * 70, dur: Math.min(750, 280 + dist * 30) };
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
      for (const id in this.motion) { this.motion[id].vx = 0; this.motion[id].vy = 0; }
      a.done();
    }

    stepAnim(now) {
      const a = this.anim;
      const t = now - a.start;
      for (const tr of a.tracks) {
        const k = ease(Math.max(0, Math.min(1, (t - tr.delay) / tr.dur)));
        const next = { x: tr.from.x + (tr.to.x - tr.from.x) * k, y: tr.from.y + (tr.to.y - tr.from.y) * k };
        const prev = this.pos[tr.id];
        const m = this.motion[tr.id] || (this.motion[tr.id] = { vx: 0, vy: 0, pedal: 0 });
        m.vx = next.x - prev.x;
        m.vy = next.y - prev.y;
        m.pedal += m.vx * 5 + (m.vx > 0.001 ? 0.12 : 0);
        this.pos[tr.id] = next;
      }
      if (t >= a.total) this.finishAnim();
    }

    focusSquare() {
      const s = this.state;
      const mine = s.riders.filter((r) => r.team === this.human && !r.finished);
      const list = mine.length ? mine : s.riders.filter((r) => !r.finished);
      if (!list.length) return s.stage.finish;
      const xs = list.map((r) => this.pos[r.id].x);
      const lo = Math.min.apply(null, xs);
      const hi = Math.max.apply(null, xs);
      const vis = this.visibleSquares();
      // Keep both own riders in view; lean forward so the road ahead shows.
      return hi - lo < vis * 0.6 ? (lo + hi) / 2 + vis * 0.12 : hi;
    }

    bindInput() {
      let drag = null;
      this.c.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, cam: this.camX, moved: false }; this.c.classList.add('dragging'); this.c.setPointerCapture(e.pointerId); });
      this.c.addEventListener('pointermove', (e) => {
        if (drag && Math.abs(e.clientX - drag.x) > 5) {
          drag.moved = true;
          this.follow = false;
          this.camX = drag.cam - (e.clientX - drag.x) / this.cell;
          this.camTarget = this.camX;
        }
        if (e.pointerType === 'mouse') this.updateHover(e);
      });
      // A tap (no drag) inspects the rider under the finger; touch has no hover.
      this.c.addEventListener('pointerup', (e) => {
        if (drag && !drag.moved && e.pointerType !== 'mouse') this.updateHover(e);
        drag = null;
        this.c.classList.remove('dragging');
      });
      this.c.addEventListener('pointercancel', () => { drag = null; this.c.classList.remove('dragging'); });
      this.c.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        this.hover = null;
        if (this.onHover) this.onHover(null);
      });
      this.c.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.follow = false;
        this.camTarget = (this.camTarget !== undefined ? this.camTarget : this.camX) + (e.deltaY + e.deltaX) / this.cell * 0.6;
      }, { passive: false });
      this.p.addEventListener('click', (e) => {
        if (!this.state) return;
        const rect = this.p.getBoundingClientRect();
        const n = this.state.stage.squares.length;
        this.centerOn(((e.clientX - rect.left) / rect.width) * (n + 6) - 6);
      });
    }

    updateHover(e) {
      if (!this.state) return;
      const rect = this.c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let hit = null;
      for (const r of this.state.riders) {
        const p = this.screen(this.pos[r.id]);
        if ((p.x - mx) ** 2 + (p.y - my) ** 2 < 15 * 15) hit = r;
      }
      this.hover = hit;
      if (this.onHover) this.onHover(hit, mx, my);
    }

    roadTop() { return (this.c.clientHeight - 3 * this.lane) / 2; }

    screen(pos) {
      return { x: (pos.x - this.camX) * this.cell + this.cell / 2, y: this.roadTop() + pos.y * this.lane + this.lane / 2 };
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const phone = this.c.clientWidth < 700;
      this.cell = phone ? 34 : 46;
      this.lane = phone ? 30 : 38;
      for (const cv of [this.c, this.p]) {
        const w = Math.round(cv.clientWidth * dpr);
        const h = Math.round(cv.clientHeight * dpr);
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      }
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    frame(now) {
      if (!this.state) return;
      this.resize();
      if (this.anim) this.stepAnim(now);
      const vis = this.visibleSquares();
      if (this.follow) this.camTarget = this.focusSquare() - vis / 2;
      const maxCam = this.state.stage.squares.length - vis + 1;
      this.camTarget = Math.max(-8, Math.min(maxCam, this.camTarget));
      this.camX += (this.camTarget - this.camX) * 0.12;
      this.drawTrack();
      this.drawProfile();
    }

    drawTrack() {
      const ctx = this.ctx;
      const W = this.c.clientWidth;
      const H = this.c.clientHeight;
      const s = this.state;
      const top = this.roadTop();
      ctx.fillStyle = GRASS;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = GRASS_DARK;
      ctx.fillRect(0, top - 10, W, 10);
      ctx.fillRect(0, top + 3 * this.lane, W, 10);

      const first = Math.floor(this.camX) - 1;
      const last = Math.ceil(this.camX + W / this.cell) + 1;
      this.drawScenery(top, first, last, false);

      for (let i = first; i <= last; i++) {
        if (i >= s.stage.squares.length) continue;
        const sq = Kiri.squareAt(s.stage, i);
        const x = (i - this.camX) * this.cell;
        const t = TERRAIN[sq.terrain];
        for (let l = 0; l < 3; l++) {
          const y = top + l * this.lane;
          if (l >= sq.width) {
            ctx.fillStyle = GRASS_DARK;
            ctx.fillRect(x, y, this.cell + 1, this.lane);
            continue;
          }
          ctx.fillStyle = t.road;
          ctx.fillRect(x, y, this.cell + 1, this.lane);
          if (sq.terrain === 'cobbles') {
            ctx.fillStyle = t.mark;
            for (let k = 0; k < 6; k++) {
              ctx.beginPath();
              ctx.ellipse(x + 6 + (k % 3) * 15 + (Math.floor(k / 3) % 2) * 7, y + 10 + Math.floor(k / 3) * 17, 5, 4, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (t.mark) {
            ctx.strokeStyle = t.mark;
            ctx.globalAlpha = 0.55;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const cx = x + this.cell / 2;
            const cy = y + this.lane / 2;
            if (sq.terrain === 'climb') { ctx.moveTo(cx - 6, cy + 4); ctx.lineTo(cx, cy - 4); ctx.lineTo(cx + 6, cy + 4); } else { ctx.moveTo(cx - 4, cy - 6); ctx.lineTo(cx + 4, cy); ctx.lineTo(cx - 4, cy + 6); }
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
        // Square separators and lane dashes.
        ctx.strokeStyle = 'rgba(255,255,255,.10)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, top);
        ctx.lineTo(x + 0.5, top + sq.width * this.lane);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.45)';
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        for (let l = 1; l < sq.width; l++) { ctx.moveTo(x, top + l * this.lane); ctx.lineTo(x + this.cell, top + l * this.lane); }
        ctx.stroke();
        ctx.setLineDash([]);
        // Distance markers every 5 squares.
        const toGo = s.stage.finish - i;
        if (i >= 0 && toGo > 0 && toGo % 5 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,.75)';
          ctx.font = '600 11px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(toGo + '', x + this.cell / 2, top + 3 * this.lane + 24);
        }
      }

      this.drawLine(s.stage.sprint, top, 'sprint');
      this.drawLine(s.stage.finish, top, 'finish');
      this.drawLine(0, top, 'start');
      this.drawTrails();
      this.drawGhosts();
      this.drawRiders();
      this.drawScenery(top, first, last, true);
      this.drawWind(W, H);
    }

    drawScenery(top, first, last, front) {
      const ctx = this.ctx;
      for (const it of this.scenery.items) {
        if (it.x < first - 1 || it.x > last + 1) continue;
        if ((it.side > 0) !== front) continue;
        const x = (it.x - this.camX) * this.cell;
        const y = it.side < 0 ? top - 22 - it.d * 50 : top + 3 * this.lane + 34 + it.d * 50;
        if (it.kind === 'tree') {
          ctx.fillStyle = 'rgba(0,0,0,.18)';
          ctx.beginPath(); ctx.ellipse(x + 4, y + 10, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#2f5e2a';
          ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#3c7335';
          ctx.beginPath(); ctx.arc(x - 3, y - 3, 8, 0, Math.PI * 2); ctx.fill();
        } else if (it.kind === 'rock') {
          ctx.fillStyle = '#8b8a83';
          ctx.beginPath(); ctx.ellipse(x, y, 7, 5, 0.3, 0, Math.PI * 2); ctx.fill();
        } else {
          const bob = Math.sin(this.time / 180 + it.x * 3) * 1.5;
          ctx.fillStyle = 'hsl(' + it.hue + ',60%,55%)';
          ctx.beginPath(); ctx.arc(x, y + bob, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#f1d1b5';
          ctx.beginPath(); ctx.arc(x, y - 7 + bob, 3.2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    drawLine(square, top, kind) {
      const ctx = this.ctx;
      const x = (square - this.camX) * this.cell;
      if (x < -60 || x > this.c.clientWidth + 60) return;
      const h = 3 * this.lane;
      if (kind === 'finish') {
        for (let k = 0; k < 12; k++) {
          for (let j = 0; j < 2; j++) {
            ctx.fillStyle = (k + j) % 2 ? '#fff' : '#111';
            ctx.fillRect(x + j * 5 - 5, top + k * (h / 12), 5, h / 12);
          }
        }
      } else if (kind === 'sprint') {
        ctx.fillStyle = '#3ddc84';
        ctx.fillRect(x - 3, top, 6, h);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.fillRect(x - 2, top, 4, h);
      }
      if (kind !== 'start') {
        const label = kind === 'finish' ? 'FINISH' : 'SPRINT 5·3·1';
        ctx.font = '800 11px "Segoe UI", sans-serif';
        const w = ctx.measureText(label).width + 14;
        ctx.fillStyle = kind === 'finish' ? '#111' : '#1f9d57';
        ctx.fillRect(x - w / 2, top - 34, w, 18);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, top - 21);
        ctx.fillStyle = '#ddd';
        ctx.fillRect(x - w / 2, top - 16, 2, 6);
        ctx.fillRect(x + w / 2 - 2, top - 16, 2, 6);
      }
    }

    teamColor(r) { return this.state.teams[r.team].color; }

    drawGhosts() {
      const ctx = this.ctx;
      if (this.anim) return;
      for (const g of this.ghosts) {
        const r = this.state.riders[g.id];
        const from = this.screen(this.pos[r.id]);
        const p = this.screen({ x: g.square, y: g.lane });
        ctx.strokeStyle = this.teamColor(r);
        ctx.globalAlpha = g.id === this.selected ? 0.95 : 0.55;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(from.x + 16, from.y);
        ctx.quadraticCurveTo((from.x + p.x) / 2, Math.min(from.y, p.y) - 18, p.x - 16, p.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fff';
        ctx.font = '800 11px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(g.label, p.x, p.y + 4);
        ctx.globalAlpha = 1;
      }
    }

    drawRiders() {
      const ctx = this.ctx;
      const s = this.state;
      const sorted = s.riders.slice().sort((a, b) => (a.finished === b.finished ? 0 : a.finished ? -1 : 1));
      for (const r of sorted) {
        const p = this.screen(this.pos[r.id]);
        if (p.x < -30 || p.x > this.c.clientWidth + 30) continue;
        const mine = r.team === this.human;
        ctx.globalAlpha = r.finished && !this.anim ? 0.55 : 1;
        if (mine && r.id === this.selected && !this.anim) {
          ctx.strokeStyle = '#ffd84d';
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.5 + 0.4 * Math.sin(this.time / 220);
          ctx.beginPath(); ctx.ellipse(p.x, p.y, 23 * this.cell / 46, 15, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        this.drawCyclist(ctx, p, r, mine);
        if (r.crack > 0 && !r.finished) {
          ctx.fillStyle = '#e03131';
          ctx.beginPath(); ctx.arc(p.x + 10, p.y - 12, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = '900 9px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', p.x + 10, p.y - 9);
        }
        ctx.globalAlpha = 1;
      }
    }

    // Top-down cyclist facing right: wheels, pedaling legs, jersey, arms, helmet, back number.
    drawCyclist(ctx, p, r, mine) {
      const m = this.motion[r.id] || { vx: 0, vy: 0, pedal: 0 };
      const k = (this.cell / 46) * 1.2;
      const color = this.teamColor(r);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath(); ctx.ellipse(2, 5, 18 * k, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(Math.max(-0.5, Math.min(0.5, m.vy * 2.5)));
      ctx.scale(k, k);
      ctx.lineCap = 'round';
      // Wheels and frame.
      ctx.strokeStyle = '#1b1d20';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-8, 0); ctx.moveTo(8, 0); ctx.lineTo(18, 0); ctx.stroke();
      ctx.strokeStyle = '#c9ccd1';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke();
      // Legs: knees swing forward and back in opposite phase.
      const ph = m.pedal;
      ctx.strokeStyle = '#26282c';
      ctx.lineWidth = 3.4;
      for (const side of [-1, 1]) {
        const knee = Math.cos(ph + (side > 0 ? Math.PI : 0)) * 4;
        ctx.beginPath(); ctx.moveTo(-4, side * 3.5); ctx.lineTo(1 + knee, side * 6); ctx.lineTo(-1 + knee * 0.6, side * 3); ctx.stroke();
      }
      // Arms to the handlebars.
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(1, -5); ctx.lineTo(11, -5.5); ctx.moveTo(1, 5); ctx.lineTo(11, 5.5); ctx.stroke();
      ctx.strokeStyle = '#1b1d20';
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(11, -7); ctx.lineTo(11, 7); ctx.stroke();
      // Jersey.
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(-3, 0, 9.5, 7.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = mine ? '#ffd84d' : 'rgba(255,255,255,.85)';
      ctx.lineWidth = mine ? 2.6 : 1.4;
      ctx.stroke();
      // Helmet.
      ctx.fillStyle = mine ? '#ffd84d' : '#f4f4f4';
      ctx.beginPath(); ctx.ellipse(6, 0, 5, 4.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.fillRect(3, -1, 6, 2);
      // Back number.
      ctx.fillStyle = '#fff';
      ctx.font = '800 9px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(r.id + 1), -4.5, 0.5);
      ctx.restore();
      ctx.textBaseline = 'alphabetic';
    }

    drawTrails() {
      const ctx = this.ctx;
      ctx.lineCap = 'round';
      ctx.lineWidth = 3;
      for (const t of this.trails) {
        if (t.to.x === t.from.x && t.to.y === t.from.y) continue;
        const a = this.screen(t.from);
        const b = this.screen(this.pos[t.id]);
        if (Math.max(a.x, b.x) < -20 || Math.min(a.x, b.x) > this.c.clientWidth + 20) continue;
        const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        const col = this.teamColor(this.state.riders[t.id]);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, col);
        ctx.strokeStyle = g;
        ctx.globalAlpha = 0.45;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x - 12, b.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    drawWind(W, H) {
      const wind = this.state.wind;
      if (wind === 'calm') return;
      const ctx = this.ctx;
      const dir = { head: [-1, 0], crossLeft: [0, 1], crossRight: [0, -1] }[wind];
      while (this.particles.length < 26) {
        this.particles.push({ x: Math.random() * W, y: Math.random() * H, life: Math.random() });
      }
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const pt of this.particles) {
        pt.x += dir[0] * 4 + (dir[1] ? 1.2 : 0);
        pt.y += dir[1] * 3;
        pt.life -= 0.006;
        if (pt.life <= 0 || pt.x < -20 || pt.y < -20 || pt.y > H + 20) {
          pt.x = dir[0] < 0 ? W + Math.random() * 40 : Math.random() * W;
          pt.y = dir[1] > 0 ? -10 : dir[1] < 0 ? H + 10 : Math.random() * H;
          pt.life = 1;
        }
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x - dir[0] * 16, pt.y - dir[1] * 12);
      }
      ctx.stroke();
    }

    drawProfile() {
      const ctx = this.pctx;
      const W = this.p.clientWidth;
      const H = this.p.clientHeight;
      const s = this.state;
      const n = s.stage.squares.length;
      const span = n + 6;
      const sx = (i) => ((i + 6) / span) * W;
      const heights = [0];
      let h = 0;
      for (let i = 0; i < n; i++) {
        const t = s.stage.squares[i].terrain;
        h += t === 'climb' ? 1 : t === 'descent' ? -1 : 0;
        heights.push(h);
      }
      const lo = Math.min.apply(null, heights);
      const hi = Math.max.apply(null, heights);
      const sy = (v) => H - 10 - ((v - lo) / Math.max(1, hi - lo)) * (H - 26);
      const css = getComputedStyle(document.documentElement);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = css.getPropertyValue('--chip');
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, sy(0));
      for (let i = 0; i < n; i++) ctx.lineTo(sx(i + 1), sy(heights[i + 1]));
      ctx.lineTo(W, H);
      ctx.fill();
      for (let i = 0; i < n; i++) {
        const t = s.stage.squares[i].terrain;
        if (t === 'flat') continue;
        ctx.strokeStyle = t === 'climb' ? '#c26a2b' : t === 'descent' ? '#3f7fbf' : '#8a8376';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx(i), sy(heights[i])); ctx.lineTo(sx(i + 1), sy(heights[i + 1])); ctx.stroke();
      }
      ctx.fillStyle = '#1f9d57';
      ctx.fillRect(sx(s.stage.sprint) - 1, 4, 2, H - 8);
      ctx.fillStyle = css.getPropertyValue('--ink');
      ctx.fillRect(sx(s.stage.finish) - 1.5, 4, 3, H - 8);
      // Viewport.
      ctx.strokeStyle = css.getPropertyValue('--accent');
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx(this.camX), 2, (this.visibleSquares() / span) * W, H - 4);
      for (const r of s.riders) {
        const p = this.pos[r.id];
        const hx = Math.max(0, Math.min(n, Math.round(p.x)));
        ctx.fillStyle = this.teamColor(r);
        ctx.beginPath();
        ctx.arc(sx(p.x + 0.5), sy(heights[hx]) - 4, r.team === this.human ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
        if (r.team === this.human) { ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
    }
  }

  Kiri.Renderer = Renderer;
})(window.Kiri = window.Kiri || {});
