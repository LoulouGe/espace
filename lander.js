// lander.js — Physics, Terrain, Particles, Lander, LanderGame

// ─── Planet configurations ───────────────────────────────────────────────────
const BODY_DATA = {
  moon: {
    name: 'Lune', emoji: '🌕', stars: 1,
    gravity: 1.62,
    drag: 0,
    windType: 'none', windBase: 0, windAmp: 0,
    groundColor: '#8a8a8a', groundAccent: '#606060', groundDark: '#404040',
    skyTop: '#000000', skyBot: '#000018',
    showStars: true, starAlpha: 1.0,
    hasFog: false,
    terrainRoughness: 0.75,
    padWidth: 65, startAlt: 165, startFuel: 800,
    maxVSpeed: 3.0, maxHSpeed: 2.0, maxAngle: 15,
    hazardType: 'none',
    conditions: [
      { ci: '🌑', txt: "Pas d'atmosphère" },
      { ci: '⚖️', txt: 'Faible gravité: 1.62 m/s²' },
      { ci: '🪨', txt: 'Surface cratérisée' },
    ],
    desc: 'Notre satellite naturel. Faible gravité, aucune atmosphère, conditions prévisibles. Idéal pour débuter.',
  },
  mercury: {
    name: 'Mercure', emoji: '⚫', stars: 2,
    gravity: 3.70,
    drag: 0,
    windType: 'none', windBase: 0, windAmp: 0,
    groundColor: '#707070', groundAccent: '#505050', groundDark: '#303030',
    skyTop: '#000000', skyBot: '#050508',
    showStars: true, starAlpha: 0.9,
    hasFog: false,
    terrainRoughness: 1.0,
    padWidth: 52, startAlt: 165, startFuel: 900,
    maxVSpeed: 2.5, maxHSpeed: 1.5, maxAngle: 12,
    hazardType: 'flare',
    conditions: [
      { ci: '⚫', txt: "Pas d'atmosphère" },
      { ci: '⚖️', txt: 'Gravité: 3.7 m/s²' },
      { ci: '🌋', txt: 'Terrain très accidenté' },
      { ci: '☀️', txt: 'Éruptions solaires (moteur coupé)' },
    ],
    desc: 'Proche du Soleil, terrain chaotique. Des éruptions solaires peuvent couper votre moteur au pire moment.',
  },
  mars: {
    name: 'Mars', emoji: '🔴', stars: 3,
    gravity: 3.72,
    drag: 0.004,
    windType: 'gusty', windBase: 4, windAmp: 16,
    windGustChance: 0.0015,  // per second
    hasDustStorm: true, dustStormChance: 0.0003,
    groundColor: '#8b3a0f', groundAccent: '#5a2808', groundDark: '#3a1805',
    skyTop: '#7a2010', skyBot: '#c04520',
    showStars: false, starAlpha: 0,
    hasFog: true, fogColor: 'rgba(180,80,30,0.18)',
    terrainRoughness: 0.7,
    padWidth: 45, startAlt: 155, startFuel: 1000,
    maxVSpeed: 2.5, maxHSpeed: 1.5, maxAngle: 10,
    hazardType: 'magnetic',
    conditions: [
      { ci: '💨', txt: 'Vent: 4–20 m/s' },
      { ci: '🌪️', txt: 'Tempêtes de poussière' },
      { ci: '🧲', txt: 'Orages magnétiques (gyroscope inversé)' },
      { ci: '🌫️', txt: 'Atmosphère fine (CO₂)' },
    ],
    desc: 'La planète rouge. Tempêtes de poussière et orages magnétiques qui inversent vos commandes de rotation.',
  },
  titan: {
    name: 'Titan', emoji: '🟠', stars: 3,
    gravity: 1.35,
    drag: 0.012,
    windType: 'shear', windBase: 10, windAmp: 22,
    groundColor: '#704214', groundAccent: '#4a2a0a', groundDark: '#2a1505',
    skyTop: '#552200', skyBot: '#aa5500',
    showStars: false, starAlpha: 0,
    hasFog: true, fogColor: 'rgba(200,100,0,0.3)',
    terrainRoughness: 0.55,
    padWidth: 42, startAlt: 155, startFuel: 1050,
    maxVSpeed: 2.0, maxHSpeed: 1.0, maxAngle: 10,
    hazardType: 'downburst',
    conditions: [
      { ci: '💨', txt: 'Vents forts: 10–32 m/s' },
      { ci: '🌫️', txt: 'Atmosphère épaisse (azote/méthane)' },
      { ci: '⬇️', txt: 'Rafales verticales soudaines' },
      { ci: '⚖️', txt: 'Faible gravité: 1.35 m/s²' },
    ],
    desc: 'Lune de Saturne. Vents forts et rafales verticales descendantes soudaines. La faible gravité est votre seul atout.',
  },
  earth: {
    name: 'Terre', emoji: '🌍', stars: 4,
    gravity: 9.81,
    drag: 0.007,
    windType: 'turbulent', windBase: 7, windAmp: 20,
    groundColor: '#2d7a2d', groundAccent: '#1a4a1a', groundDark: '#0a2a0a',
    skyTop: '#08204e', skyBot: '#1a5276',
    showStars: false, starAlpha: 0,
    hasFog: true, fogColor: 'rgba(100,150,255,0.12)',
    hasClouds: true,
    terrainRoughness: 0.45,
    padWidth: 38, startAlt: 145, startFuel: 1250,
    maxVSpeed: 2.0, maxHSpeed: 1.0, maxAngle: 8,
    hazardType: 'lightning',
    conditions: [
      { ci: '🌬️', txt: 'Vent: 7–27 m/s + turbulences' },
      { ci: '⚖️', txt: 'Forte gravité: 9.81 m/s²' },
      { ci: '⚡', txt: 'Risque de foudre (impulsion latérale)' },
      { ci: '🌊', txt: 'Courants atmosphériques' },
    ],
    desc: 'Atterrir sur Terre est sous-estimé: forte gravité, turbulences, et coups de foudre qui vous déstabilisent.',
  },
  venus: {
    name: 'Vénus', emoji: '🌕', stars: 5,
    gravity: 8.87,
    drag: 0.03,
    windType: 'hurricane', windBase: 22, windAmp: 30,
    groundColor: '#5a2a05', groundAccent: '#3a1502', groundDark: '#1a0800',
    skyTop: '#5a1500', skyBot: '#aa3000',
    showStars: false, starAlpha: 0,
    hasFog: true, fogColor: 'rgba(255,80,0,0.35)',
    terrainRoughness: 0.85,
    padWidth: 28, startAlt: 155, startFuel: 1400,
    maxVSpeed: 1.5, maxHSpeed: 0.8, maxAngle: 5,
    hazardType: 'acidrain',
    conditions: [
      { ci: '🌪️', txt: 'Vents dévastateurs: 22–52 m/s' },
      { ci: '⚖️', txt: 'Gravité: 8.87 m/s²' },
      { ci: '🔥', txt: 'Température: 462°C' },
      { ci: '☠️', txt: 'Pluie d\'acide (carburant 2× plus vite)' },
      { ci: '💀', txt: 'Atmosphère ultra-dense (CO₂)' },
    ],
    desc: 'ENFER. Vents dévastateurs et pluies d\'acide qui rongent votre carburant deux fois plus vite. Réservé aux meilleurs.',
  },
};

