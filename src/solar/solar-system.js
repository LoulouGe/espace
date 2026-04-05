// src/solar/solar-system.js -- Solar system rendering

import {
  J2000_MS, ORBITAL_ELEMENTS, EARTH_EL, JUPITER_EL, SATURN_EL,
  BASE_ORBIT_R, MOON_EL, TITAN_EL, IO_EL, EUROPA_EL, PLUTO_EL,
  PLUTO_ORBIT_R, GAS_GIANTS, LANDABLE, LANDABLE_STARS, PLANET_AU, AU_KM,
  getFact, orbitBodyName,
} from '../data/orbits.js';
import { hexAlpha, mixHex, lightenColor } from '../utils.js';
import { SolarMeteorSystem } from './solar-meteors.js';
import { t, getLang } from '../i18n/i18n.js';

function drawInfoChip(ctx, x, y, title, accent, subtitle) {
  ctx.save();
  ctx.font = '10px "Share Tech Mono", monospace';
  const titleW = ctx.measureText(title).width;
  ctx.font = subtitle ? '7px monospace' : '10px "Share Tech Mono", monospace';
  const subW = subtitle ? ctx.measureText(subtitle).width : 0;
  const w = Math.max(titleW, subW) + 18;
  const h = subtitle ? 24 : 16;
  const px = x - w / 2;
  const py = y;
  ctx.fillStyle = 'rgba(5, 16, 34, 0.64)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(px, py, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(235,245,255,0.92)';
  ctx.font = '10px "Share Tech Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(title, x, py + 11);
  if (subtitle) {
    ctx.fillStyle = '#fc0';
    ctx.font = '7px monospace';
    ctx.fillText(subtitle, x, py + 20);
  }
  ctx.restore();
}

