import { BODY_DATA } from '../data/bodies.js';
import { getShipPalette } from '../data/shop.js';
import { colorAlpha } from '../utils.js';
import { t } from '../i18n/i18n.js';

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

    // --- Ship Class ---
    try {
      this.shipType = localStorage.getItem('sl_active_ship') || 'standard';
    } catch {
      this.shipType = 'standard';
    }

    if (this.shipType === 'moustique') {
      this.fuel = cfg.startFuel * 0.45; // Très peu de fuel
      this.hw = 1.8; this.hh = 3.2;    // Plus petit
    } else if (this.shipType === 'tank') {
      this.fuel = cfg.startFuel * 2.2; // Énorme réserve
      this.hw = 3.5; this.hh = 4.8;    // Plus large
    } else if (this.shipType === 'alien') {
      this.fuel = cfg.startFuel * 1.5;
      this.hw = 2.8; this.hh = 3.5;
    }
    this.fuelMax = this.fuel; // toujours 100% au départ
  }

  update(dt, input, windForce, hazard, terrain) {
    if (!this.alive) return;

    const cfg = this.cfg;
    let rotMult = hazard ? hazard.rotationMult : 1;
    let fuelMult = hazard ? hazard.fuelDrainMult : 1;
    let engineOff = hazard ? hazard.engineCutout : false;
    let extraVert = hazard ? hazard.vertForce : 0;
    let windF = windForce;

    // Ship Class Effects on Hazards
    if (this.shipType === 'tank') {
      windF *= 0.3; // Tank résiste à 70% du vent
      extraVert *= 0.3;
    } else if (this.shipType === 'alien') {
      fuelMult = 1; // Ignores acid rain
      engineOff = false; // Ignores solar flares
      rotMult = 1; // Ignores magnetic storm
    }

    // --- Rotation with inertia (Feature 8) ---
    let rotAcc = 280; // deg/s²
    let rotFriction = 0.08;
    if (this.shipType === 'moustique') { rotAcc = 600; rotFriction = 0.01; }
    else if (this.shipType === 'tank') { rotAcc = 140; rotFriction = 0.2; }
    // Upgrade bonuses
    if (this._gyroBonus) rotAcc *= this._gyroBonus;
    if (this._rcsBonus)  rotFriction = Math.min(0.55, rotFriction * this._rcsBonus);

    if (input.left) this.rotVel -= rotAcc * dt * rotMult;
    if (input.right) this.rotVel += rotAcc * dt * rotMult;
    this.rotVel *= Math.pow(rotFriction, dt);
    this.angle += this.rotVel * dt;
    this.angle = Math.max(-85, Math.min(85, this.angle));

    // angle=0 → nez vers le haut. La poussée va dans le sens du nez.
    const rad = this.angle * Math.PI / 180;
    let fx = windF;
    let fy = -cfg.gravity + extraVert;

    // --- Main engine (up) ---
    if (input.up && this.fuel > 0 && !engineOff) {
      let thrustMult = 3.2;
      if (this.shipType === 'moustique') thrustMult = 2.8;
      else if (this.shipType === 'tank') thrustMult = 2.9;
      else if (this.shipType === 'alien') thrustMult = 4.5;
      if (this._thrustBonus) thrustMult *= this._thrustBonus;
      if (cfg.thrustAssist) thrustMult *= cfg.thrustAssist;

      const thrust = cfg.gravity * thrustMult;
      fx += thrust * Math.sin(rad);
      fy += thrust * Math.cos(rad);
      this.fuel -= dt * 14 * fuelMult;
      if (this.fuel < 0) this.fuel = 0;
    }

    // --- Retro thrusters (space) ---
    if (input.space && this.fuel > 0 && !engineOff && cfg.drag > 0) {
      const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (spd > 0.1) {
        let retroForce = cfg.gravity * 2.2;
        if (this.shipType === 'alien') retroForce = cfg.gravity * 3.5;
        if (this._retroBonus) retroForce *= this._retroBonus;
        if (cfg.retroAssist) retroForce *= cfg.retroAssist;
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

    // Boundary clamp (horizontal)
    if (this.x < 0) {
      this.x = 0;
      this.vx = Math.abs(this.vx) * 0.3;
    }
    if (this.x > terrain.width) {
      this.x = terrain.width;
      this.vx = -Math.abs(this.vx) * 0.3;
    }
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

    if (!onPad) return { type: 'crash', reason: t('collision.off_pad') };
    if (vDown > cfg.maxVSpeed) return { type: 'crash', reason: t('collision.vspeed', { v: vDown.toFixed(1), max: cfg.maxVSpeed }) };
    if (hSpeed > cfg.maxHSpeed) return { type: 'crash', reason: t('collision.hspeed', { v: hSpeed.toFixed(1), max: cfg.maxHSpeed }) };
    if (tilt > cfg.maxAngle) return { type: 'crash', reason: t('collision.angle', { v: tilt.toFixed(1), max: cfg.maxAngle }) };
    return { type: 'land', _impactVS: vDown, _impactAngle: tilt };
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

    const palette = getShipPalette(this.shipType);
    const glowR = Math.max(pw, ph) * (this.shipType === 'alien' ? 1.25 : 1.05);
    const hullGlow = ctx.createRadialGradient(-pw * 0.12, -ph * 0.24, Math.max(2, pw * 0.08), 0, 0, glowR);
    hullGlow.addColorStop(0, colorAlpha(palette.glow, this.shipType === 'tank' ? 0.16 : 0.24));
    hullGlow.addColorStop(0.55, colorAlpha(palette.glow, 0.10));
    hullGlow.addColorStop(1, colorAlpha(palette.glow, 0));
    ctx.fillStyle = hullGlow;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    const bodyGrad = ctx.createLinearGradient(-pw/2, -ph/2, pw/2, ph/2);
    bodyGrad.addColorStop(0, palette.hullLight);
    bodyGrad.addColorStop(0.52, palette.hullMid);
    bodyGrad.addColorStop(1, palette.hullDark);

    if (this.shipType === 'moustique') {
      // Small needle shape
      ctx.fillStyle = bodyGrad;
      ctx.beginPath(); ctx.moveTo(0, -ph*0.6); ctx.lineTo(pw*0.4, ph*0.2); ctx.lineTo(-pw*0.4, ph*0.2); ctx.fill();
      // Wings
      ctx.fillStyle = palette.metal;
      ctx.beginPath(); ctx.moveTo(pw*0.3, ph*0.1); ctx.lineTo(pw*0.9, ph*0.3); ctx.lineTo(pw*0.2, ph*0.3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-pw*0.3, ph*0.1); ctx.lineTo(-pw*0.9, ph*0.3); ctx.lineTo(-pw*0.2, ph*0.3); ctx.fill();
      // Engine
      ctx.fillStyle = palette.hullDark; ctx.beginPath(); ctx.rect(-pw*0.2, ph*0.2, pw*0.4, ph*0.15); ctx.fill();
      // Legs
      ctx.strokeStyle = palette.trim; ctx.lineWidth = Math.max(1, scale * 0.5); ctx.beginPath();
      ctx.moveTo(-pw/2, ph*0.1); ctx.lineTo(-pw*0.8, ph*0.6); ctx.moveTo(-pw-2, ph*0.6); ctx.lineTo(-pw*0.6, ph*0.6);
      ctx.moveTo(pw/2, ph*0.1); ctx.lineTo(pw*0.8, ph*0.6); ctx.moveTo(pw*0.6, ph*0.6); ctx.lineTo(pw+2, ph*0.6);
      ctx.stroke();
      // Window
      ctx.fillStyle = palette.canopy; ctx.beginPath(); ctx.arc(0, -ph*0.1, pw*0.15, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = colorAlpha(palette.trim, 0.48);
      ctx.beginPath(); ctx.moveTo(-pw * 0.1, -ph * 0.36); ctx.lineTo(pw * 0.1, -ph * 0.18); ctx.lineTo(0, ph * 0.06); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = colorAlpha(palette.glow, 0.65);
      ctx.lineWidth = Math.max(1, scale * 0.22);
      ctx.beginPath();
      ctx.moveTo(-pw * 0.22, -ph * 0.18);
      ctx.lineTo(0, -ph * 0.42);
      ctx.lineTo(pw * 0.22, -ph * 0.18);
      ctx.stroke();

    } else if (this.shipType === 'tank') {
      // Big blocky hexagon
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(-pw/2, -ph*0.4); ctx.lineTo(pw/2, -ph*0.4);
      ctx.lineTo(pw*0.6, 0); ctx.lineTo(pw/2, ph*0.4);
      ctx.lineTo(-pw/2, ph*0.4); ctx.lineTo(-pw*0.6, 0);
      ctx.fill();
      // Armor plates
      ctx.fillStyle = palette.metal; ctx.fillRect(-pw*0.4, -ph*0.2, pw*0.8, ph*0.4);
      // Engine (double)
      ctx.fillStyle = palette.hullDark;
      ctx.fillRect(-pw*0.3, ph*0.4, pw*0.2, ph*0.15);
      ctx.fillRect(pw*0.1, ph*0.4, pw*0.2, ph*0.15);
      // Brutal Legs
      ctx.strokeStyle = palette.trim; ctx.lineWidth = Math.max(2, scale * 0.8); ctx.beginPath();
      ctx.moveTo(-pw/2, ph*0.2); ctx.lineTo(-pw*0.8, ph*0.6); ctx.moveTo(-pw*1.1, ph*0.6); ctx.lineTo(-pw*0.5, ph*0.6);
      ctx.moveTo(pw/2, ph*0.2); ctx.lineTo(pw*0.8, ph*0.6); ctx.moveTo(pw*0.5, ph*0.6); ctx.lineTo(pw*1.1, ph*0.6);
      ctx.stroke();
      // Window (slit)
      ctx.fillStyle = palette.canopy; ctx.fillRect(-pw*0.3, -ph*0.1, pw*0.6, ph*0.1);
      ctx.fillStyle = colorAlpha(palette.trim, 0.20);
      ctx.fillRect(-pw * 0.42, -ph * 0.28, pw * 0.84, ph * 0.08);
      ctx.strokeStyle = colorAlpha(palette.glow, 0.36);
      ctx.lineWidth = Math.max(1, scale * 0.18);
      ctx.strokeRect(-pw * 0.24, -ph * 0.04, pw * 0.48, ph * 0.18);

    } else if (this.shipType === 'alien') {
      // Saucer
      ctx.fillStyle = bodyGrad;
      ctx.beginPath(); ctx.ellipse(0, ph*0.1, pw*0.8, ph*0.25, 0, 0, Math.PI*2); ctx.fill();
      // Glass Dome
      ctx.fillStyle = palette.canopyGlow;
      ctx.beginPath(); ctx.arc(0, ph*0.1, pw*0.4, Math.PI, 0); ctx.fill();
      // Tractor beam instead of legs
      ctx.fillStyle = colorAlpha(palette.glow, 0.18);
      ctx.beginPath(); ctx.moveTo(-pw*0.3, ph*0.2); ctx.lineTo(pw*0.3, ph*0.2);
      ctx.lineTo(pw*0.6, ph*0.8); ctx.lineTo(-pw*0.6, ph*0.8); ctx.fill();
      ctx.strokeStyle = colorAlpha(palette.trim, 0.42);
      ctx.lineWidth = Math.max(1, scale * 0.18);
      ctx.beginPath();
      ctx.ellipse(0, ph * 0.1, pw * 0.45, ph * 0.14, 0, Math.PI, 0);
      ctx.stroke();
      // Alien pilot silhouette
      ctx.fillStyle = palette.hullDark; ctx.beginPath(); ctx.arc(0, 0, pw*0.15, Math.PI, 0); ctx.fill();
      for (let i = 0; i < 5; i++) {
        const lx = -pw * 0.42 + i * pw * 0.21;
        ctx.fillStyle = colorAlpha(palette.glow, 0.65 - i * 0.07);
        ctx.beginPath();
        ctx.arc(lx, ph * 0.12, Math.max(1.5, pw * 0.04), 0, Math.PI * 2);
        ctx.fill();
      }

    } else {
      // Standard
      ctx.strokeStyle = palette.trim;
      ctx.lineWidth = Math.max(1, scale * 0.5);
      const legW = pw * 0.55, legH = ph * 0.35;
      ctx.beginPath();
      ctx.moveTo(-pw * 0.4, ph * 0.1); ctx.lineTo(-legW / 2, ph * 0.5);
      ctx.moveTo(pw * 0.4, ph * 0.1); ctx.lineTo(legW / 2, ph * 0.5);
      ctx.stroke();
      ctx.strokeStyle = palette.metal;
      ctx.lineWidth = Math.max(1.5, scale * 0.6);
      ctx.beginPath();
      ctx.moveTo(-legW / 2 - 3, ph * 0.5); ctx.lineTo(-legW / 2 + 3, ph * 0.5);
      ctx.moveTo(legW / 2 - 3, ph * 0.5); ctx.lineTo(legW / 2 + 3, ph * 0.5);
      ctx.stroke();

      ctx.fillStyle = palette.metal;
      ctx.beginPath();
      ctx.moveTo(-pw * 0.35, ph * 0.1); ctx.lineTo(pw * 0.35, ph * 0.1);
      ctx.lineTo(pw * 0.25, ph * 0.45); ctx.lineTo(-pw * 0.25, ph * 0.45);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(-pw / 2, -ph / 2, pw, ph * 0.65, 4);
      ctx.fill();

      ctx.fillStyle = palette.canopy;
      ctx.beginPath();
      ctx.arc(0, -ph * 0.15, pw * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.canopyGlow;
      ctx.beginPath();
      ctx.arc(-pw * 0.06, -ph * 0.18, pw * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colorAlpha(palette.trim, 0.22);
      ctx.fillRect(-pw * 0.32, -ph * 0.34, pw * 0.64, ph * 0.06);
      ctx.fillStyle = colorAlpha(palette.glow, 0.16);
      ctx.beginPath();
      ctx.roundRect(-pw * 0.26, -ph * 0.06, pw * 0.52, ph * 0.12, 4);
      ctx.fill();
    }

    ctx.strokeStyle = colorAlpha(palette.trim, 0.85);
    ctx.lineWidth = Math.max(1, scale * 0.22);
    ctx.beginPath();
    if (this.shipType === 'alien') {
      ctx.ellipse(0, ph * 0.1, pw * 0.8, ph * 0.25, 0, 0, Math.PI * 2);
    } else if (this.shipType === 'tank') {
      ctx.moveTo(-pw/2, -ph*0.4); ctx.lineTo(pw/2, -ph*0.4);
      ctx.lineTo(pw*0.6, 0); ctx.lineTo(pw/2, ph*0.4);
      ctx.lineTo(-pw/2, ph*0.4); ctx.lineTo(-pw*0.6, 0);
      ctx.closePath();
    } else if (this.shipType === 'moustique') {
      ctx.moveTo(0, -ph*0.6); ctx.lineTo(pw*0.4, ph*0.2); ctx.lineTo(-pw*0.4, ph*0.2); ctx.closePath();
    } else {
      ctx.roundRect(-pw / 2, -ph / 2, pw, ph * 0.65, 4);
    }
    ctx.stroke();

    const topSheen = ctx.createLinearGradient(-pw * 0.35, -ph * 0.46, pw * 0.25, ph * 0.10);
    topSheen.addColorStop(0, 'rgba(255,255,255,0.32)');
    topSheen.addColorStop(0.38, 'rgba(255,255,255,0.08)');
    topSheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = topSheen;
    if (this.shipType === 'alien') {
      ctx.beginPath();
      ctx.ellipse(-pw * 0.04, 0, pw * 0.5, ph * 0.16, -0.08, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shipType === 'tank') {
      ctx.beginPath();
      ctx.moveTo(-pw * 0.42, -ph * 0.30);
      ctx.lineTo(pw * 0.30, -ph * 0.30);
      ctx.lineTo(pw * 0.12, -ph * 0.04);
      ctx.lineTo(-pw * 0.34, -ph * 0.08);
      ctx.closePath();
      ctx.fill();
    } else if (this.shipType === 'moustique') {
      ctx.beginPath();
      ctx.moveTo(0, -ph * 0.58);
      ctx.lineTo(pw * 0.18, -ph * 0.14);
      ctx.lineTo(0, -ph * 0.06);
      ctx.lineTo(-pw * 0.18, -ph * 0.14);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(-pw * 0.34, -ph * 0.38, pw * 0.56, ph * 0.18, 4);
      ctx.fill();
    }

    const accentDots = this.shipType === 'tank' ? 2 : this.shipType === 'alien' ? 5 : 3;
    for (let i = 0; i < accentDots; i++) {
      const t = accentDots === 1 ? 0 : i / (accentDots - 1);
      const lx = -pw * 0.22 + t * pw * 0.44;
      const ly = this.shipType === 'alien' ? ph * 0.12 : ph * 0.06;
      ctx.fillStyle = colorAlpha(palette.glow, this.shipType === 'alien' ? 0.30 : 0.48);
      ctx.beginPath();
      ctx.arc(lx, ly, Math.max(1.2, pw * 0.032), 0, Math.PI * 2);
      ctx.fill();
    }

    const engineGlow = ctx.createRadialGradient(0, ph * 0.42, 0, 0, ph * 0.42, pw * 0.42);
    engineGlow.addColorStop(0, colorAlpha(palette.glow, 0.24));
    engineGlow.addColorStop(1, colorAlpha(palette.glow, 0));
    ctx.fillStyle = engineGlow;
    ctx.beginPath();
    ctx.ellipse(0, ph * 0.44, pw * 0.34, ph * 0.12, 0, 0, Math.PI * 2);
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
      ctx.fillStyle = 'rgba(255,255,245,0.78)';
      ctx.beginPath();
      ctx.moveTo(-fw * 0.38, ph * 0.44);
      ctx.lineTo(fw * 0.38, ph * 0.44);
      ctx.quadraticCurveTo(fw * 0.18, ph * 0.48 + fl * 0.4, 0, ph * 0.46 + fl * 0.62);
      ctx.quadraticCurveTo(-fw * 0.18, ph * 0.48 + fl * 0.4, -fw * 0.38, ph * 0.44);
      ctx.fill();
    }

    // Retro flame indicator
    if (input && input.space && this.fuel > 0 && this.cfg.drag > 0) {
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

export { Lander };