// ─── Pseudo-random (seeded) ───────────────────────────────────────────────────
function seededRand(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Terrain ──────────────────────────────────────────────────────────────────
class Terrain {
  // width in meters, seed for reproducibility
  constructor(bodyId, width, seed) {
    const cfg = BODY_DATA[bodyId];
    this.cfg = cfg;
    this.bodyId = bodyId;
    this.width = width;
    this.step = 4;   // sample every 4 meters
    const rng = seededRand(seed || 12345);
    this.points = [];  // y heights in meters
    this.padCenter = 0;
    this.padWidth = cfg.padWidth;
    this._generate(cfg, rng);
  }

  _generate(cfg, rng) {
    const n = Math.floor(this.width / this.step) + 2;
    const R = cfg.terrainRoughness;
    const w = this.width;

    for (let i = 0; i < n; i++) {
      const x = i * this.step;
      let h = 28;
      h += Math.sin(x * 0.018) * 22 * R;
      h += Math.sin(x * 0.040 + 1.5) * 13 * R;
      h += Math.sin(x * 0.080 + 3.0) * 7 * R;
      h += Math.sin(x * 0.150 + 0.7) * 4 * R;
      h += (rng() - 0.5) * 18 * R;
      this.points.push(Math.max(14, h));
    }

    // Landing pad — centered around 40–65% of width
    const padCx = w * (0.40 + rng() * 0.25);
    const pIdx = Math.round(padCx / this.step);
    const pHalf = Math.ceil(this.padWidth / 2 / this.step);
    const padH = this.points[Math.min(pIdx, this.points.length - 1)];
    this.padCenter = padCx;
    this.padHeight = padH;
    for (let i = pIdx - pHalf; i <= pIdx + pHalf + 1; i++) {
      if (i >= 0 && i < this.points.length) this.points[i] = padH;
    }

    this.maxH = Math.max(...this.points);
    this.minH = Math.min(...this.points);
  }

  heightAt(x) {
    const fi = x / this.step;
    const i = Math.max(0, Math.min(Math.floor(fi), this.points.length - 2));
    const t = fi - i;
    return this.points[i] * (1 - t) + this.points[i + 1] * t;
  }

  draw(ctx, camX, camY, scale, canvasW, canvasH) {
    const cfg = this.cfg;
    const pts = this.points;
    const s = scale;
    const W = canvasW, H = canvasH;

    const toSX = wx => (wx - camX) * s + W / 2;
    const toSY = wy => H / 2 - (wy - camY) * s;

    // Terrain fill
    ctx.beginPath();
    ctx.moveTo(toSX(0), toSY(pts[0]));
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(toSX(i * this.step), toSY(pts[i]));
i    }
    ctx.lineTo(toSX(this.width), H + 10);
    ctx.lineTo(toSX(0), H + 10);
    ctx.closePath();
    const gradY0 = toSY(this.maxH);
    const gradY1 = Math.max(gradY0 + 2, H); // évite gradient de hauteur nulle (Safari)
    const grad = ctx.createLinearGradient(0, gradY0, 0, gradY1);
    grad.addColorStop(0, cfg.groundColor);
    grad.addColorStop(0.4, cfg.groundAccent);
    grad.addColorStop(1, cfg.groundDark);
    ctx.fillStyle = grad;
    ctx.fill();

    // Terrain top line
    ctx.strokeStyle = lighten(cfg.groundColor, 30);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toSX(0), toSY(pts[0]));
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(toSX(i * this.step), toSY(pts[i]));
    }
    ctx.stroke();

    // Landing pad highlight
    const padL = this.padCenter - this.padWidth / 2;
    const padR = this.padCenter + this.padWidth / 2;
    const padY = this.padHeight;
    const sxL = toSX(padL), sxR = toSX(padR), syP = toSY(padY);

    // Pad base
    ctx.fillStyle = 'rgba(0,200,100,0.15)';
    ctx.fillRect(sxL, syP - 3, sxR - sxL, 4);

    // Pad line
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sxL, syP);
    ctx.lineTo(sxR, syP);
    ctx.stroke();

    // Pad lights
    const blink = Math.sin(Date.now() * 0.006) > 0;
    ctx.fillStyle = blink ? '#00ff00' : '#004400';
    const lightR = 4;
    ctx.beginPath(); ctx.arc(sxL, syP, lightR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sxR, syP, lightR, 0, Math.PI * 2); ctx.fill();

    // Pad text
    ctx.fillStyle = 'rgba(0,255,136,0.7)';
    ctx.font = '11px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LANDING ZONE', (sxL + sxR) / 2, syP - 8);

    // Surface decorations
    this._drawDecorations(ctx, camX, camY, scale, canvasW, canvasH);

    // Atmospheric fog overlay
    if (cfg.hasFog) {
      const haze = ctx.createLinearGradient(0, 0, 0, H * 0.4);
      haze.addColorStop(0, cfg.fogColor.replace(/[\d.]+\)$/, '0.7)'));
      haze.addColorStop(1, cfg.fogColor.replace(/[\d.]+\)$/, '0)'));
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, W, H * 0.4);
    }
  }

  _drawDecorations(ctx, camX, camY, scale, W, H) {
    const toSX = wx => (wx - camX) * scale + W / 2;
    const toSY = wy => H / 2 - (wy - camY) * scale;
    const rng = seededRand(987654);

    if (this.bodyId === 'moon' || this.bodyId === 'mercury') {
      // Craters
      for (let i = 0; i < 30; i++) {
        const cx = rng() * this.width;
        const cy = this.heightAt(cx);
        const r = 3 + rng() * 12;
        const sx = toSX(cx), sy = toSY(cy);
        ctx.strokeStyle = 'rgba(50,50,50,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(sx, sy, r * scale, r * 0.3 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (this.bodyId === 'mars') {
      // Rocks
      for (let i = 0; i < 20; i++) {
        const rx = rng() * this.width;
        const ry = this.heightAt(rx);
        const sx = toSX(rx), sy = toSY(ry);
        const rs = (2 + rng() * 4) * scale;
        ctx.fillStyle = '#6a2808';
        ctx.beginPath();
        ctx.ellipse(sx, sy - rs * 0.5, rs, rs * 0.6, rng() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (this.bodyId === 'earth') {
      // Grass-like top
      ctx.strokeStyle = '#1a6a1a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 80; i++) {
        const gx = rng() * this.width;
        const gy = this.heightAt(gx);
        const sx = toSX(gx), sy = toSY(gy);
        const h2 = (2 + rng() * 3) * scale;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (rng() - 0.5) * 3 * scale, sy - h2);
        ctx.stroke();
      }
    }
  }
}

// ─── Particles ────────────────────────────────────────────────────────────────
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emitThrust(wx, wy, angle, intense) {
    const count = intense ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.8;
      const speed = 8 + Math.random() * 15;
      const rad = (angle + 180) * Math.PI / 180 + spread;
      this.particles.push({
        x: wx, y: wy,
        vx: Math.sin(rad) * speed,
        vy: Math.cos(rad) * speed,
        life: 1, maxLife: 0.3 + Math.random() * 0.3,
        size: 1.5 + Math.random() * 2,
        type: 'thrust',
        hue: 30 + Math.random() * 30,
      });
    }
  }

  emitRetro(wx, wy, vx, vy) {
    for (let i = 0; i < 4; i++) {
      const spd = Math.sqrt(vx * vx + vy * vy);
      const nx = spd > 0.1 ? vx / spd : 0;
      const ny = spd > 0.1 ? vy / spd : 0;
      const sp = 5 + Math.random() * 10;
      this.particles.push({
        x: wx + (Math.random() - 0.5) * 3,
        y: wy + (Math.random() - 0.5) * 3,
        vx: nx * sp + (Math.random() - 0.5) * 4,
        vy: ny * sp + (Math.random() - 0.5) * 4,
        life: 1, maxLife: 0.2 + Math.random() * 0.2,
        size: 1.5, type: 'retro', hue: 180,
      });
    }
  }

  emitExplosion(wx, wy) {
    // Explosion particles (doubled to 160)
    for (let i = 0; i < 160; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 35;
      this.particles.push({
        x: wx, y: wy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6,
        life: 1, maxLife: 1.0 + Math.random() * 1.0,
        size: 2 + Math.random() * 5,
        type: 'explosion',
        hue: Math.random() < 0.5 ? 20 + Math.random() * 20 : 40 + Math.random() * 20,
      });
    }
    // Debris
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 10 + Math.random() * 20;
      this.particles.push({
        x: wx, y: wy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1, maxLife: 1.0 + Math.random() * 0.5,
        size: 1 + Math.random() * 2,
        type: 'debris', hue: 0,
      });
    }
    // Smoke particles
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: wx + (Math.random() - 0.5) * 6,
        y: wy + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 3,
        vy: 1 + Math.random() * 3,  // positive = world up
        life: 1, maxLife: 2.0 + Math.random() * 2.0,
        size: 3 + Math.random() * 5,
        type: 'smoke', hue: 0,
      });
    }
  }

  emitSmoke(wx, wy) {
    // Ongoing crash smoke
    if (Math.random() < 0.4) {
      this.particles.push({
        x: wx + (Math.random() - 0.5) * 8,
        y: wy + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 2,
        vy: 0.5 + Math.random() * 2,
        life: 1, maxLife: 1.5 + Math.random() * 1.5,
        size: 2 + Math.random() * 4,
        type: 'smoke', hue: 0,
      });
    }
  }

  emitDust(wx, wy, windX) {
    if (Math.random() < 0.4) {
      this.particles.push({
        x: wx + (Math.random() - 0.5) * 40,
        y: wy + Math.random() * 5,
        vx: windX * 0.3 + (Math.random() - 0.5) * 2,
        vy: 0.5 + Math.random() * 1.5,
        life: 1, maxLife: 1.5 + Math.random() * 1,
        size: 1.5 + Math.random() * 3,
        type: 'dust', hue: 20,
      });
    }
  }

  update(dt, gravity) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt / p.maxLife;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'smoke') {
        // smoke rises (vy positive = world up), slight deceleration
        p.vy = Math.max(0, p.vy - 0.3 * dt);
        p.vx *= (1 - 0.5 * dt);
      } else {
        p.vy -= gravity * dt * 0.3;  // slight gravity on particles
      }
      if (p.type === 'thrust' || p.type === 'retro') {
        p.vx *= (1 - 2 * dt);
        p.vy *= (1 - 2 * dt);
      }
      if (p.type === 'dust') { p.vy = Math.max(p.vy, 0.2); }
    }
  }

  draw(ctx, camX, camY, scale, W, H) {
    const toSX = wx => (wx - camX) * scale + W / 2;
    const toSY = wy => H / 2 - (wy - camY) * scale;

    for (const p of this.particles) {
      const alpha = p.life;
      const sx = toSX(p.x), sy = toSY(p.y);
      if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;

      if (p.type === 'smoke') {
        ctx.globalAlpha = Math.max(0, alpha * 0.6);
        ctx.fillStyle = `rgba(80,80,80,1)`;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1, p.size * scale * 0.15 * (2 - p.life)), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = Math.max(0, alpha);
        if (p.type === 'thrust') {
          ctx.fillStyle = `hsl(${p.hue},100%,${40 + 40 * p.life}%)`;
        } else if (p.type === 'retro') {
          ctx.fillStyle = `hsl(180,80%,${50 + 30 * p.life}%)`;
        } else if (p.type === 'explosion') {
          ctx.fillStyle = `hsl(${p.hue},100%,${30 + 50 * p.life}%)`;
        } else if (p.type === 'debris') {
          ctx.fillStyle = `hsl(30,40%,${40 * p.life}%)`;
        } else if (p.type === 'dust') {
          ctx.fillStyle = `hsl(25,60%,${40 + 20 * p.life}%)`;
        }
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.5, p.size * scale * 0.1 * p.life), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ─── Wind System ──────────────────────────────────────────────────────────────
class WindSystem {
  constructor(bodyId) {
    this.cfg = BODY_DATA[bodyId];
    this.t = 0;
    this.current = 0;  // current wind acceleration in m/s²
    this.gustTimer = 0;
    this.gustActive = false;
    this.gustStrength = 0;
    this.stormState = 0; // 0=idle, 1=warning, 2=active
    this.stormTimer = 0;
    this.stormStrength = 0;
    this.direction = 1;  // +1 or -1
  }

  update(dt) {
    const cfg = this.cfg;
    this.t += dt;

    if (cfg.windType === 'none') { this.current = 0; return; }

    let wind = 0;

    if (cfg.windType === 'gusty') {
      // Sine base + random gusts
      wind = Math.sin(this.t * 0.4) * cfg.windBase * 0.5;
      if (!this.gustActive) {
        if (Math.random() < cfg.windGustChance * dt * 60) {
          this.gustActive = true;
          this.gustTimer = 0.8 + Math.random() * 2;
          this.gustStrength = (cfg.windBase + Math.random() * cfg.windAmp) * (Math.random() < 0.5 ? 1 : -1);
        }
      } else {
        wind += this.gustStrength;
        this.gustTimer -= dt;
        if (this.gustTimer <= 0) this.gustActive = false;
      }
      // Dust storm
      if (cfg.hasDustStorm) {
        if (this.stormState === 0) {
          if (Math.random() < cfg.dustStormChance * dt * 60) {
            this.stormState = 1;
            this.stormTimer = 2.5; // warning duration
          }
        } else if (this.stormState === 1) {
          this.stormTimer -= dt;
          if (this.stormTimer <= 0) {
            this.stormState = 2;
            this.stormTimer = 4 + Math.random() * 5;
            this.stormStrength = (cfg.windAmp + Math.random() * 10) * (Math.random() < 0.5 ? 1 : -1);
          }
        } else if (this.stormState === 2) {
          wind += this.stormStrength;
          this.stormTimer -= dt;
          if (this.stormTimer <= 0) this.stormState = 0;
        }
      }
    } else if (cfg.windType === 'shear') {
      // Low-frequency oscillation (Titan)
      wind = Math.sin(this.t * 0.18) * cfg.windBase;
      wind += Math.sin(this.t * 0.43 + 1.2) * cfg.windAmp * 0.4;
      wind += (Math.random() - 0.5) * cfg.windBase * 0.3;
    } else if (cfg.windType === 'turbulent') {
      // Earth turbulence
      wind = Math.sin(this.t * 0.35) * cfg.windBase;
      wind += Math.sin(this.t * 1.1 + 0.8) * cfg.windAmp * 0.3;
      wind += Math.sin(this.t * 2.7 + 2.1) * cfg.windAmp * 0.15;
      wind += (Math.random() - 0.5) * cfg.windBase * 0.5;
    } else if (cfg.windType === 'hurricane') {
      // Venus — constant strong push + chaos
      wind = cfg.windBase * 1.5 * this.direction;
      wind += Math.sin(this.t * 0.6) * cfg.windAmp * 0.6;
      wind += Math.sin(this.t * 1.8) * cfg.windAmp * 0.3;
      wind += (Math.random() - 0.5) * cfg.windAmp * 0.4;
      // Occasional direction flip
      if (Math.random() < 0.0002 * dt * 60) this.direction *= -1;
    }

    // Apply drag model: wind force = wind_acc (direct m/s² perturbation)
    this.current = wind;
  }

  getForce() { return this.current; }
  isStorming() { return this.stormState === 2; }
  isWarning() { return this.stormState === 1; }
  getDisplaySpeed() {
    // Convert back to approximate m/s for display
    return Math.abs(this.current) * 2.5;
  }
}

// ─── Hazard System ────────────────────────────────────────────────────────────
class HazardSystem {
  constructor(bodyId) {
    this.bodyId = bodyId;
    this._t = 0;
    this._state = 0; // 0: idle, 1: warning, 2: active
    this._timer = 0;
    this._engineCutout = false;
    this._rotationMult = 1;
    this._fuelDrainMult = 1;
    this._vertForce = 0;
    this._impulse = null;
    this._warning = null;
  }

  update(dt) {
    this._t += dt;
    this._impulse = null;
    switch (this.bodyId) {
      case 'moon': this._updateMeteor(dt); break;
      case 'mercury': this._updateFlare(dt); break;
      case 'mars': this._updateMagnetic(dt); break;
      case 'titan': this._updateDownburst(dt); break;
      case 'earth': this._updateLightning(dt); break;
      case 'venus': this._updateAcidRain(dt); break;
    }
  }

  _updateMeteor(dt) {
    if (this._state === 0) {
      if (Math.random() < 0.0005 * dt * 60) {
        this._state = 1;
        this._timer = 2.5;
        this._warning = '☄ IMPACT MÉTÉORITE IMMINENT !';
      }
    } else if (this._state === 1) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 2;
        this._timer = 0.12;
        const mag = 7 + Math.random() * 10;
        const sign = Math.random() < 0.5 ? 1 : -1;
        this._impulse = { vx: mag * sign, vy: 2 + Math.random() * 4 };
        this._warning = '☄ IMPACT MÉTÉORITE !';
      }
    } else if (this._state === 2) {
      this._timer -= dt;
      if (this._timer <= 0) { this._state = 0; this._warning = null; }
    }
  }

  _updateFlare(dt) {
    if (this._state === 0) {
      if (Math.random() < 0.0003 * dt * 60) {
        this._state = 1;
        this._timer = 2.5;
        this._warning = '☀ ÉRUPTION SOLAIRE IMMINENTE !';
      }
    } else if (this._state === 1) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 2;
        this._timer = 1.5 + Math.random();
        this._engineCutout = true;
        this._warning = '☀ ÉRUPTION SOLAIRE — Moteur hors ligne !';
      }
    } else if (this._state === 2) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 0;
        this._engineCutout = false;
        this._warning = null;
      }
    }
  }

  _updateMagnetic(dt) {
    if (this._state === 0) {
      if (Math.random() < 0.0003 * dt * 60) {
        this._state = 1;
        this._timer = 2.5;
        this._warning = '🧲 ORAGE MAGNÉTIQUE IMMINENT !';
      }
    } else if (this._state === 1) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 2;
        this._timer = 2 + Math.random() * 2;
        this._rotationMult = -1;
        this._warning = '🧲 ORAGE MAGNÉTIQUE — Gyroscope inversé !';
      }
    } else if (this._state === 2) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 0;
        this._rotationMult = 1;
        this._warning = null;
      }
    }
  }

  _updateDownburst(dt) {
    if (this._state === 0) {
      if (Math.random() < 0.0007 * dt * 60) {
        this._state = 1;
        this._timer = 2.5;
        this._warning = '⬇ RAFALE VERTICALE IMMINENTE !';
      }
    } else if (this._state === 1) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 2;
        this._timer = 1 + Math.random() * 1.5;
        this._vertForce = -(16 + Math.random() * 12);
        this._warning = '⬇ RAFALE VERTICALE !';
      }
    } else if (this._state === 2) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 0;
        this._vertForce = 0;
        this._warning = null;
      }
    }
  }

  _updateLightning(dt) {
    if (this._state === 0) {
      if (Math.random() < 0.0005 * dt * 60) {
        this._state = 1;
        this._timer = 2.0;
        this._warning = '⚡ FOUDRE IMMINENTE !';
      }
    } else if (this._state === 1) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 2;
        this._timer = 0.08;
        const mag = 12 + Math.random() * 14;
        const sign = Math.random() < 0.5 ? 1 : -1;
        this._impulse = { vx: mag * sign, vy: 3 + Math.random() * 5 };
        this._warning = '⚡ FOUDRE !';
      }
    } else if (this._state === 2) {
      this._timer -= dt;
      if (this._timer <= 0) { this._state = 0; this._warning = null; }
    }
  }

  _updateAcidRain(_dt) {
    const period = 12;
    const onFraction = 0.45;
    const phase = (this._t % period) / period;

    if (phase > 0.8) {
      this._state = 1;
      this._fuelDrainMult = 1;
      this._warning = '☠ PLUIE ACIDE IMMINENTE !';
    } else if (phase < onFraction) {
      this._state = 2;
      this._fuelDrainMult = 2.5;
      this._warning = '☠ PLUIE ACIDE — Carburant corrodé !';
    } else {
      this._state = 0;
      this._fuelDrainMult = 1;
      this._warning = null;
    }
  }

  get engineCutout() { return this._engineCutout; }
  get rotationMult() { return this._rotationMult; }
  get fuelDrainMult() { return this._fuelDrainMult; }
  get vertForce() { return this._vertForce; }
  get warning() { return this._warning; }
  get isActive() { return this._state === 2; }
  get isWarning() { return this._state === 1; }
  consumeImpulse() { const i = this._impulse; this._impulse = null; return i; }
}

