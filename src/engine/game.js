import { Terrain } from './terrain.js';
import { Lander } from './lander.js';
import { ParticleSystem } from './particles.js';
import { WindSystem } from './wind.js';
import { HazardSystem } from './hazards.js';
import { BODY_DATA } from '../data/bodies.js';
import { seededRand, lighten, colorAlpha } from '../utils.js';
import { t } from '../i18n/i18n.js';

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

    // Chicken victory animation
    this._chickenTimer = 0;
    this._chickenActive = false;

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

    // Wind particles (visual streaks in sky)
    this._windParticles = [];
    this._windParticleTimer = 0;

    // Weather visuals
    this._dustStormProgress = 0;

    // Missions secondaires
    this.missions = [];  // set from outside after construction
    this._usedRetro = false;
    this._hazardCount = 0;
    this._landVS = undefined;
    this._landAngle = undefined;
    this._lastHazardState = false;

    // Replay: full frame recording (position + angle + input every frame)
    this._replayFrames = [];
    this._replayTimer = 0;
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
      let mult = 1;
      if (this.lander.shipType === 'tank') mult = 0.3; // Tank résiste aux chocs
      else if (this.lander.shipType === 'alien') mult = 0.5; // Peu impacté
      this.lander.vx += impulse.vx * mult;
      this.lander.vy += impulse.vy * mult;
      if (this.bodyId === 'earth') this._shakeAmt = Math.max(this._shakeAmt, 6);
    }
    const torqueImpulse = this.hazard.consumeTorqueImpulse();
    if (torqueImpulse) {
      let torqueMult = 1;
      if (this.lander.shipType === 'tank') torqueMult = 0.45;
      else if (this.lander.shipType === 'alien') torqueMult = 0.65;
      this.lander.rotVel += torqueImpulse * torqueMult;
      this._shakeAmt = Math.max(this._shakeAmt, 6);
    }

    // Feature 11: shake on hazard for titan/venus
    if (this.hazard.isActive && (this.bodyId === 'titan' || this.bodyId === 'venus')) {
      this._shakeAmt = Math.max(this._shakeAmt, 2);
    }
    this._shakeAmt *= Math.pow(0.05, dt);

    // Lander
    this.lander.update(dt, this.input, windF, this.hazard, this.terrain);

    // Particles
    if (this.input.up && this.lander.fuel > 0 && this.lander.alive) {
      this.particles.emitThrust(this.lander.nozzleX, this.lander.nozzleY, this.lander.angle, true);
    }
    if (this.input.space && this.lander.fuel > 0 && this.lander.alive && this.cfg.drag > 0) {
      this.particles.emitRetro(this.lander.x, this.lander.y, this.lander.vx, this.lander.vy);
    }
    if (this.input.left && this.lander.alive) {
      this.particles.emitSideThrust(this.lander.x, this.lander.y, this.lander.angle, 'left');
    }
    if (this.input.right && this.lander.alive) {
      this.particles.emitSideThrust(this.lander.x, this.lander.y, this.lander.angle, 'right');
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

    // Mission tracking
    if (this.input.space && this.lander.fuel > 0 && this.cfg.drag > 0) this._usedRetro = true;
    const curHazard = this.hazard.isActive;
    if (curHazard && !this._lastHazardState) this._hazardCount++;
    this._lastHazardState = curHazard;

    // Replay frame recording (every 0.05s)
    this._replayTimer += dt;
    if (this._replayTimer >= 0.05 && this.lander.alive) {
      this._replayTimer = 0;
      this._replayFrames.push({
        x: this.lander.x, y: this.lander.y, angle: this.lander.angle,
        up: this.input.up, space: this.input.space,
      });
    }

    // Dust storm visual progress (Mars)
    if (this.bodyId === 'mars') {
      const target = this.wind.isStorming() ? 1 : this.wind.isWarning() ? 0.28 : 0;
      this._dustStormProgress += (target - this._dustStormProgress) * Math.min(1, 2.5 * dt);
    }

    // Wind particles
    if (this.cfg.windType !== 'none') {
      const windSpd = Math.abs(this.wind.current);
      this._windParticleTimer += dt;
      if (this._windParticleTimer > 0.08 && windSpd > 0.8) {
        this._windParticleTimer = 0;
        const side = this.wind.current > 0 ? -1 : 1; // spawn on windward edge
        this._windParticles.push({
          x: this.camX + side * (this.canvasW / this.SCALE) * 0.55,
          y: this.camY + (Math.random() * 2 - 0.6) * (this.canvasH / this.SCALE) * 0.35,
          vx: this.wind.current * 1.8,
          vy: (Math.random() - 0.5) * 1.5,
          life: 1,
          maxLife: 1.2 + Math.random() * 0.8,
          len: 4 + windSpd * 1.2,
        });
      }
      for (let i = this._windParticles.length - 1; i >= 0; i--) {
        const wp = this._windParticles[i];
        wp.life -= dt / wp.maxLife;
        wp.x += wp.vx * dt;
        wp.y += wp.vy * dt;
        if (wp.life <= 0) this._windParticles.splice(i, 1);
      }
    }

    // Feature 13: record ghost frames every ~0.05s
    if (this.lander.alive) {
      this._recTimer += dt;
      if (this._recTimer >= 0.05 && this._recording.length < 3000) {
        this._recTimer = 0;
        this._recording.push({ x: this.lander.x, y: this.lander.y, angle: this.lander.angle, up: this.input.up });
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
      this._landVS = col._impactVS || 0;
      this._landAngle = col._impactAngle || this.lander.angle;
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

    // Planet-specific background elements
    this._drawPlanetBackground(ctx, W, H);

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

    // Clouds (Earth) — améliorés avec état orageux
    for (const c of this.clouds) {
      const cx2 = c.x * W;
      const cy2 = c.y * H;
      const cw = c.w * W;
      const storm = this.hazard.isActive || this.hazard.isWarning;
      const base = storm ? 0.36 : 0.20;
      ctx.save();
      // Base layer
      ctx.fillStyle = storm ? `rgba(140,140,160,${base})` : `rgba(255,255,255,${base})`;
      ctx.beginPath();
      ctx.ellipse(cx2, cy2 + cw * 0.06, cw * 0.66, cw * 0.19, 0, 0, Math.PI * 2);
      ctx.fill();
      // Top puffs
      ctx.fillStyle = storm ? `rgba(170,170,185,${base * 0.7})` : `rgba(255,255,255,${base * 0.75})`;
      for (let k = 0; k < 4; k++) {
        const pR = cw * (k === 1 || k === 2 ? 0.22 : 0.15);
        ctx.beginPath();
        ctx.ellipse(cx2 + (k - 1.5) * cw * 0.26, cy2 - cw * 0.02, pR, pR * 0.80, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Dynamic weather effects (dust storm, rain)
    this._drawWeather(ctx, W, H);

    // Wind particles (drifting streaks in sky, behind terrain)
    this._drawWindParticles(ctx, cx, cy, S, W, H);

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
    else if (this.wind && this.wind.isWarning()) pendingWarn = t('hazard.storm_incoming');
    else if (this.input.space && this.cfg.drag === 0 && this.lander.alive && this.lander.fuel > 0) pendingWarn = t('hazard.no_retro_atmo');

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

    // Landing pad arrow (when off-screen)
    this._drawPadArrow(ctx, W, H, S, cx, cy);

    // Feature 11: end shake save
    if (shaking) ctx.restore();

    // Mini-map (drawn after shake so it stays stable)
    this._drawMiniMap(ctx, W, H);
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

  _drawPlanetBackground(ctx, W, H) {
    const id = this.bodyId;

    if (id === 'moon' || id === 'mercury') {
      // Large sun corona top-right
      const sunX = W * 0.82, sunY = H * 0.10;
      const r = id === 'mercury' ? 50 : 36;
      const sg = ctx.createRadialGradient(sunX, sunY, r * 0.15, sunX, sunY, r * 3.5);
      sg.addColorStop(0,    'rgba(255,255,220,1)');
      sg.addColorStop(0.12, 'rgba(255,240,160,0.75)');
      sg.addColorStop(0.4,  'rgba(255,200,60,0.22)');
      sg.addColorStop(1,    'rgba(255,150,0,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(sunX, sunY, r * 3.5, 0, Math.PI * 2); ctx.fill();
      // Disc
      ctx.fillStyle = 'rgba(255,255,200,1)';
      ctx.beginPath(); ctx.arc(sunX, sunY, r, 0, Math.PI * 2); ctx.fill();
    }

    if (id === 'mars') {
      const t = this.elapsed;
      // Phobos (faster inner moon)
      const phX = W * 0.18 + Math.cos(t * 0.35) * 10;
      const phY = H * 0.10 + Math.sin(t * 0.35) * 3;
      const phG = ctx.createRadialGradient(phX, phY, 0, phX, phY, 7);
      phG.addColorStop(0, 'rgba(200,175,155,0.9)');
      phG.addColorStop(1, 'rgba(200,175,155,0)');
      ctx.fillStyle = phG;
      ctx.beginPath(); ctx.arc(phX, phY, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(185,165,145,0.85)';
      ctx.beginPath(); ctx.arc(phX, phY, 4, 0, Math.PI * 2); ctx.fill();
      // Deimos (slower outer moon)
      const deX = W * 0.70 + Math.cos(t * 0.14 + 2.1) * 6;
      const deY = H * 0.07 + Math.sin(t * 0.14 + 2.1) * 2;
      ctx.fillStyle = 'rgba(185,178,165,0.6)';
      ctx.beginPath(); ctx.arc(deX, deY, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    if (id === 'titan') {
      // Saturn with rings visible through orange haze
      ctx.save();
      ctx.globalAlpha = 0.30;
      const sx = W * 0.13, sy = H * 0.12, sr = 36;
      // Rings behind planet
      ctx.strokeStyle = '#a07838'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.ellipse(sx, sy, sr * 2.4, sr * 0.4, 0, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#806020'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(sx, sy, sr * 2.9, sr * 0.5, 0, Math.PI, Math.PI * 2); ctx.stroke();
      // Planet body
      const satG = ctx.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, 0, sx, sy, sr);
      satG.addColorStop(0, '#e8c878'); satG.addColorStop(0.7, '#c09040'); satG.addColorStop(1, '#7a5010');
      ctx.fillStyle = satG;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      // Rings front
      ctx.strokeStyle = '#a07838'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.ellipse(sx, sy, sr * 2.4, sr * 0.4, 0, 0, Math.PI); ctx.stroke();
      ctx.strokeStyle = '#806020'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(sx, sy, sr * 2.9, sr * 0.5, 0, 0, Math.PI); ctx.stroke();
      ctx.restore();
    }

    if (id === 'earth') {
      // Rare background lightning bolts behind clouds
      const slot = Math.floor(this.elapsed * 1.8) % 13;
      if (slot < 2) {
        const lxFrac = ((Math.floor(this.elapsed * 1.8) * 7919 + 3) % 100) / 100;
        const lx = W * (0.18 + lxFrac * 0.64);
        ctx.save();
        ctx.globalAlpha = slot === 0 ? 0.22 : 0.09;
        ctx.strokeStyle = '#d0e8ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lx,      H * 0.04);
        ctx.lineTo(lx - 10, H * 0.16);
        ctx.lineTo(lx + 8,  H * 0.22);
        ctx.lineTo(lx - 6,  H * 0.34);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (id === 'io') {
      // Jupiter massive en arrière-plan
      ctx.save();
      ctx.globalAlpha = 0.45;
      const jx = W * 0.78, jy = H * 0.14, jr = 55;
      const jg = ctx.createRadialGradient(jx - jr * 0.3, jy - jr * 0.3, 0, jx, jy, jr);
      jg.addColorStop(0, '#f0c060'); jg.addColorStop(0.5, '#d08030'); jg.addColorStop(1, '#804010');
      ctx.fillStyle = jg;
      ctx.beginPath(); ctx.arc(jx, jy, jr, 0, Math.PI * 2); ctx.fill();
      // Bandes de Jupiter
      for (let b = 0; b < 5; b++) {
        const by = jy - jr * 0.6 + b * jr * 0.3;
        ctx.strokeStyle = b % 2 === 0 ? 'rgba(200,120,40,0.5)' : 'rgba(240,200,100,0.3)';
        ctx.lineWidth = jr * 0.12;
        ctx.beginPath(); ctx.ellipse(jx, by, jr * 0.98, jr * 0.08, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    if (id === 'europa') {
      // Jupiter en fond + crackelures de glace dans le ciel
      ctx.save();
      ctx.globalAlpha = 0.30;
      const jx2 = W * 0.15, jy2 = H * 0.12, jr2 = 48;
      const jg2 = ctx.createRadialGradient(jx2, jy2, 0, jx2, jy2, jr2);
      jg2.addColorStop(0, '#f0c060'); jg2.addColorStop(1, '#804010');
      ctx.fillStyle = jg2;
      ctx.beginPath(); ctx.arc(jx2, jy2, jr2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    if (id === 'pluto') {
      // Charon (lune) visible
      ctx.save();
      ctx.globalAlpha = 0.55;
      const chx = W * 0.72, chy = H * 0.08, chr = 14;
      const chg = ctx.createRadialGradient(chx, chy, 0, chx, chy, chr);
      chg.addColorStop(0, '#d0c0b0'); chg.addColorStop(1, '#706050');
      ctx.fillStyle = chg;
      ctx.beginPath(); ctx.arc(chx, chy, chr, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    if (id === 'venus') {
      // Dense sulfuric cloud bands drifting across upper sky
      for (let i = 0; i < 4; i++) {
        const bandY = H * (0.04 + i * 0.065);
        const cg = ctx.createLinearGradient(0, bandY - 14, 0, bandY + 14);
        cg.addColorStop(0, 'rgba(160,60,0,0)');
        cg.addColorStop(0.5, 'rgba(175,72,5,1)');
        cg.addColorStop(1, 'rgba(160,60,0,0)');
        ctx.save();
        ctx.globalAlpha = 0.20 - i * 0.03;
        ctx.fillStyle = cg;
        ctx.fillRect(0, bandY - 14, W, 28);
        ctx.restore();
      }
    }
  }

  _drawWeather(ctx, W, H) {
    const id = this.bodyId;

    // Mars: mur de poussière qui avance depuis le côté sous le vent
    if (id === 'mars' && this._dustStormProgress > 0.02) {
      const p = this._dustStormProgress;
      const wDir = this.wind.current >= 0 ? 1 : -1;
      const wallEdge = wDir > 0 ? 0 : W;
      const wallFront = wDir > 0
        ? W * Math.min(1.05, p * 1.5)
        : W * Math.max(-0.05, 1 - p * 1.5);
      const g = ctx.createLinearGradient(wallEdge, 0, wallFront, 0);
      g.addColorStop(0,   `rgba(200,90,25,${Math.min(0.80, p * 0.88)})`);
      g.addColorStop(0.55, `rgba(190,75,18,${Math.min(0.52, p * 0.62)})`);
      g.addColorStop(1,   'rgba(185,70,15,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // Titan: pluie de méthane pendant downburst
    if (id === 'titan' && this.hazard.isActive) {
      ctx.save();
      ctx.strokeStyle = 'rgba(175,128,65,0.38)';
      ctx.lineWidth = 1;
      const rng = seededRand(Math.floor(this.elapsed * 26) * 9973);
      const slant = this.wind.current * 0.014;
      for (let i = 0; i < 60; i++) {
        const rx = rng() * W, ry = rng() * H;
        const len = 9 + rng() * 14;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + slant * len, ry + len);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Venus: pluie d'acide pendant le hazard
    if (id === 'venus' && this.hazard.isActive) {
      ctx.save();
      ctx.lineWidth = 1;
      const rng = seededRand(Math.floor(this.elapsed * 19) * 8831);
      const slant = this.wind.current * 0.011;
      for (let i = 0; i < 75; i++) {
        const rx = rng() * W, ry = rng() * H;
        const len = 11 + rng() * 16;
        const a = 0.22 + rng() * 0.18;
        ctx.strokeStyle = `rgba(115,210,35,${a})`;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + slant * len, ry + len);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Earth: ciel qui s'assombrit pendant l'orage
    if (id === 'earth' && (this.hazard.isActive || this.hazard.isWarning)) {
      ctx.fillStyle = `rgba(12,12,32,${this.hazard.isActive ? 0.20 : 0.09})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Io: lave incandescente en arrière plan + rougeoyement lors des éruptions
    if (id === 'io' && this.hazard.isActive) {
      ctx.fillStyle = 'rgba(255,80,0,0.14)';
      ctx.fillRect(0, 0, W, H);
      // Particules de lave
      ctx.save();
      const rng2 = seededRand(Math.floor(this.elapsed * 30) * 7331);
      for (let i = 0; i < 18; i++) {
        const rx = rng2() * W, ry = rng2() * H * 0.8;
        const rc = rng2() * 4 + 2;
        const heat = rng2();
        ctx.fillStyle = heat > 0.7 ? 'rgba(255,255,100,0.7)' : 'rgba(255,100,0,0.5)';
        ctx.beginPath(); ctx.arc(rx, ry, rc, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // Europa: geyser visuel (colonne d'eau)
    if (id === 'europa' && this.hazard.isActive) {
      const S = this.SCALE;
      const cx2 = this.camX, cy2 = this.camY;
      const padX = (this.terrain.padCenter - cx2) * S + W / 2;
      const padY = H / 2 - (this.terrain.padHeight - cy2) * S;
      ctx.save();
      ctx.globalAlpha = 0.55;
      const gg = ctx.createLinearGradient(padX, padY, padX, padY - H * 0.6);
      gg.addColorStop(0, 'rgba(150,210,255,0.9)');
      gg.addColorStop(0.6, 'rgba(100,180,255,0.4)');
      gg.addColorStop(1, 'rgba(80,150,255,0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.ellipse(padX, padY, 14, H * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Pluto: particules de vent solaire (traits horizontaux)
    if (id === 'pluto' && this.hazard.isActive) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,220,180,0.18)';
      ctx.lineWidth = 1;
      const rng3 = seededRand(Math.floor(this.elapsed * 12) * 4441);
      for (let i = 0; i < 30; i++) {
        const rx = rng3() * W, ry = rng3() * H * 0.85;
        const len = 20 + rng3() * 40;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + len, ry); ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawWindParticles(ctx, cx, cy, S, W, H) {
    if (!this._windParticles.length) return;
    const color = this.bodyId === 'mars'  ? [220, 150,  80] :
                  this.bodyId === 'titan' ? [255, 210, 130] :
                  this.bodyId === 'venus' ? [255, 180,  80] :
                  [200, 225, 255];
    ctx.save();
    ctx.lineWidth = 1;
    for (const p of this._windParticles) {
      const sx = (p.x - cx) * S + W / 2;
      const sy = H / 2 - (p.y - cy) * S;
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd < 0.1) continue;
      const len = p.len * Math.min(2, spd / 3) * S * 0.1;
      if (len < 0.5) continue;
      const nx = p.vx / spd;
      const ny = -p.vy / spd; // canvas y is inverted
      ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${(p.life * 0.4).toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(sx - nx * len, sy - ny * len);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawMiniMap(ctx, W, H) {
    const mapW = Math.min(W - 40, 460);
    const mapH = 44;
    const mapX = (W - mapW) / 2;
    const mapY = H - mapH - 14;
    const tw = this.terrain.width;
    const pts = this.terrain.points;
    const step = this.terrain.step;
    const minH = this.terrain.minH;
    const maxH = this.terrain.maxH;
    const hRange = Math.max(1, maxH - minH);
    const toMX = wx => mapX + Math.max(0, Math.min(1, wx / tw)) * mapW;
    const toMY = wy => mapY + mapH - 6 - ((wy - minH) / hRange) * (mapH - 14);

    ctx.save();

    // Panel background
    ctx.fillStyle = 'rgba(0,4,18,0.88)';
    ctx.beginPath(); ctx.roundRect(mapX, mapY, mapW, mapH, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(80,120,220,0.35)';
    ctx.lineWidth = 1; ctx.stroke();

    // Clip to panel
    ctx.save();
    ctx.beginPath(); ctx.roundRect(mapX + 1, mapY + 1, mapW - 2, mapH - 2, 5); ctx.clip();

    // Current viewport highlight
    const visW = this.canvasW / this.SCALE;
    const vL = toMX(this.camX - visW / 2);
    const vR = toMX(this.camX + visW / 2);
    ctx.fillStyle = 'rgba(200,220,255,0.06)';
    ctx.fillRect(vL, mapY, vR - vL, mapH);

    // Terrain fill
    ctx.beginPath();
    ctx.moveTo(mapX, mapY + mapH);
    for (let i = 0; i < pts.length; i++) ctx.lineTo(toMX(i * step), toMY(pts[i]));
    ctx.lineTo(mapX + mapW, mapY + mapH);
    ctx.closePath();
    ctx.fillStyle = this.cfg.groundColor + '55';
    ctx.fill();

    // Terrain top line
    ctx.strokeStyle = lighten(this.cfg.groundColor, 20) + 'aa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const mx = toMX(i * step), my = toMY(pts[i]);
      i === 0 ? ctx.moveTo(mx, my) : ctx.lineTo(mx, my);
    }
    ctx.stroke();

    // Landing pad
    const padMX = toMX(this.terrain.padCenter);
    const padMY = toMY(this.terrain.padHeight);
    const padPxW = Math.max(4, (this.terrain.padWidth / tw) * mapW);
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(padMX - padPxW / 2, padMY - 2, padPxW, 3);
    ctx.fillStyle = 'rgba(0,255,136,0.7)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('\u25BC', padMX, padMY - 3);

    // Lander dot
    const lmx = toMX(this.lander.x);
    const lmy = Math.min(mapY + mapH - 4, Math.max(mapY + 4, toMY(this.lander.y)));
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#aabbff';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(lmx, lmy, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.restore(); // end clip
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

export { LanderGame, MeteorSystem, genLandingStars, genClouds };
