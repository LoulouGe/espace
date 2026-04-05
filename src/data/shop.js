import { t } from '../i18n/i18n.js';
import { colorAlpha } from '../utils.js';

// ─── Shop catalog ───────────────────────────────────────────────────────────
// Hardcoded name/desc replaced with i18n keys.

export const SHOP_CATALOG = {
  standard:  { nameKey: 'shop.standard.name',  descKey: 'shop.standard.desc',  cost: 0 },
  moustique: { nameKey: 'shop.moustique.name', descKey: 'shop.moustique.desc', cost: 240 },
  tank:      { nameKey: 'shop.tank.name',      descKey: 'shop.tank.desc',      cost: 950 },
  alien:     { nameKey: 'shop.alien.name',     descKey: 'shop.alien.desc',     cost: 4800 },
};

// ─── Upgrade catalog ────────────────────────────────────────────────────────

export const UPGRADE_CATALOG = {
  thrust:   { nameKey: 'upgrade.thrust.name',   descKey: 'upgrade.thrust.desc',   cost: 60,  max: 3 },
  fuel_cap: { nameKey: 'upgrade.fuel_cap.name', descKey: 'upgrade.fuel_cap.desc', cost: 50,  max: 3 },
  gyro:     { nameKey: 'upgrade.gyro.name',     descKey: 'upgrade.gyro.desc',     cost: 45,  max: 3 },
  rcs:      { nameKey: 'upgrade.rcs.name',      descKey: 'upgrade.rcs.desc',      cost: 55,  max: 2 },
  retro:    { nameKey: 'upgrade.retro.name',    descKey: 'upgrade.retro.desc',    cost: 50,  max: 2 },
};

// ─── Reward constants ───────────────────────────────────────────────────────

export const BASE_REWARDS = [10, 20, 50, 80, 150];
export const VENUS_BOSS_REWARD = 500;

// ─── Unified ship palette ───────────────────────────────────────────────────
// Single source of truth (from lander.js version). Glow values are hex colors
// -- callers use colorAlpha() when they need transparency.

export function getShipPalette(type) {
  if (type === 'moustique') {
    return {
      hullLight: '#ffe6f4',
      hullMid: '#ff9fc9',
      hullDark: '#7f1f53',
      metal: '#5d3f56',
      trim: '#ffc7e1',
      glow: '#ff8ed0',
      canopy: '#87f0ff',
      canopyGlow: 'rgba(255, 180, 230, 0.35)',
    };
  }
  if (type === 'tank') {
    return {
      hullLight: '#96a8ae',
      hullMid: '#4e6670',
      hullDark: '#162128',
      metal: '#334048',
      trim: '#bed6de',
      glow: '#79ffd2',
      canopy: '#8fe8ff',
      canopyGlow: 'rgba(120, 255, 210, 0.24)',
    };
  }
  if (type === 'alien') {
    return {
      hullLight: '#bffcff',
      hullMid: '#39d9b0',
      hullDark: '#035d54',
      metal: '#0a4f48',
      trim: '#d8fffe',
      glow: '#66ffe0',
      canopy: '#9afaff',
      canopyGlow: 'rgba(100, 255, 224, 0.32)',
    };
  }
  // standard
  return {
    hullLight: '#f4f8ff',
    hullMid: '#aebcd8',
    hullDark: '#4a5b7c',
    metal: '#6e7d96',
    trim: '#dde8ff',
    glow: '#78dfff',
    canopy: '#89d7ff',
    canopyGlow: 'rgba(120, 220, 255, 0.26)',
  };
}

// ─── Ship preview drawing ───────────────────────────────────────────────────
// Ported from main.js drawShopShip(). Draws a centered ship preview on the
// given canvas context. Uses colorAlpha() instead of hardcoded rgba glows.