// ─── Lander ───────────────────────────────────────────────────────────────────
class Lander {
  constructor(bodyId, terrain) {
    const cfg = BODY_DATA[bodyId];
    this.bodyId = bodyId;
    this.cfg = cfg;
    // Start above center of terrain
    this.x = terrain.padCenter + (Math.random() - 0.5) * terrain.width * 0.5;
    this.x = Math.max(20, Math.min(terrain.width - 20, this.x));
    this.y = terrain.maxH + cfg.startAlt;
    // Feature 3: angle + drift de départ aléatoire par difficulté
    this.vx = (Math.random() - 0.5) * cfg.stars * 1.2;
    this.vy = -7 - Math.random() * 4;        // falling
    this.angle = (Math.random() - 0.5) * cfg.stars * 8;
    this.fuel = cfg.startFuel;
    this.alive = true;
    this.landed = false;
    this.crashed = false;
    // Physics dims
    this.hw = 2.5; // half-width in meters
    this.hh = 4.5; // half-height
    // Feature 8: rotation inertia
    this.rotVel = 0;
  }

  update(dt, input, windForce, hazard) {
    if (!this.alive) return;

    const cfg = this.cfg;
    const rotMult = hazard ? hazard.rotationMult : 1;
    const fuelMult = hazard ? hazard.fuelDrainMult : 1;
    const engineOff = hazard ? hazard.engineCutout : false;
    const extraVert = hazard ? hazard.vertForce : 0;

    // --- Rotation with inertia (Feature 8) ---
    const rotAcc = 280; // deg/s²
    if (input.left) this.rotVel -= rotAcc * dt * rotMult;
    if (input.right) this.rotVel += rotAcc * dt * rotMult;
    this.rotVel *= Math.pow(0.08, dt); // forte friction — s'arrête vite mais pas instantané
    this.angle += this.rotVel * dt;
    this.angle = Math.max(-85, Math.min(85, this.angle));

    // angle=0 → nez vers le haut. La poussée va dans le sens du nez.
    const rad = this.angle * Math.PI / 180;
    let fx = windForce;
    let fy = -cfg.gravity + extraVert;

    // --- Main engine (up) ---
    if (input.up && this.fuel > 0 && !engineOff) {
      const thrust = cfg.gravity * 3.2;
      fx += thrust * Math.sin(rad);   // incliné à droite → pousse à droite
      fy += thrust * Math.cos(rad);
      this.fuel -= dt * 14 * fuelMult;
      if (this.fuel < 0) this.fuel = 0;
    }

    // --- Retro thrusters (space) ---
    if (input.space && this.fuel > 0 && !engineOff) {
      const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (spd > 0.1) {
        const retroForce = cfg.gravity * 2.2;
        fx -= (this.vx / spd) * retroForce;
        fy -= (this.vy / spd) * retroForce;
      }
      this.fuel -= dt * 9 * fuelMult;
      if (this.fuel < 0) this.fuel = 0;
    }

    // --- Feature 7: hover fuel drain ---
    if (this.alive && this.fuel > 0 && !input.up && !input.space && !engineOff) {
      this.fuel -= dt * 0.8 * fuelMult;
      if (this.fuel < 0) this.fuel = 0;
    }

    // --- Atmospheric drag (quadratic) ---
    if (cfg.drag > 0) {
      const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (spd > 0.01) {
        const dragMag = cfg.drag * spd * spd;
        fx -= (this.vx / spd) * dragMag;
        fy -= (this.vy / spd) * dragMag;
      }
    }

    // --- Integrate ---
    this.vx += fx * dt;
    this.vy += fy * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Boundary wrap (horizontal)
    if (this.x < 0) this.x = 0, this.vx = Math.abs(this.vx) * 0.3;
    // Don't let the lander leave the top
    // (nothing to check; it just floats)
  }