function drawOrbitalBody(ctx, body, pos, options = {}) {
  const { hovered = false, locked = false, subtitle = '', accent = 'rgba(109, 231, 255, 0.22)' } = options;
  const base = body.color;
  const r = body.r;
  const glowR = r * (hovered ? 5.2 : 3.3);
  const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
  glow.addColorStop(0, hexAlpha(base, hovered ? 0.96 : 0.62));
  glow.addColorStop(0.35, hexAlpha(base, hovered ? 0.30 : 0.16));
  glow.addColorStop(1, hexAlpha(base, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
  ctx.fill();

  if (body.id === 'saturn') {
    ctx.strokeStyle = 'rgba(240,224,170,0.26)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, r * 2.8, r * 0.84, 0.42, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,244,210,0.34)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, r * 2.2, r * 0.58, 0.42, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  const disc = ctx.createRadialGradient(pos.x - r * 0.34, pos.y - r * 0.38, r * 0.12, pos.x, pos.y, r);
  disc.addColorStop(0, mixHex(base, '#ffffff', 0.42));
  disc.addColorStop(0.55, hovered ? lightenColor(base, 26) : base);
  disc.addColorStop(1, mixHex(base, '#050814', 0.56));
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fill();

  if (body.id === 'jupiter' || body.id === 'saturn') {
    ctx.save();
    const bands = body.id === 'jupiter'
      ? ['#8d4c1d', '#f0d5ab', '#aa6229', '#f7deb3']
      : ['#f5dfaf', '#a97834', '#f0c873'];
    bands.forEach((c, i) => {
      ctx.strokeStyle = hexAlpha(c, 0.22);
      ctx.lineWidth = r * (body.id === 'jupiter' ? 0.16 : 0.12);
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y + r * (-0.42 + i * 0.28), r * 0.96, r * 0.12, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  }

  if (body.id === 'earth') {
    ctx.fillStyle = 'rgba(76, 214, 110, 0.22)';
    ctx.beginPath(); ctx.ellipse(pos.x - r * 0.06, pos.y - r * 0.08, r * 0.34, r * 0.18, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(pos.x + r * 0.18, pos.y + r * 0.12, r * 0.20, r * 0.10, 0.2, 0, Math.PI * 2); ctx.fill();
  }

  if (body.id === 'europa' || body.id === 'uranus' || body.id === 'neptune') {
    ctx.strokeStyle = hexAlpha('#ffffff', 0.18);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pos.x - r * 0.65, pos.y - r * 0.18);
    ctx.lineTo(pos.x + r * 0.58, pos.y + r * 0.05);
    ctx.moveTo(pos.x - r * 0.30, pos.y + r * 0.40);
    ctx.lineTo(pos.x + r * 0.18, pos.y - r * 0.34);
    ctx.stroke();
  }

  const spec = ctx.createRadialGradient(pos.x - r * 0.45, pos.y - r * 0.48, 0, pos.x - r * 0.45, pos.y - r * 0.48, r * 0.6);
  spec.addColorStop(0, 'rgba(255,255,255,0.34)');
  spec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.arc(pos.x - r * 0.12, pos.y - r * 0.12, r * 0.68, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexAlpha(mixHex(base, '#ffffff', 0.35), 0.28);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.stroke();

  if (body.id === 'saturn') {
    ctx.strokeStyle = 'rgba(240,224,170,0.42)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, r * 2.8, r * 0.84, 0.42, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,244,210,0.48)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, r * 2.2, r * 0.58, 0.42, 0, Math.PI);
    ctx.stroke();
  }

  if (locked) {
    ctx.fillStyle = 'rgba(255,220,140,0.96)';
    ctx.font = `${Math.max(10, r)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('\u{1F512}', pos.x, pos.y + r * 0.38);
  }

  drawInfoChip(ctx, pos.x, pos.y + r + 8, orbitBodyName(body.id), accent, subtitle);
}

export class SolarSystem {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.cx = w / 2; this.cy = h / 2;
    this.simTime = Date.now();
    this._computeScale();
    this._buildStars(350);
    this._twinkle = new Float32Array(350).map(() => Math.random());
    this.meteors = new SolarMeteorSystem();
  }

  _computeScale() {
    const minDim = Math.min(this.w, this.h);
    this.orbitScale = (minDim * 0.47) / 395;
    ORBITAL_ELEMENTS.forEach((el, i) => {
      el.orbitR = BASE_ORBIT_R[i] * this.orbitScale;
    });
    MOON_EL.orbitR   = 22 * this.orbitScale;
    TITAN_EL.orbitR  = 28 * this.orbitScale;
    IO_EL.orbitR     = 20 * this.orbitScale;
    EUROPA_EL.orbitR = 26 * this.orbitScale;
    PLUTO_EL.orbitR  = PLUTO_ORBIT_R * this.orbitScale;
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this.cx = w / 2; this.cy = h / 2;
    this._computeScale();
    this._buildStars(350);
    this.meteors = new SolarMeteorSystem();
  }

  _buildStars(n) {
    this.stars = [];
    for (let i = 0; i < n; i++) {
      this.stars.push({
        x: Math.random(), y: Math.random(),
        b: 0.2 + Math.random() * 0.8,
        s: Math.random() < 0.85 ? 1 : (Math.random() < 0.6 ? 1.5 : 2),
        tw: Math.random() * Math.PI * 2,
        tws: 0.5 + Math.random() * 1.5,
      });
    }
  }

  _angle(el, t) {
    const days = (t - J2000_MS) / 86400000;
    return (((el.L0 + el.dL * days) % 360) + 360) % 360;
  }

  _pos(el, t) {
    const rad = this._angle(el, t) * Math.PI / 180;
    return { x: this.cx + el.orbitR * Math.cos(rad), y: this.cy + el.orbitR * Math.sin(rad) };
  }

  _moonPos(parentPos, moonEl, t) {
    const rad = this._angle(moonEl, t) * Math.PI / 180;
    return { x: parentPos.x + moonEl.orbitR * Math.cos(rad), y: parentPos.y + moonEl.orbitR * Math.sin(rad) };
  }

  getBodyAt(sx, sy) {
    const plutoPos = this._pos(PLUTO_EL, this.simTime);
    if (Math.hypot(sx - plutoPos.x, sy - plutoPos.y) <= Math.max(PLUTO_EL.r + 6, 14)) return 'pluto';

    for (const el of ORBITAL_ELEMENTS) {
      const p = this._pos(el, this.simTime);
      if (Math.hypot(sx - p.x, sy - p.y) <= Math.max(el.r + 6, 14)) return el.id;
    }
    const earthPos  = this._pos(EARTH_EL, this.simTime);
    const moonPos   = this._moonPos(earthPos, MOON_EL, this.simTime);
    if (Math.hypot(sx - moonPos.x, sy - moonPos.y) <= 14) return 'moon';

    const saturnPos = this._pos(SATURN_EL, this.simTime);
    const titanPos  = this._moonPos(saturnPos, TITAN_EL, this.simTime);
    if (Math.hypot(sx - titanPos.x, sy - titanPos.y) <= 14) return 'titan';

    const jupiterPos = this._pos(JUPITER_EL, this.simTime);
    const ioPos      = this._moonPos(jupiterPos, IO_EL, this.simTime);
    if (Math.hypot(sx - ioPos.x, sy - ioPos.y) <= 14) return 'io';

    const europaPos  = this._moonPos(jupiterPos, EUROPA_EL, this.simTime);
    if (Math.hypot(sx - europaPos.x, sy - europaPos.y) <= 14) return 'europa';

    return null;
  }

  getBodyScreenPos(id) {
    if (id === 'moon') {
      const earthPos = this._pos(EARTH_EL, this.simTime);
      return this._moonPos(earthPos, MOON_EL, this.simTime);
    }
    if (id === 'titan') {
      const saturnPos = this._pos(SATURN_EL, this.simTime);
      return this._moonPos(saturnPos, TITAN_EL, this.simTime);
    }
    if (id === 'io') {
      const jupiterPos = this._pos(JUPITER_EL, this.simTime);
      return this._moonPos(jupiterPos, IO_EL, this.simTime);
    }
    if (id === 'europa') {
      const jupiterPos = this._pos(JUPITER_EL, this.simTime);
      return this._moonPos(jupiterPos, EUROPA_EL, this.simTime);
    }
    if (id === 'pluto') return this._pos(PLUTO_EL, this.simTime);
    const el = ORBITAL_ELEMENTS.find(e => e.id === id);
    return el ? this._pos(el, this.simTime) : { x: this.cx, y: this.cy };
  }

  update(dt) {
    this.simTime += dt * 1000;
  }

  draw(ctx, dtSec, hoveredId, lockedIds, fuelInfo, leaderboard) {
    const t_ = this.simTime;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, this.h);
    bg.addColorStop(0, '#061120');
    bg.addColorStop(0.45, '#040a18');
    bg.addColorStop(1, '#02050d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    const nebulaA = ctx.createRadialGradient(this.w * 0.18, this.h * 0.14, 0, this.w * 0.18, this.h * 0.14, this.w * 0.52);
    nebulaA.addColorStop(0, 'rgba(60, 170, 255, 0.10)');
    nebulaA.addColorStop(1, 'rgba(60, 170, 255, 0)');
    ctx.fillStyle = nebulaA;
    ctx.fillRect(0, 0, this.w, this.h);

    const nebulaB = ctx.createRadialGradient(this.w * 0.84, this.h * 0.22, 0, this.w * 0.84, this.h * 0.22, this.w * 0.40);
    nebulaB.addColorStop(0, 'rgba(255, 180, 80, 0.08)');
    nebulaB.addColorStop(1, 'rgba(255, 180, 80, 0)');
    ctx.fillStyle = nebulaB;
    ctx.fillRect(0, 0, this.w, this.h);

    // Stars with twinkle
    for (const s of this.stars) {
      if (dtSec) s.tw += s.tws * dtSec;
      const alpha = s.b * (0.7 + 0.3 * Math.sin(s.tw));
      const color = s.s > 1.2 ? `rgba(160,220,255,${alpha.toFixed(2)})` : `rgba(255,245,225,${alpha.toFixed(2)})`;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(s.x * this.w, s.y * this.h, s.s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Meteors
    this.meteors.update(dtSec || 0.016, this.w, this.h);
    this.meteors.draw(ctx);

    // Orbit rings
    ctx.strokeStyle = 'rgba(170,210,255,0.08)';
    ctx.lineWidth = 1;
    for (const el of ORBITAL_ELEMENTS) {
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, el.orbitR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Moon orbit (near Earth)
    const earthPos = this._pos(EARTH_EL, t_);
    ctx.strokeStyle = 'rgba(150,180,255,0.1)';
    ctx.beginPath();
    ctx.arc(earthPos.x, earthPos.y, MOON_EL.orbitR, 0, Math.PI * 2);
    ctx.stroke();

    // Titan orbit (near Saturn)
    const saturnPos = this._pos(SATURN_EL, t_);
    ctx.strokeStyle = 'rgba(200,150,50,0.1)';
    ctx.beginPath();
    ctx.arc(saturnPos.x, saturnPos.y, TITAN_EL.orbitR, 0, Math.PI * 2);
    ctx.stroke();

    // Io + Europa orbits (near Jupiter)
    const jupiterPos = this._pos(JUPITER_EL, t_);
    ctx.strokeStyle = 'rgba(200,160,30,0.1)';
    ctx.beginPath(); ctx.arc(jupiterPos.x, jupiterPos.y, IO_EL.orbitR,     0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(100,160,220,0.1)';
    ctx.beginPath(); ctx.arc(jupiterPos.x, jupiterPos.y, EUROPA_EL.orbitR, 0, Math.PI * 2); ctx.stroke();

    // Pluto orbit ring
    ctx.strokeStyle = 'rgba(192,170,136,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, PLUTO_EL.orbitR, 0, Math.PI * 2); ctx.stroke();

    // Orbital trails
    const TRAIL_N = 55;
    const TRAIL_DAYS = 3;
    for (const el of ORBITAL_ELEMENTS) {
      for (let k = 1; k <= TRAIL_N; k++) {
        const pastT = t_ - k * TRAIL_DAYS * 86400000;
        const pp    = this._pos(el, pastT);
        const alpha = (1 - k / TRAIL_N) * 0.5;
        ctx.fillStyle = hexAlpha(el.color, alpha);
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Moon trail
    for (let k = 1; k <= 35; k++) {
      const pastT = t_ - k * 0.7 * 86400000;
      const ep    = this._pos(EARTH_EL, pastT);
      const mp    = this._moonPos(ep, MOON_EL, pastT);
      ctx.fillStyle = `rgba(184,184,184,${((1 - k/35) * 0.4).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(mp.x, mp.y, 1, 0, Math.PI * 2); ctx.fill();
    }
    // Titan trail
    for (let k = 1; k <= 35; k++) {
      const pastT = t_ - k * 0.5 * 86400000;
      const sp    = this._pos(SATURN_EL, pastT);
      const tp2   = this._moonPos(sp, TITAN_EL, pastT);
      ctx.fillStyle = `rgba(204,136,51,${((1 - k/35) * 0.4).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(tp2.x, tp2.y, 1, 0, Math.PI * 2); ctx.fill();
    }
    // Io trail
    for (let k = 1; k <= 20; k++) {
      const pastT = t_ - k * 0.06 * 86400000;
      const jp2   = this._pos(JUPITER_EL, pastT);
      const ip    = this._moonPos(jp2, IO_EL, pastT);
      ctx.fillStyle = `rgba(212,168,32,${((1 - k/20) * 0.35).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(ip.x, ip.y, 1, 0, Math.PI * 2); ctx.fill();
    }
    // Europa trail
    for (let k = 1; k <= 20; k++) {
      const pastT = t_ - k * 0.12 * 86400000;
      const jp3   = this._pos(JUPITER_EL, pastT);
      const ep    = this._moonPos(jp3, EUROPA_EL, pastT);
      ctx.fillStyle = `rgba(122,173,224,${((1 - k/20) * 0.35).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(ep.x, ep.y, 1, 0, Math.PI * 2); ctx.fill();
    }
    // Pluto trail
    for (let k = 1; k <= 25; k++) {
      const pastT = t_ - k * 10 * 86400000;
      const pp2   = this._pos(PLUTO_EL, pastT);
      ctx.fillStyle = `rgba(192,170,136,${((1 - k/25) * 0.3).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(pp2.x, pp2.y, 1, 0, Math.PI * 2); ctx.fill();
    }

    // Sun corona
    const sg = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, 84);
    sg.addColorStop(0,   'rgba(255,246,190,0.95)');
    sg.addColorStop(0.25,'rgba(255,210,86,0.64)');
    sg.addColorStop(0.6, 'rgba(255,120,0,0.22)');
    sg.addColorStop(1,   'rgba(255,60,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, 84, 0, Math.PI * 2);
    ctx.fill();

    // Sun
    ctx.fillStyle = '#ffe07a';
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff5c2';
    ctx.beginPath();
    ctx.arc(this.cx - 3, this.cy - 3, 8, 0, Math.PI * 2);
    ctx.fill();

    // Planets
    for (let i = 0; i < ORBITAL_ELEMENTS.length; i++) {
      const el = ORBITAL_ELEMENTS[i];
      const pos = this._pos(el, t_);
      const isLocked = lockedIds && lockedIds.has(el.id);
      const isHovered = hoveredId === el.id;
      const subtitle = LANDABLE.has(el.id)
        ? (leaderboard && leaderboard[el.id]
            ? '\u2605'.repeat(leaderboard[el.id].stars || 0) + '\u2606'.repeat(3 - (leaderboard[el.id].stars || 0))
            : '\u2605'.repeat(LANDABLE_STARS[el.id]) + '\u2606'.repeat(5 - LANDABLE_STARS[el.id]))
        : t('gas_giant');
      ctx.save();
      if (isLocked) ctx.globalAlpha = 0.38;
      drawOrbitalBody(ctx, el, pos, {
        hovered: isHovered,
        locked: isLocked,
        subtitle,
        accent: isLocked ? 'rgba(255, 214, 118, 0.16)' : 'rgba(109, 231, 255, 0.18)',
      });
      ctx.restore();
    }

    const moonBodies = [
      { body: MOON_EL, pos: this._moonPos(earthPos, MOON_EL, t_), key: 'moon', accent: 'rgba(210,210,220,0.18)' },
      { body: TITAN_EL, pos: this._moonPos(saturnPos, TITAN_EL, t_), key: 'titan', accent: 'rgba(228,180,90,0.18)' },
      { body: IO_EL, pos: this._moonPos(jupiterPos, IO_EL, t_), key: 'io', accent: 'rgba(240,200,90,0.18)' },
      { body: EUROPA_EL, pos: this._moonPos(jupiterPos, EUROPA_EL, t_), key: 'europa', accent: 'rgba(130,190,240,0.18)' },
      { body: PLUTO_EL, pos: this._pos(PLUTO_EL, t_), key: 'pluto', accent: 'rgba(212,196,166,0.18)' },
    ];

    for (const item of moonBodies) {
      const isLocked = lockedIds && lockedIds.has(item.key);
      const isHovered = hoveredId === item.key;
      const subtitle = leaderboard && leaderboard[item.key]
        ? '\u2605'.repeat(leaderboard[item.key].stars || 0) + '\u2606'.repeat(3 - (leaderboard[item.key].stars || 0))
        : '\u2605'.repeat(LANDABLE_STARS[item.key]) + '\u2606'.repeat(5 - LANDABLE_STARS[item.key]);
      ctx.save();
      if (isLocked) ctx.globalAlpha = 0.38;
      drawOrbitalBody(ctx, item.body, item.pos, {
        hovered: isHovered,
        locked: isLocked,
        subtitle,
        accent: item.accent,
      });
      ctx.restore();
    }

    // Bottom hint
    drawInfoChip(ctx, Math.max(150, this.w * 0.18), this.h - 30, t('solar.hint'), 'rgba(109, 231, 255, 0.18)', null);
  }

  getDistFromEarth(id) {
    if (id === 'moon')   return '384 400 km';
    if (id === 'titan')  id = 'saturn';
    if (id === 'io')     id = 'jupiter';
    if (id === 'europa') id = 'jupiter';
    const au = PLANET_AU[id];
    if (!au) return null;
    const earthEl  = EARTH_EL;
    const targetEl = ORBITAL_ELEMENTS.find(e => e.id === id);
    if (!targetEl) return null;
    const eA = this._angle(earthEl,  this.simTime) * Math.PI / 180;
    const tA = this._angle(targetEl, this.simTime) * Math.PI / 180;
    const dKm = Math.sqrt(1 + au*au - 2*au*Math.cos(tA - eA)) * AU_KM;
    if (dKm > 1e9)  return (dKm / 1e9).toFixed(2) + ' Md km';
    if (dKm > 1e6)  return Math.round(dKm / 1e6) + ' M km';
    return Math.round(dKm / 1000) + ' k km';
  }

  getFact(id, idx) {
    return getFact(id, idx);
  }

  getSimDate() {
    const d = new Date(this.simTime);
    return d.toLocaleDateString(getLang() === 'en' ? 'en-US' : 'fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