export function drawShipPreview(ctx, id, size = 50) {
  ctx.clearRect(0, 0, size, size);
  const S = 3.5;

  let hw = 2.5, hh = 4.5;
  if (id === 'moustique') { hw = 1.8; hh = 3.2; }
  else if (id === 'tank') { hw = 3.5; hh = 4.8; }
  else if (id === 'alien') { hw = 2.8; hh = 3.5; }

  const pw = hw * 2 * S;
  const ph = hh * 2 * S;
  const palette = getShipPalette(id);
  const cx = size / 2;
  const cy = size / 2;

  ctx.save();
  ctx.translate(cx, cy);

  // Glow halo
  const hullGlow = ctx.createRadialGradient(-pw * 0.12, -ph * 0.24, 2, 0, 0, Math.max(pw, ph) * 0.95);
  hullGlow.addColorStop(0, colorAlpha(palette.glow, 0.24));
  hullGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hullGlow;
  ctx.beginPath(); ctx.arc(0, 0, Math.max(pw, ph) * 0.95, 0, Math.PI * 2); ctx.fill();

  // Body gradient
  const bodyGrad = ctx.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2);
  bodyGrad.addColorStop(0, palette.hullLight);
  bodyGrad.addColorStop(0.52, palette.hullMid);
  bodyGrad.addColorStop(1, palette.hullDark);

  if (id === 'moustique') {
    // Small needle shape
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.moveTo(0, -ph * 0.6); ctx.lineTo(pw * 0.4, ph * 0.2); ctx.lineTo(-pw * 0.4, ph * 0.2); ctx.fill();
    // Wings
    ctx.fillStyle = palette.metal;
    ctx.beginPath(); ctx.moveTo(pw * 0.3, ph * 0.1); ctx.lineTo(pw * 0.9, ph * 0.3); ctx.lineTo(pw * 0.2, ph * 0.3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-pw * 0.3, ph * 0.1); ctx.lineTo(-pw * 0.9, ph * 0.3); ctx.lineTo(-pw * 0.2, ph * 0.3); ctx.fill();
    // Engine
    ctx.fillStyle = palette.hullDark; ctx.beginPath(); ctx.rect(-pw * 0.2, ph * 0.2, pw * 0.4, ph * 0.15); ctx.fill();
    // Legs
    ctx.strokeStyle = palette.trim; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(-pw / 2, ph * 0.1); ctx.lineTo(-pw * 0.8, ph * 0.6); ctx.moveTo(-pw - 3, ph * 0.6); ctx.lineTo(-pw * 0.6, ph * 0.6);
    ctx.moveTo(pw / 2, ph * 0.1); ctx.lineTo(pw * 0.8, ph * 0.6); ctx.moveTo(pw * 0.6, ph * 0.6); ctx.lineTo(pw + 3, ph * 0.6);
    ctx.stroke();
    // Window
    ctx.fillStyle = palette.canopy; ctx.beginPath(); ctx.arc(0, -ph * 0.1, pw * 0.15, 0, Math.PI * 2); ctx.fill();

  } else if (id === 'tank') {
    // Big blocky hexagon
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-pw / 2, -ph * 0.4); ctx.lineTo(pw / 2, -ph * 0.4);
    ctx.lineTo(pw * 0.6, 0); ctx.lineTo(pw / 2, ph * 0.4);
    ctx.lineTo(-pw / 2, ph * 0.4); ctx.lineTo(-pw * 0.6, 0);
    ctx.fill();
    // Armor plates
    ctx.fillStyle = palette.metal; ctx.fillRect(-pw * 0.4, -ph * 0.2, pw * 0.8, ph * 0.4);
    // Engine (double)
    ctx.fillStyle = palette.hullDark;
    ctx.fillRect(-pw * 0.3, ph * 0.4, pw * 0.2, ph * 0.15);
    ctx.fillRect(pw * 0.1, ph * 0.4, pw * 0.2, ph * 0.15);
    // Brutal Legs
    ctx.strokeStyle = palette.trim; ctx.lineWidth = 2.5; ctx.beginPath();
    ctx.moveTo(-pw / 2, ph * 0.2); ctx.lineTo(-pw * 0.8, ph * 0.6); ctx.moveTo(-pw * 1.1, ph * 0.6); ctx.lineTo(-pw * 0.5, ph * 0.6);
    ctx.moveTo(pw / 2, ph * 0.2); ctx.lineTo(pw * 0.8, ph * 0.6); ctx.moveTo(pw * 0.5, ph * 0.6); ctx.lineTo(pw * 1.1, ph * 0.6);
    ctx.stroke();
    // Window (slit)
    ctx.fillStyle = palette.canopy; ctx.fillRect(-pw * 0.3, -ph * 0.1, pw * 0.6, ph * 0.1);

  } else if (id === 'alien') {
    // Saucer
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.ellipse(0, ph * 0.1, pw * 0.8, ph * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    // Glass Dome
    ctx.fillStyle = palette.canopyGlow;
    ctx.beginPath(); ctx.arc(0, ph * 0.1, pw * 0.4, Math.PI, 0); ctx.fill();
    // Tractor beam instead of legs
    ctx.fillStyle = colorAlpha('#66ffe0', 0.18);
    ctx.beginPath(); ctx.moveTo(-pw * 0.3, ph * 0.2); ctx.lineTo(pw * 0.3, ph * 0.2);
    ctx.lineTo(pw * 0.6, ph * 0.8); ctx.lineTo(-pw * 0.6, ph * 0.8); ctx.fill();
    // Alien pilot silhouette
    ctx.fillStyle = palette.hullDark; ctx.beginPath(); ctx.arc(0, 0, pw * 0.15, Math.PI, 0); ctx.fill();

  } else {
    // Standard
    ctx.strokeStyle = palette.trim; ctx.lineWidth = 1.5;
    const legW = pw * 0.55;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.4, ph * 0.1); ctx.lineTo(-legW / 2, ph * 0.5);
    ctx.moveTo(pw * 0.4, ph * 0.1); ctx.lineTo(legW / 2, ph * 0.5);
    ctx.stroke();
    ctx.strokeStyle = palette.metal; ctx.lineWidth = 2;
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
  }

  // Outline
  ctx.strokeStyle = palette.trim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (id === 'alien') {
    ctx.ellipse(0, ph * 0.1, pw * 0.8, ph * 0.25, 0, 0, Math.PI * 2);
  } else if (id === 'tank') {
    ctx.moveTo(-pw / 2, -ph * 0.4); ctx.lineTo(pw / 2, -ph * 0.4);
    ctx.lineTo(pw * 0.6, 0); ctx.lineTo(pw / 2, ph * 0.4);
    ctx.lineTo(-pw / 2, ph * 0.4); ctx.lineTo(-pw * 0.6, 0); ctx.closePath();
  } else if (id === 'moustique') {
    ctx.moveTo(0, -ph * 0.6); ctx.lineTo(pw * 0.4, ph * 0.2); ctx.lineTo(-pw * 0.4, ph * 0.2); ctx.closePath();
  } else {
    ctx.roundRect(-pw / 2, -ph / 2, pw, ph * 0.65, 4);
  }
  ctx.stroke();

  ctx.restore();
}