  checkCollision(terrain) {
    const bottomY = this.y - this.hh;
    const th = terrain.heightAt(this.x);
    if (bottomY > th + 0.5) return null; // still in air

    // Capture impact velocities BEFORE stopping
    const impactVY = this.vy;
    const impactVX = this.vx;

    // Stop lander on ground
    this.y = th + this.hh;
    this.vy = 0;
    this.vx = 0;

    const cfg = this.cfg;
    const vDown = -impactVY;           // positive = descending
    const hSpeed = Math.abs(impactVX);
    const tilt = Math.abs(this.angle);
    const onPad = Math.abs(this.x - terrain.padCenter) <= terrain.padWidth / 2;

    if (!onPad) return { type: 'crash', reason: 'Hors de la zone d\'atterrissage !' };
    if (vDown > cfg.maxVSpeed) return { type: 'crash', reason: `Vitesse verticale trop élevée : ${vDown.toFixed(1)} m/s (max ${cfg.maxVSpeed})` };
    if (hSpeed > cfg.maxHSpeed) return { type: 'crash', reason: `Vitesse horizontale trop élevée : ${hSpeed.toFixed(1)} m/s (max ${cfg.maxHSpeed})` };
    if (tilt > cfg.maxAngle) return { type: 'crash', reason: `Inclinaison trop forte : ${tilt.toFixed(1)}° (max ${cfg.maxAngle}°)` };
    return { type: 'land' };
  }

