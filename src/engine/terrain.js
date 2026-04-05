import { BODY_DATA } from '../data/bodies.js';
import { seededRand, lighten } from '../utils.js';
import { t } from '../i18n/i18n.js';

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
    }
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
    ctx.fillText(t('landing_zone'), (sxL + sxR) / 2, syP - 8);

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

export { Terrain };