  // Bottom-center of lander (nozzle position) for particles
  get nozzleX() { return this.x + Math.sin(this.angle * Math.PI / 180) * this.hh; }
  get nozzleY() { return this.y - this.hh + 0.5; }

  draw(ctx, camX, camY, scale, W, H, input) {
    if (!this.alive && !this.crashed && !this.landed) return;
    const toSX = wx => (wx - camX) * scale + W / 2;
    const toSY = wy => H / 2 - (wy - camY) * scale;

    const sx = toSX(this.x);
    const sy = toSY(this.y);
    const rad = this.angle * Math.PI / 180;
    const pw = this.hw * 2 * scale;  // pixel width
    const ph = this.hh * 2 * scale;  // pixel height

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rad);

    // Legs
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = Math.max(1, scale * 0.5);
    const legW = pw * 0.55, legH = ph * 0.35;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.4, ph * 0.1);
    ctx.lineTo(-legW / 2, ph * 0.5);
    ctx.moveTo(pw * 0.4, ph * 0.1);
    ctx.lineTo(legW / 2, ph * 0.5);
    ctx.stroke();
    // Foot pads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = Math.max(1.5, scale * 0.6);
    ctx.beginPath();
    ctx.moveTo(-legW / 2 - 3, ph * 0.5);
    ctx.lineTo(-legW / 2 + 3, ph * 0.5);
    ctx.moveTo(legW / 2 - 3, ph * 0.5);
    ctx.lineTo(legW / 2 + 3, ph * 0.5);
    ctx.stroke();

    // Engine bell
    ctx.fillStyle = '#777';
    ctx.beginPath();
    ctx.moveTo(-pw * 0.35, ph * 0.1);
    ctx.lineTo(pw * 0.35, ph * 0.1);
    ctx.lineTo(pw * 0.25, ph * 0.45);
    ctx.lineTo(-pw * 0.25, ph * 0.45);
    ctx.closePath();
    ctx.fill();

    // Body
    const bodyGrad = ctx.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2);
    bodyGrad.addColorStop(0, '#dde');
    bodyGrad.addColorStop(0.5, '#bbc');
    bodyGrad.addColorStop(1, '#88a');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-pw / 2, -ph / 2, pw, ph * 0.65, 4);
    ctx.fill();
    ctx.strokeStyle = '#aab';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Window
    ctx.fillStyle = '#0af';
    ctx.beginPath();
    ctx.arc(0, -ph * 0.15, pw * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,240,255,0.7)';
    ctx.beginPath();
    ctx.arc(-pw * 0.06, -ph * 0.18, pw * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // Thrust flame (main)
    if (input && input.up && this.fuel > 0) {
      const fl = ph * (0.4 + Math.random() * 0.25);
      const fw = pw * (0.2 + Math.random() * 0.1);
      const flameGrad = ctx.createLinearGradient(0, ph * 0.45, 0, ph * 0.45 + fl);
      flameGrad.addColorStop(0, 'rgba(255,240,100,0.95)');
      flameGrad.addColorStop(0.3, 'rgba(255,140,20,0.85)');
      flameGrad.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-fw, ph * 0.42);
      ctx.lineTo(fw, ph * 0.42);
      ctx.quadraticCurveTo(fw * 0.5, ph * 0.45 + fl * 0.6, 0, ph * 0.45 + fl);
      ctx.quadraticCurveTo(-fw * 0.5, ph * 0.45 + fl * 0.6, -fw, ph * 0.42);
      ctx.fill();
    }

    // Retro flame indicator
    if (input && input.space && this.fuel > 0) {
      ctx.strokeStyle = 'rgba(0,200,255,0.8)';
      ctx.lineWidth = 2;
      const rx = pw * 0.6;
      ctx.beginPath();
      ctx.moveTo(-rx, 0); ctx.lineTo(-rx - pw * 0.3, 0);
      ctx.moveTo(rx, 0); ctx.lineTo(rx + pw * 0.3, 0);
      ctx.stroke();
    }

    // Warning glow when low fuel
    if (this.fuel < 150) {
      const pulse = 0.4 + 0.3 * Math.sin(Date.now() * 0.008);
      ctx.strokeStyle = `rgba(255,80,0,${pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-pw / 2 - 2, -ph / 2 - 2, pw + 4, ph * 0.65 + 4, 6);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ─── Stars background (for landing scene) ────────────────────────────────────
function genLandingStars(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({ x: Math.random(), y: Math.random(), b: 0.2 + Math.random() * 0.8, s: Math.random() < 0.9 ? 1 : 1.5 });
  }
  return arr;
}

// ─── Clouds (Earth) ──────────────────────────────────────────────────────────
function genClouds() {
  const clouds = [];
  for (let i = 0; i < 8; i++) {
    clouds.push({ x: Math.random(), y: 0.1 + Math.random() * 0.35, w: 0.08 + Math.random() * 0.1, speed: 0.005 + Math.random() * 0.01 });
  }
  return clouds;
}

// ─── Feature 9: Meteor System ────────────────────────────────────────────────
class MeteorSystem {
  constructor() { this.meteors = []; this._t = 0; }
  update(dt, W, H) {
    this._t += dt;
    if (Math.random() < 0.003 * dt * 60) {
      const fromLeft = Math.random() < 0.5;
      this.meteors.push({
        x: fromLeft ? -20 : W + 20,
        y: Math.random() * H * 0.5,
        vx: (fromLeft ? 1 : -1) * (200 + Math.random() * 300),
        vy: 80 + Math.random() * 150,
        len: 30 + Math.random() * 60,
        alpha: 0.7 + Math.random() * 0.3,
        life: 1,
      });
    }
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.x < -100 || m.x > W + 100 || m.y > H + 100) this.meteors.splice(i, 1);
    }
  }
  draw(ctx, W, H) {
    for (const m of this.meteors) {
      const angle = Math.atan2(m.vy, m.vx);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(angle);
      const g = ctx.createLinearGradient(-m.len, 0, 4, 0);
      g.addColorStop(0, `rgba(255,255,255,0)`);
      g.addColorStop(0.7, `rgba(200,220,255,${m.alpha * 0.5})`);
      g.addColorStop(1, `rgba(255,255,255,${m.alpha})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-m.len, 0); ctx.lineTo(4, 0); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${m.alpha})`;
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

// ─── LanderGame ───────────────────────────────────────────────────────────────
class LanderGame {
  constructor(bodyId, canvasW, canvasH) {
    this.bodyId = bodyId;
    this.cfg = BODY_DATA[bodyId];
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.SCALE = 4.5;  // pixels per meter

    // World
    const seed = Math.floor(Math.random() * 999999);
    this.terrain = new Terrain(bodyId, 600, seed);
    this.lander = new Lander(bodyId, this.terrain);
    this.particles = new ParticleSystem();
    this.wind = new WindSystem(bodyId);
    this.hazard = new HazardSystem(bodyId);

    // Camera: follows lander
    this.camX = this.lander.x;
    this.camY = this.lander.y;

    // Stars for backdrop
    this.stars = genLandingStars(this.cfg.showStars ? 250 : 60);
    this.clouds = this.cfg.hasClouds ? genClouds() : [];

    // Timer
    this.elapsed = 0;
    this.result = null;  // null | 'land' | 'crash'

    // Input snapshot (set externally)
    this.input = { up: false, left: false, right: false, space: false };

    // Post-explosion delay
    this.resultDelay = 0;

    // Lander trail
    this._trail = [];
    this._trailTimer = 0;

    // Feature 9: Meteor system
    this.meteors = new MeteorSystem();

    // Feature 11: canvas shake
    this._shakeAmt = 0;

    // Feature 13: ghost recording
    this._recording = [];
    this._recTimer = 0;
    this._ghost = null;
  }

  update(dt) {
    if (this.result) {
      this.resultDelay += dt;
      // Feature 12: ongoing crash smoke for 3 seconds
      if (this.result.type === 'crash' && this.resultDelay < 3) {
        this.particles.emitSmoke(this.lander.x, this.lander.y + this.lander.hh * 0.5);
      }
      this.particles.update(dt, this.cfg.gravity * 0.1);
      // Feature 11: decay shake
      this._shakeAmt *= Math.pow(0.05, dt);
      return;
    }

    this.elapsed += dt;

    // Wind
    this.wind.update(dt);
    const windF = this.wind.getForce();

    // Hazards
    this.hazard.update(dt);
    const impulse = this.hazard.consumeImpulse();
    if (impulse) {
      this.lander.vx += impulse.vx;
      this.lander.vy += impulse.vy;
    }

    // Feature 11: shake on hazard for titan/venus
    if (this.hazard.isActive && (this.bodyId === 'titan' || this.bodyId === 'venus')) {
      this._shakeAmt = Math.max(this._shakeAmt, 2);
    }
    this._shakeAmt *= Math.pow(0.05, dt);

    // Lander
    this.lander.update(dt, this.input, windF, this.hazard);

    // Particles
    if (this.input.up && this.lander.fuel > 0 && this.lander.alive) {
      this.particles.emitThrust(this.lander.nozzleX, this.lander.nozzleY, this.lander.angle, true);
    }
    if (this.input.space && this.lander.fuel > 0 && this.lander.alive) {
      this.particles.emitRetro(this.lander.x, this.lander.y, this.lander.vx, this.lander.vy);
    }
    if (this.wind.isStorming() && this.bodyId === 'mars') {
      this.particles.emitDust(this.lander.x, this.terrain.heightAt(this.lander.x), windF);
    }
    this.particles.update(dt, this.cfg.gravity * 0.1);

    // Lander trail
    const spd = Math.sqrt(this.lander.vx ** 2 + this.lander.vy ** 2);
    this._trailTimer += dt;
    if (spd > 4 && this._trailTimer > 0.04 && this.lander.alive) {
      this._trail.push({ x: this.lander.x, y: this.lander.y, age: 0, spd });
      this._trailTimer = 0;
    }
    for (let i = this._trail.length - 1; i >= 0; i--) {
      this._trail[i].age += dt;
      if (this._trail[i].age > 0.7) this._trail.splice(i, 1);
    }

    // Pad shrink for hard levels (3★+)
    if (this.cfg.stars >= 3 && !this.result) {
      const shrinkDur = 60; // seconds to reach minimum
      const minRatio = 0.45;
      const ratio = Math.max(minRatio, 1 - (this.elapsed / shrinkDur) * (1 - minRatio));
      this.terrain.padWidth = this.cfg.padWidth * ratio;
    }

    // Cloud drift
    for (const c of this.clouds) {
      c.x = (c.x + c.speed * dt) % 1;
    }

    // Feature 13: record ghost frames every ~0.05s
    if (this.lander.alive) {
      this._recTimer += dt;
      if (this._recTimer >= 0.05 && this._recording.length < 3000) {
        this._recording.push({ x: this.lander.x, y: this.lander.y, angle: this.lander.angle });
        this._recTimer = 0;
      }
    }

    // Collision
    const col = this.lander.checkCollision(this.terrain);
    if (col && col.type === 'crash') {
      this.lander.alive = false;
      this.lander.crashed = true;
      this.particles.emitExplosion(this.lander.x, this.lander.y);
      this.result = col;
      this.resultDelay = 0;
      // Feature 11: crash shake
      this._shakeAmt = 8;
    } else if (col && col.type === 'land') {
      this.lander.alive = false;
      this.lander.landed = true;
      this.result = col;
      this.resultDelay = 0;
    }

    // Camera: track lander, keep 35% from top
    const targetCamY = this.lander.y - (this.canvasH / this.SCALE) * 0.33;
    const targetCamX = this.lander.x;
    this.camX += (targetCamX - this.camX) * 5 * dt;
    this.camY += (targetCamY - this.camY) * 5 * dt;
  }

  draw(ctx) {
    const W = this.canvasW, H = this.canvasH;
    const S = this.SCALE;
    const cx = this.camX, cy = this.camY;
    const cfg = this.cfg;

    const toSX = wx => (wx - cx) * S + W / 2;
    const toSY = wy => H / 2 - (wy - cy) * S;

    // Feature 11: canvas shake
    const shaking = this._shakeAmt > 0.2;
    if (shaking) {
      ctx.save();
      ctx.translate(
        (Math.random() - 0.5) * this._shakeAmt,
        (Math.random() - 0.5) * this._shakeAmt
      );
    }

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, cfg.skyTop);
    sky.addColorStop(0.7, cfg.skyBot);
    sky.addColorStop(1, lighten(cfg.groundColor, -20));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars
    if (cfg.showStars || cfg.starAlpha > 0) {
      for (const s of this.stars) {
        ctx.fillStyle = `rgba(255,255,255,${s.b * cfg.starAlpha})`;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H * 0.7, s.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Feature 9: Meteors (decorative, after stars before terrain)
    this.meteors.update(1 / 60, W, H);
    this.meteors.draw(ctx, W, H);

    // Clouds (Earth)
    for (const c of this.clouds) {
      const cx2 = c.x * W;
      const cy2 = c.y * H;
      const cw = c.w * W;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(cx2 + k * cw * 0.3, cy2 + (k % 2) * 8, cw * (0.4 + k * 0.1), cw * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Terrain
    this.terrain.draw(ctx, cx, cy, S, W, H);

    // Particles (behind lander)
    this.particles.draw(ctx, cx, cy, S, W, H);

    // Lander trail
    for (const pt of this._trail) {
      const sx = (pt.x - cx) * S + W / 2;
      const sy = H / 2 - (pt.y - cy) * S;
      const a = Math.max(0, (1 - pt.age / 0.7) * 0.35);
      ctx.fillStyle = `rgba(150,200,255,${a.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.5, (1 - pt.age / 0.7) * 2), 0, Math.PI * 2);
      ctx.fill();
    }

    // Feature 10: lander shadow
    if (this.lander.alive || this.lander.landed) {
      const groundY = this.terrain.heightAt(this.lander.x);
      const altPx = (this.lander.y - this.lander.hh - groundY) * S;
      const shadowAlpha = Math.max(0, 0.4 - altPx / 300);
      if (shadowAlpha > 0.01) {
        const shadowScale = Math.max(0.3, 1 - altPx / 400);
        const gsx = (this.lander.x - cx) * S + W / 2;
        const gsy = H / 2 - (groundY - cy) * S;
        ctx.save();
        ctx.globalAlpha = shadowAlpha;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.ellipse(gsx, gsy, this.lander.hw * 2 * S * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Lander
    this.lander.draw(ctx, cx, cy, S, W, H, this.input);

    if (this.result && this.result.type === 'land') {
      this._drawChicken(ctx, cx, cy, S, W, H);
    }

    // Feature 13: draw ghost
    if (this._ghost && this._ghost.length > 1) {
      const idx = Math.min(Math.floor(this.elapsed / 0.05), this._ghost.length - 1);
      const gf = this._ghost[idx];
      if (gf) {
        const gsx = (gf.x - cx) * S + W / 2;
        const gsy = H / 2 - (gf.y - cy) * S;
        const grad = gf.angle * Math.PI / 180;
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.translate(gsx, gsy);
        ctx.rotate(grad);
        ctx.strokeStyle = '#88aaff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, S * this.lander.hw, 0, Math.PI * 2);
        ctx.stroke();
        // direction line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -S * this.lander.hh);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Feature 12: crash flash more dramatic
    if (this.result && this.result.type === 'crash') {
      if (this.resultDelay < 0.05) {
        // Intense white flash
        ctx.fillStyle = `rgba(255,255,255,${0.9 - this.resultDelay * 18})`;
        ctx.fillRect(0, 0, W, H);
      } else if (this.resultDelay < 0.3) {
        // Orange flash
        ctx.fillStyle = `rgba(255,150,0,${0.5 - (this.resultDelay - 0.05) * 2})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // Hazard flash overlays
    if (this.hazard && this.hazard.isActive) {
      const hw = this.hazard.warning;
      if (hw && hw.startsWith('⚡')) {
        // Lightning — blanc intense
        ctx.fillStyle = `rgba(255,255,255,${0.18 + 0.12 * Math.sin(Date.now() * 0.04)})`;
        ctx.fillRect(0, 0, W, H);
      } else if (hw && hw.startsWith('☄')) {
        // Météorite — flash orange
        ctx.fillStyle = 'rgba(255,120,0,0.22)';
        ctx.fillRect(0, 0, W, H);
      } else if (hw && hw.startsWith('☀')) {
        // Éruption solaire — flash jaune
        ctx.fillStyle = `rgba(255,220,50,${0.1 + 0.06 * Math.sin(Date.now() * 0.02)})`;
        ctx.fillRect(0, 0, W, H);
      } else if (hw && hw.startsWith('☠')) {
        // Pluie d'acide — teinte verte
        ctx.fillStyle = `rgba(80,200,40,${0.07 + 0.03 * Math.sin(Date.now() * 0.008)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // Top center flashing warning text (Feature requested: red blinking warning before event)
    let pendingWarn = null;
    if (this.hazard && this.hazard.isWarning) pendingWarn = this.hazard.warning;
    else if (this.wind && this.wind.isWarning()) pendingWarn = '⚠ TEMPÊTE IMMINENTE !';

    if (pendingWarn && Math.floor(Date.now() / 200) % 2 === 0) {
      ctx.save();
      ctx.fillStyle = '#ff2222';
      ctx.shadowColor = '#ff2222';
      ctx.shadowBlur = 12;
      ctx.font = 'bold 22px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(pendingWarn, W / 2, 80);
      ctx.restore();
    }

    // HUD speed/tilt indicators
    this._drawSpeedIndicators(ctx, W, H);

    // Landing pad arrow (when off-screen)
    this._drawPadArrow(ctx, W, H, S, cx, cy);

    // Feature 11: end shake save
    if (shaking) ctx.restore();
  }

  _drawSpeedIndicators(ctx, W, H) {
    const l = this.lander;
    if (!l.alive && !l.crashed) return;
    const cfg = this.cfg;
    const vs = -l.vy;   // positive = descending
    const hs = Math.abs(l.vx);
    const ang = Math.abs(l.angle);

    // Color logic
    const vc = vs > cfg.maxVSpeed ? '#f44' : (vs > cfg.maxVSpeed * 0.6 ? '#fa0' : '#0f0');
    const hc = hs > cfg.maxHSpeed ? '#f44' : (hs > cfg.maxHSpeed * 0.6 ? '#fa0' : '#0f0');
    const ac = ang > cfg.maxAngle ? '#f44' : (ang > cfg.maxAngle * 0.6 ? '#fa0' : '#0f0');

    // Update DOM HUD
    const update = (id, val, color) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.className = 'hval ' + (color === '#f44' ? 'danger' : color === '#fa0' ? 'warn' : 'safe');
    };
    update('v-vs', vs.toFixed(1), vc);
    update('v-hs', hs.toFixed(1), hc);
    update('v-ang', ang.toFixed(1), ac);

    const alt = Math.max(0, l.y - this.terrain.heightAt(l.x) - l.hh).toFixed(0);
    const altEl = document.getElementById('v-alt');
    if (altEl) altEl.textContent = alt + ' m';

    const fuelEl = document.getElementById('v-fuel');
    const fuelBar = document.getElementById('fuel-bar');
    const fuelPct = Math.max(0, Math.min(100, (l.fuel / cfg.startFuel * 100)));
    if (fuelEl) fuelEl.textContent = fuelPct.toFixed(0) + '%';
    if (fuelBar) fuelBar.style.setProperty('--fuel-pct', fuelPct + '%');

    // Wind
    const windEl = document.getElementById('v-wind');
    const windRow = document.getElementById('wind-row');
    if (windEl && windRow) {
      windRow.style.display = cfg.windType !== 'none' ? '' : 'none';
      const ws = this.wind.getDisplaySpeed();
      const wdir = this.wind.current >= 0 ? '→' : '←';
      windEl.textContent = wdir + ' ' + ws.toFixed(1) + ' m/s';
    }

    const stormEl = document.getElementById('storm-warn');
    if (stormEl) {
      const hw = this.hazard.warning;
      const storming = this.wind.isStorming();
      if (hw) {
        stormEl.style.display = '';
        const wt = stormEl.querySelector('.warn-txt');
        if (wt) wt.textContent = hw;
      } else if (storming) {
        stormEl.style.display = '';
        const wt = stormEl.querySelector('.warn-txt');
        if (wt) wt.textContent = '⚠ TEMPÊTE';
      } else {
        stormEl.style.display = 'none';
      }
    }

    // Speed values for DOM
    const vsEl = document.getElementById('v-vs');
    const hsEl = document.getElementById('v-hs');
    const angEl = document.getElementById('v-ang');
    if (vsEl) vsEl.textContent = vs.toFixed(1);
    if (hsEl) hsEl.textContent = hs.toFixed(1);
    if (angEl) angEl.textContent = ang.toFixed(1);
  }

  _drawPadArrow(ctx, W, H, S, cx, cy) {
    const padSX = (this.terrain.padCenter - cx) * S + W / 2;
    const padSY = H / 2 - (this.terrain.padHeight - cy) * S;

    if (padSX >= 0 && padSX <= W && padSY >= 0 && padSY <= H) {
      // Pad is visible — hide arrow
      const el = document.getElementById('landing-arrow');
      if (el) el.classList.add('hidden');
      return;
    }

    // Pad is off-screen
    const el = document.getElementById('landing-arrow');
    if (el) el.classList.remove('hidden');

    // Draw directional arrow on canvas edge
    const dx = padSX - W / 2, dy = padSY - H / 2;
    const angle = Math.atan2(dy, dx);
    const margin = 30;
    const ax = W / 2 + Math.cos(angle) * (Math.min(W / 2, H / 2) - margin);
    const ay = H / 2 + Math.sin(angle) * (Math.min(W / 2, H / 2) - margin);

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,255,136,0.85)';
    ctx.beginPath();
    ctx.moveTo(15, 0); ctx.lineTo(-8, -8); ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    const dist = Math.round(Math.abs(this.lander.x - this.terrain.padCenter));
    ctx.fillStyle = 'rgba(0,255,136,0.7)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(dist + 'm', 0, 18);
    ctx.restore();
  }

  _drawChicken(ctx, cx, cy, S, W, H) {
    const l = this.lander;
    const t = Math.max(0, this.resultDelay - 0.5); // Start animation after 0.5s
    if (t === 0) return;

    const sx = (l.x - cx) * S + W / 2;
    // Base de la capsule est à peu près l.y - l.hh * 0.3
    const sy = H / 2 - (l.y - l.hh * 0.3 - cy) * S;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(l.angle * Math.PI / 180); // Tourne le coq en fonction du vaisseau
    
    // Sort d'abord à droite
    let cx_local = 0;
    let cy_local = 0;

    const pullOutDist = 5.0 * S; // Distance de sortie
    const walkSpeed = 3.0 * S; // Vitesse de marche

    if (t < 1.0) {
      // Phase 1 : Emerge de la porte
      cx_local = (t / 1.0) * pullOutDist;
      cy_local = 0;
    } else {
      // Phase 2 : Marche / sautille
      cx_local = pullOutDist + (t - 1.0) * walkSpeed;
      cy_local = -Math.abs(Math.sin((t - 1.0) * 8)) * 1.5 * S;
    }

    ctx.translate(cx_local, cy_local);
    // Annule la rotation du vaisseau pour que le poulet soit droit sur le sol
    ctx.rotate(-l.angle * Math.PI / 180);

    const chS = S * 1.5; // Taille de la poule (beaucoup plus grosse)

    // Ombre du poulet
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0.8 * chS, 1.2 * chS, 0.4 * chS, 0, 0, Math.PI * 2);
    ctx.fill();

    // Casque (Bulle) derrière la tête
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeStyle = 'rgba(200, 240, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -1.8 * chS, 1.5 * chS, 0, Math.PI * 2);
    ctx.fill();

    // Corps (Combinaison spatiale)
    ctx.fillStyle = '#fefefe';
    ctx.beginPath();
    ctx.ellipse(0, -0.6 * chS, 1.0 * chS, 1.2 * chS, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cccccc';
    ctx.stroke();

    // Rayures / boutons sur le torse
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(-0.4 * chS, -1.0 * chS, 0.8 * chS, 0.2 * chS);
    ctx.fillStyle = '#3388ff';
    ctx.beginPath();
    ctx.arc(0, -0.5 * chS, 0.2 * chS, 0, Math.PI * 2);
    ctx.fill();

    // Tête de la poule
    ctx.fillStyle = '#ffffff'; // Plumes blanches
    ctx.beginPath();
    ctx.arc(0, -1.8 * chS, 0.8 * chS, 0, Math.PI * 2);
    ctx.fill();

    // Crête rouge
    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.arc(-0.2 * chS, -2.5 * chS, 0.3 * chS, 0, Math.PI * 2);
    ctx.arc(0.2 * chS, -2.4 * chS, 0.2 * chS, 0, Math.PI * 2);
    ctx.fill();

    // Bec jaune
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(0.5 * chS, -1.9 * chS);
    ctx.lineTo(1.2 * chS, -1.75 * chS);
    ctx.lineTo(0.5 * chS, -1.6 * chS);
    ctx.fill();

    // Oeil
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0.4 * chS, -2.0 * chS, 0.15 * chS, 0, Math.PI * 2);
    ctx.fill();

    // Casque (Bulle) devant
    ctx.beginPath();
    ctx.arc(0, -1.8 * chS, 1.5 * chS, 0, Math.PI * 2);
    ctx.stroke();
    // Reflet casque
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -1.8 * chS, 1.3 * chS, Math.PI * 1.2, Math.PI * 1.6);
    ctx.stroke();

    // Pattes (bottes d'astronaute)
    const animRot = (t >= 1.0) ? Math.sin((t - 1.0) * 16) * 0.4 : 0;
    
    ctx.fillStyle = '#bbbbcc';
    // Patte gauche
    ctx.save();
    ctx.translate(-0.4 * chS, 0.6 * chS);
    if (t >= 1.0) ctx.rotate(animRot);
    ctx.fillRect(-0.2 * chS, 0, 0.4 * chS, 0.6 * chS);
    ctx.fillRect(-0.2 * chS, 0.4 * chS, 0.6 * chS, 0.3 * chS);
    ctx.restore();

    // Patte droite
    ctx.save();
    ctx.translate(0.4 * chS, 0.6 * chS);
    if (t >= 1.0) ctx.rotate(-animRot);
    ctx.fillRect(-0.2 * chS, 0, 0.4 * chS, 0.6 * chS);
    ctx.fillRect(-0.2 * chS, 0.4 * chS, 0.6 * chS, 0.3 * chS);
    ctx.restore();

    // Drapeau planté !
    if (t > 2.5) {
      // Interpolate pop up
      const dtF = Math.min(1, (t - 2.5) * 4);
      ctx.save();
      ctx.translate(1.5 * chS, 0.6 * chS);
      ctx.scale(dtF, dtF);
      // Mât
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(0, -3.5 * chS, 0.1 * chS, 3.5 * chS);
      // Drapeau
      ctx.fillStyle = '#ff2222';
      ctx.fillRect(0.1 * chS, -3.5 * chS, 1.5 * chS, 1.0 * chS);
      // Trou blanc au milieu
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0.85 * chS, -3.0 * chS, 0.3 * chS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  getScore() {
    const t = this.elapsed;
    const fuel = this.lander.fuel;
    const cfg = this.cfg;
    const base = 1000;
    const timeBonus = Math.max(0, 500 - Math.floor(t * 5));
    const fuelBonus = Math.floor(fuel * 0.3);
    // Feature 2: precision bonus
    const dist = Math.abs(this.lander.x - this.terrain.padCenter);
    const precisionBonus = Math.max(0, Math.floor(300 * (1 - dist / (cfg.padWidth / 2))));
    const total = base + timeBonus + fuelBonus + precisionBonus;
    const stars = total >= 1400 ? 3 : total >= 1000 ? 2 : 1;
    return { total, timeBonus, fuelBonus, precisionBonus, stars, time: t, fuel };
  }

  // Feature 13: ghost recording helpers
  getRecording() {
    // compress: keep 1 out of 3
    return this._recording.filter((_, i) => i % 3 === 0);
  }

  setGhost(frames) {
    this._ghost = frames;
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function lighten(hex, amount) {
  if (!hex || !hex.startsWith('#')) return hex;
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// roundRect polyfill for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    this.beginPath();
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
  };
}
