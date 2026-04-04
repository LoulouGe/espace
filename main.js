// main.js — App controller, state machine, game loop

'use strict';

// ─── Canvas ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();

// ─── State ────────────────────────────────────────────────────────────────────
const S = { SOLAR: 'solar', FADING: 'fading', SELECT: 'select', PLAYING: 'playing', RESULT: 'result', COUNTDOWN: 'countdown', SURVEY: 'survey', SHOP: 'shop' };
let state = S.SOLAR;

// ─── Singletons ───────────────────────────────────────────────────────────────
let solar = new SolarSystem(canvas.width, canvas.height);
let game = null;

// ─── Input ────────────────────────────────────────────────────────────────────
const keys = { up: false, left: false, right: false, space: false };
document.addEventListener('keydown', e => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') { keys.up = true; e.preventDefault(); }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.left = true; e.preventDefault(); }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = true; e.preventDefault(); }
  if (e.code === 'Space') { keys.space = true; e.preventDefault(); }
});
document.addEventListener('keyup', e => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space') keys.space = false;
});

// ─── Touch device detection ───────────────────────────────────────────────────
const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);

// ─── Touch controls ───────────────────────────────────────────────────────────
const TC_MAP = { 'tc-left': 'left', 'tc-right': 'right', 'tc-thrust': 'up', 'tc-retro': 'space' };
for (const [btnId, key] of Object.entries(TC_MAP)) {
  const el = document.getElementById(btnId);
  if (!el) continue;
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); keys[key] = true; el.classList.add('active');
  }, { passive: false });
  el.addEventListener('pointerup', e => {
    e.preventDefault(); keys[key] = false; el.classList.remove('active');
  });
  el.addEventListener('pointercancel', () => { keys[key] = false; el.classList.remove('active'); });
  el.addEventListener('pointerleave',  () => { keys[key] = false; el.classList.remove('active'); });
}

// ─── Fade + zoom state ────────────────────────────────────────────────────────
let fadeProgress = 0;         // 0→1
let zoomScale = 1;
let zoomOX = 0;         // target planet screen X
let zoomOY = 0;         // target planet screen Y
const FADE_DUR = 0.9;       // seconds
let selectedBody = null;
let hoveredBody = null;

// ─── Solar view pan/zoom ──────────────────────────────────────────────────────
const VIEW_MIN = 1.0;
const VIEW_MAX = 4.0;
let viewZoom = 1;       // current solar zoom
let viewPanX = 0;       // pan offset in canvas pixels (before zoom)
let viewPanY = 0;

// Convert screen coords → solar canvas coords (inverse of view transform)
function screenToSolar(sx, sy) {
  return {
    x: (sx - canvas.width / 2 - viewPanX) / viewZoom + canvas.width / 2,
    y: (sy - canvas.height / 2 - viewPanY) / viewZoom + canvas.height / 2,
  };
}

// Apply or undo view transform before/after drawing solar system
function applySolarTransform(ctx) {
  ctx.translate(canvas.width / 2 + viewPanX, canvas.height / 2 + viewPanY);
  ctx.scale(viewZoom, viewZoom);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
}

// Zoom centred on a screen point
function zoomViewAt(sx, sy, factor) {
  const newZoom = Math.max(VIEW_MIN, Math.min(VIEW_MAX, viewZoom * factor));
  const ratio = newZoom / viewZoom;
  // Adjust pan so the point under cursor stays fixed
  viewPanX = sx - canvas.width / 2 - (sx - canvas.width / 2 - viewPanX) * ratio;
  viewPanY = sy - canvas.height / 2 - (sy - canvas.height / 2 - viewPanY) * ratio;
  viewZoom = newZoom;

  const maxPanX = (canvas.width / 2) * (viewZoom - 1);
  const maxPanY = (canvas.height / 2) * (viewZoom - 1);
  viewPanX = Math.max(-maxPanX, Math.min(maxPanX, viewPanX));
  viewPanY = Math.max(-maxPanY, Math.min(maxPanY, viewPanY));

  updateTimeCtrlVisibility();
}

function resetViewZoom() {
  viewZoom = 1; viewPanX = 0; viewPanY = 0;
  updateTimeCtrlVisibility();
}

function updateTimeCtrlVisibility() {
  // Masquer les contrôles temps quand on est zoomé
  if (state === S.SOLAR) {
    elTimeCtrl.style.display = (viewZoom > 1.05 || Math.abs(viewPanX) > 5 || Math.abs(viewPanY) > 5) ? 'none' : '';
  }
}

// ─── Mouse wheel zoom ─────────────────────────────────────────────────────────
canvas.addEventListener('wheel', e => {
  if (state !== S.SOLAR) return;
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  zoomViewAt(e.clientX, e.clientY, factor);
}, { passive: false });

// ─── Touch pinch/pan ──────────────────────────────────────────────────────────
let _touches = {};
let _lastPinchDist = null;
let _lastPanMid = null;

canvas.addEventListener('touchstart', e => {
  if (state !== S.SOLAR) return;
  Array.from(e.changedTouches).forEach(t => { _touches[t.identifier] = { x: t.clientX, y: t.clientY }; });
  const ids = Object.keys(_touches);
  if (ids.length === 2) {
    const a = _touches[ids[0]], b = _touches[ids[1]];
    _lastPinchDist = Math.hypot(b.x - a.x, b.y - a.y);
    _lastPanMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
}, { passive: true });

canvas.addEventListener('touchmove', e => {
  if (state !== S.SOLAR) return;
  e.preventDefault();
  Array.from(e.changedTouches).forEach(t => { _touches[t.identifier] = { x: t.clientX, y: t.clientY }; });
  const ids = Object.keys(_touches);
  if (ids.length === 2) {
    const a = _touches[ids[0]], b = _touches[ids[1]];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (_lastPinchDist) {
      zoomViewAt(mid.x, mid.y, dist / _lastPinchDist);
    }
    if (_lastPanMid) {
      viewPanX += mid.x - _lastPanMid.x;
      viewPanY += mid.y - _lastPanMid.y;

      const maxPanX = (canvas.width / 2) * (viewZoom - 1);
      const maxPanY = (canvas.height / 2) * (viewZoom - 1);
      viewPanX = Math.max(-maxPanX, Math.min(maxPanX, viewPanX));
      viewPanY = Math.max(-maxPanY, Math.min(maxPanY, viewPanY));

      updateTimeCtrlVisibility();
    }
    _lastPinchDist = dist;
    _lastPanMid = mid;
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  Array.from(e.changedTouches).forEach(t => { delete _touches[t.identifier]; });
  _lastPinchDist = null;
  _lastPanMid = null;
}, { passive: true });

// ─── Countdown / Survey state ────────────────────────────────────────────────
let countdownTimer = 0;
let surveyTimer = 0;
const SURVEY_DUR = 2.0;

// ─── Campaign & Leaderboard ───────────────────────────────────────────────────
const CAMPAIGN_ORDER = ['moon', 'mercury', 'mars', 'titan', 'earth', 'venus', 'io', 'europa', 'pluto'];

function loadProgress() {
  try { return JSON.parse(localStorage.getItem('sl_progress') || '{}'); } catch { return {}; }
}
function loadDiamonds() { try { return parseInt(localStorage.getItem('sl_diamonds')||'0', 10); } catch { return 0; } }
function saveDiamonds(v) { try { localStorage.setItem('sl_diamonds', String(v)); } catch { } }

function loadShips() { try { return JSON.parse(localStorage.getItem('sl_ships')||'["standard"]'); } catch { return ['standard']; } }
function saveShips(s) { try { localStorage.setItem('sl_ships', JSON.stringify(s)); } catch { } }

function loadActiveShip() { try { return localStorage.getItem('sl_active_ship')||'standard'; } catch { return 'standard'; } }
function saveActiveShip(id) { try { localStorage.setItem('sl_active_ship', id); } catch { } }

let globalDiamonds = loadDiamonds();
function saveProgress(p) {
  try { localStorage.setItem('sl_progress', JSON.stringify(p)); } catch { }
}
function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem('sl_lb') || '{}'); } catch { return {}; }
}
function saveLeaderboard(lb) {
  try { localStorage.setItem('sl_lb', JSON.stringify(lb)); } catch { }
}


// ─── Feature 13: Ghost helpers ────────────────────────────────────────────────
function saveGhost(id, frames) {
  try {
    const limited = frames.slice(0, 2000);
    localStorage.setItem('sl_ghost_' + id, JSON.stringify(limited));
  } catch { }
}
function loadGhost(id) {
  try {
    const raw = localStorage.getItem('sl_ghost_' + id);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Returns Set of locked body IDs
function getLockedIds() {
  const progress = loadProgress();
  const locked = new Set();
  for (let i = 1; i < CAMPAIGN_ORDER.length; i++) {
    const prev = CAMPAIGN_ORDER[i - 1];
    if (!progress[prev]) locked.add(CAMPAIGN_ORDER[i]);
  }
  return locked;
}

function unlockBody(id) {
  const p = loadProgress();
  p[id] = true;
  saveProgress(p);
}

function updateLeaderboard(id, score) {
  const lb = loadLeaderboard();
  const isNewRecord = !lb[id] || score.total > lb[id].total;
  if (isNewRecord) {
    lb[id] = { total: score.total, time: score.time, fuel: score.fuel, stars: score.stars };
    saveLeaderboard(lb);
  }
  return isNewRecord;
}

// ─── Time scale ───────────────────────────────────────────────────────────────
let timeScale = 100000;

// ─── Result shown guard ───────────────────────────────────────────────────────
let resultShown = false;

// ─── Tooltip ─────────────────────────────────────────────────────────────────
let tooltipTimer = 0;

// ─── UI refs ─────────────────────────────────────────────────────────────────
const elHud = document.getElementById('hud');
const elBtnSolar = document.getElementById('btn-solar');
const elTimeCtrl = document.getElementById('time-ctrl');
const elSimDate = document.getElementById('sim-date');
const elCardPlanet = document.getElementById('card-planet');
const elCardResult = document.getElementById('card-result');
const elTooltip = document.getElementById('tooltip');

// ─── Canvas interactions ──────────────────────────────────────────────────────
canvas.addEventListener('click', e => {
  if (state !== S.SOLAR) return;
  const sc = screenToSolar(e.clientX, e.clientY);
  const id = solar.getBodyAt(sc.x, sc.y);
  if (!id) return;
  if (!LANDABLE.has(id)) {
    showTooltip(e.clientX, e.clientY, nonLandableMsg(id));
    return;
  }
  if (getLockedIds().has(id)) {
    const idx = CAMPAIGN_ORDER.indexOf(id);
    const prev = CAMPAIGN_ORDER[idx - 1];
    const prevName = prev ? (BODY_DATA[prev] ? BODY_DATA[prev].name : prev) : '?';
    showTooltip(e.clientX, e.clientY, `🔒 Terminez d'abord ${prevName} pour débloquer cette destination.`);
    return;
  }
  elTooltip.classList.add('hidden');
  tooltipTimer = 0;
  selectedBody = id;
  // pos en coordonnées solaires → convertir en coordonnées écran
  const solarPos = solar.getBodyScreenPos(id);
  const pos = {
    x: (solarPos.x - canvas.width / 2) * viewZoom + canvas.width / 2 + viewPanX,
    y: (solarPos.y - canvas.height / 2) * viewZoom + canvas.height / 2 + viewPanY,
  };
  zoomOX = pos.x;
  zoomOY = pos.y;
  fadeProgress = 0;
  zoomScale = 1;
  state = S.FADING;
});

let _hoverFactIdx = 0;
let _lastHovered = null;
let _factTimer = 0;

canvas.addEventListener('mousemove', e => {
  if (state !== S.SOLAR) return;
  const prev = hoveredBody;
  const hsc = screenToSolar(e.clientX, e.clientY);
  hoveredBody = solar.getBodyAt(hsc.x, hsc.y);
  canvas.style.cursor = hoveredBody ? 'pointer' : 'crosshair';

  if (hoveredBody !== prev) {
    _hoverFactIdx = 0;
    _lastHovered = hoveredBody;
    _factTimer = 0;
  }

  if (hoveredBody) {
    const dist = solar.getDistFromEarth(hoveredBody);
    const fact = solar.getFact(hoveredBody, _hoverFactIdx);
    const locked = getLockedIds().has(hoveredBody);
    const lb = loadLeaderboard();
    const best = lb[hoveredBody];
    let html = `<b>${BODY_DATA[hoveredBody] ? BODY_DATA[hoveredBody].name : hoveredBody}</b>`;
    if (dist) html += `<br>📡 Distance Terre : ${dist}`;
    if (fact) html += `<br>💡 ${fact}`;
    if (best) html += `<br>🏆 Record : ${best.total} pts`;
    if (locked) html += `<br>🔒 Terminez la planète précédente`;
    showTooltipHTML(e.clientX, e.clientY, html);
  } else {
    elTooltip.classList.add('hidden');
    tooltipTimer = 0;
  }
});

// ─── Reset Button ─────────────────────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm("Voulez-vous vraiment effacer votre progression (records, déblocages, carburant, fantômes) et recommencer à zéro ?")) {
    localStorage.clear();
    location.reload();
  }
});

// ─── Shop ────────────────────────────────────────────────────────────────────
const SHOP_CATALOG = {
  standard: { name: "Module Standard", desc: "Le modèle d'origine. Équilibré et polyvalent.", cost: 0 },
  moustique: { name: "Le Moustique", desc: "Agile, rotation v.rapide. Très peu de fuel. Parfait pour la précision extrême.", cost: 240 },
  tank: { name: "Le Tank", desc: "Lourd et blindé. Double réserve de fuel. Impose une réduction aux forces extérieures. Rotation lente.", cost: 950 },
  alien: { name: "Vaisseau Alien", desc: "Moteurs à antigravité surpuissants ! Immunité TOTALE à l'acide, aux pannes solaires et au magnétisme.", cost: 4800 }
};

const elShopCard = document.getElementById('card-shop');
document.getElementById('btn-shop').addEventListener('click', () => {
  state = S.SHOP;
  hideSolarUI();
  updateShopUI();
  elShopCard.classList.remove('hidden');
});
document.getElementById('btn-shop-close').addEventListener('click', () => {
  elShopCard.classList.add('hidden');
  state = S.SOLAR;
  showSolarUI();
});

function updateShopUI() {
  document.getElementById('shop-solde').textContent = globalDiamonds;
  const list = document.getElementById('shop-items');
  list.innerHTML = '';
  const unlocked = new Set(loadShips());
  const active = loadActiveShip();

  for (const [id, item] of Object.entries(SHOP_CATALOG)) {
    const isUnlocked = unlocked.has(id);
    const isActive = active === id;
    const canAfford = globalDiamonds >= item.cost;

    const div = document.createElement('div');
    const cl = isActive ? ' active' : (!isUnlocked ? (canAfford ? ' buyable' : ' locked') : '');
    div.className = 'shop-item' + cl;
    
    let btnHTML = '';
    if (isActive) {
      btnHTML = `<button class="btn shop-item-btn" disabled>ÉQUIPÉ</button>`;
    } else if (isUnlocked) {
      btnHTML = `<button class="btn shop-item-btn" onclick="equipShip('${id}')">SÉLECTIONNER</button>`;
    } else {
      btnHTML = `<button class="btn shop-item-btn" onclick="buyShip('${id}', ${item.cost})" ${!canAfford ? 'disabled' : ''}>${item.cost} 💎</button>`;
    }

    div.innerHTML = `
      <div class="shop-item-icon">
        <canvas id="cvs-shop-${id}" width="50" height="50"></canvas>
      </div>
      <div class="shop-item-info">
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.desc}</div>
      </div>
      <div class="shop-item-actions">${btnHTML}</div>
    `;
    list.appendChild(div);

    // Draw miniature asynchronously
    setTimeout(() => { drawShopShip(id); }, 0);
  }
}

function getShopShipPalette(id) {
  if (id === 'moustique') {
    return {
      hullLight: '#ffe6f4', hullMid: '#ff9fc9', hullDark: '#7f1f53',
      metal: '#5d3f56', trim: '#ffc7e1', glow: 'rgba(255, 142, 208, 0.24)',
      canopy: '#87f0ff', canopyGlow: 'rgba(255, 180, 230, 0.34)',
    };
  }
  if (id === 'tank') {
    return {
      hullLight: '#96a8ae', hullMid: '#4e6670', hullDark: '#162128',
      metal: '#334048', trim: '#bed6de', glow: 'rgba(121, 255, 210, 0.22)',
      canopy: '#8fe8ff', canopyGlow: 'rgba(120, 255, 210, 0.22)',
    };
  }
  if (id === 'alien') {
    return {
      hullLight: '#bffcff', hullMid: '#39d9b0', hullDark: '#035d54',
      metal: '#0a4f48', trim: '#d8fffe', glow: 'rgba(102, 255, 224, 0.24)',
      canopy: '#9afaff', canopyGlow: 'rgba(100, 255, 224, 0.28)',
    };
  }
  return {
    hullLight: '#f4f8ff', hullMid: '#aebcd8', hullDark: '#4a5b7c',
    metal: '#6e7d96', trim: '#dde8ff', glow: 'rgba(120, 223, 255, 0.22)',
    canopy: '#89d7ff', canopyGlow: 'rgba(120, 220, 255, 0.24)',
  };
}

function drawShopShip(id) {
  const c = document.getElementById('cvs-shop-' + id);
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,50,50);
  const S = 3.5; 

  let hw = 2.5, hh = 4.5;
  if (id === 'moustique') { hw = 1.8; hh = 3.2; }
  else if (id === 'tank') { hw = 3.5; hh = 4.8; }
  else if (id === 'alien') { hw = 2.8; hh = 3.5; }
  
  const pw = hw * 2 * S;
  const ph = hh * 2 * S;
  const palette = getShopShipPalette(id);
  
  ctx.save();
  ctx.translate(25, 25); 

    const hullGlow = ctx.createRadialGradient(-pw * 0.12, -ph * 0.24, 2, 0, 0, Math.max(pw, ph) * 0.95);
    hullGlow.addColorStop(0, palette.glow);
    hullGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hullGlow;
    ctx.beginPath(); ctx.arc(0, 0, Math.max(pw, ph) * 0.95, 0, Math.PI * 2); ctx.fill();

    const bodyGrad = ctx.createLinearGradient(-pw/2, -ph/2, pw/2, ph/2);
    bodyGrad.addColorStop(0, palette.hullLight);
    bodyGrad.addColorStop(0.52, palette.hullMid);
    bodyGrad.addColorStop(1, palette.hullDark);

    if (id === 'moustique') {
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
      ctx.strokeStyle = palette.trim; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(-pw/2, ph*0.1); ctx.lineTo(-pw*0.8, ph*0.6); ctx.moveTo(-pw-3, ph*0.6); ctx.lineTo(-pw*0.6, ph*0.6);
      ctx.moveTo(pw/2, ph*0.1); ctx.lineTo(pw*0.8, ph*0.6); ctx.moveTo(pw*0.6, ph*0.6); ctx.lineTo(pw+3, ph*0.6);
      ctx.stroke();
      // Window
      ctx.fillStyle = palette.canopy; ctx.beginPath(); ctx.arc(0, -ph*0.1, pw*0.15, 0, Math.PI*2); ctx.fill();
      
    } else if (id === 'tank') {
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
      ctx.strokeStyle = palette.trim; ctx.lineWidth = 2.5; ctx.beginPath();
      ctx.moveTo(-pw/2, ph*0.2); ctx.lineTo(-pw*0.8, ph*0.6); ctx.moveTo(-pw*1.1, ph*0.6); ctx.lineTo(-pw*0.5, ph*0.6);
      ctx.moveTo(pw/2, ph*0.2); ctx.lineTo(pw*0.8, ph*0.6); ctx.moveTo(pw*0.5, ph*0.6); ctx.lineTo(pw*1.1, ph*0.6);
      ctx.stroke();
      // Window (slit)
      ctx.fillStyle = palette.canopy; ctx.fillRect(-pw*0.3, -ph*0.1, pw*0.6, ph*0.1);

    } else if (id === 'alien') {
      // Saucer
      ctx.fillStyle = bodyGrad;
      ctx.beginPath(); ctx.ellipse(0, ph*0.1, pw*0.8, ph*0.25, 0, 0, Math.PI*2); ctx.fill();
      // Glass Dome
      ctx.fillStyle = palette.canopyGlow;
      ctx.beginPath(); ctx.arc(0, ph*0.1, pw*0.4, Math.PI, 0); ctx.fill();
      // Tractor beam instead of legs
      ctx.fillStyle = 'rgba(100, 255, 224, 0.18)';
      ctx.beginPath(); ctx.moveTo(-pw*0.3, ph*0.2); ctx.lineTo(pw*0.3, ph*0.2);
      ctx.lineTo(pw*0.6, ph*0.8); ctx.lineTo(-pw*0.6, ph*0.8); ctx.fill();
      // Alien pilot silhouette
      ctx.fillStyle = palette.hullDark; ctx.beginPath(); ctx.arc(0, 0, pw*0.15, Math.PI, 0); ctx.fill();
      
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

    ctx.strokeStyle = palette.trim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (id === 'alien') {
      ctx.ellipse(0, ph*0.1, pw*0.8, ph*0.25, 0, 0, Math.PI*2);
    } else if (id === 'tank') {
      ctx.moveTo(-pw/2, -ph*0.4); ctx.lineTo(pw/2, -ph*0.4);
      ctx.lineTo(pw*0.6, 0); ctx.lineTo(pw/2, ph*0.4);
      ctx.lineTo(-pw/2, ph*0.4); ctx.lineTo(-pw*0.6, 0); ctx.closePath();
    } else if (id === 'moustique') {
      ctx.moveTo(0, -ph*0.6); ctx.lineTo(pw*0.4, ph*0.2); ctx.lineTo(-pw*0.4, ph*0.2); ctx.closePath();
    } else {
      ctx.roundRect(-pw / 2, -ph / 2, pw, ph * 0.65, 4);
    }
    ctx.stroke();

  ctx.restore();
}

window.equipShip = function(id) {
  saveActiveShip(id);
  updateShopUI();
};

window.buyShip = function(id, cost) {
  if (globalDiamonds >= cost && !new Set(loadShips()).has(id)) {
    globalDiamonds -= cost;
    saveDiamonds(globalDiamonds);
    const ships = loadShips();
    ships.push(id);
    saveShips(ships);
    equipShip(id);
    document.getElementById('diamond-count').textContent = globalDiamonds;
  }
};

// ─── Secondary missions ───────────────────────────────────────────────────────
function getMissionDisplay(mission) {
  const match = (mission.label || '').match(/^(\S+)\s+(.*)$/);
  return {
    icon: match ? match[1] : '◎',
    title: match ? match[2] : (mission.label || mission.id),
    desc: mission.desc || 'Condition en cours de suivi pendant la mission.',
  };
}

function renderMissionsHUD(missions) {
  const hud = document.getElementById('missions-hud');
  const list = document.getElementById('missions-list');
  if (!hud || !list || !missions || !missions.length) return;
  list.innerHTML = missions.map(m => {
    const meta = getMissionDisplay(m);
    return `<div class="mission-row" data-id="${m.id}" data-state="pending">
      <span class="mission-status">${meta.icon}</span>
      <div class="mission-copy">
        <span class="mission-label">${meta.title}</span>
        <span class="mission-desc">${meta.desc}</span>
      </div>
      <div class="mission-side">
        <span class="mission-reward">+${m.reward} 💎</span>
        <span class="mission-state">En attente</span>
      </div>
    </div>`;
  }).join('');
  hud.classList.remove('hidden');
}

function updateMissionsHUD(missions, game) {
  if (!missions || !game) return;
  const score = game.getScore ? game.getScore() : null;
  const landed = !!(game.result && game.result.type === 'land');
  missions.forEach(m => {
    const row = document.querySelector(`.mission-row[data-id="${m.id}"]`);
    if (!row) return;
    const ready = !!(score && m.check(score, game));
    const unlocked = landed && ready;
    const meta = getMissionDisplay(m);
    const state = unlocked ? 'complete' : ready ? 'ready' : 'pending';
    row.dataset.state = state;
    row.querySelector('.mission-status').textContent = unlocked ? '✔' : meta.icon;
    row.querySelector('.mission-state').textContent =
      unlocked ? 'Débloqué' : ready ? 'Prêt à valider' : 'En attente';
  });
}

function evaluateMissions(missions, game, score) {
  if (!missions || !game || !game.result || game.result.type !== 'land') return 0;
  let bonus = 0;
  missions.forEach(m => {
    if (m.check(score, game)) bonus += m.reward;
  });
  return bonus;
}

// ─── Planet card ─────────────────────────────────────────────────────────────
document.getElementById('btn-launch').addEventListener('click', startGame);
document.getElementById('btn-back').addEventListener('click', () => {
  elCardPlanet.classList.add('hidden');
  state = S.SOLAR;
  showSolarUI();
});

// ─── Result card ─────────────────────────────────────────────────────────────
document.getElementById('btn-retry').addEventListener('click', () => {
  elCardResult.classList.add('hidden');
  startGame();
});
document.getElementById('btn-to-solar').addEventListener('click', returnToSolar);
elBtnSolar.addEventListener('click', returnToSolar);

// ─── State helpers ────────────────────────────────────────────────────────────
function showSolarUI() {
  elTimeCtrl.style.display = '';
  document.getElementById('solar-top-right').style.display = '';
  document.getElementById('solar-top-left').style.display = '';
  document.getElementById('diamond-count').textContent = globalDiamonds;
  elBtnSolar.classList.add('hidden');
  elHud.classList.add('hidden');
  
  updateTimeCtrlVisibility();
}

function hideSolarUI() {
  elTimeCtrl.style.display = 'none';
  document.getElementById('solar-top-right').style.display = 'none';
  document.getElementById('solar-top-left').style.display = 'none';
  resetViewZoom();
}

function returnToSolar() {
  elCardResult.classList.add('hidden');
  elCardPlanet.classList.add('hidden');
  elHud.classList.add('hidden');
  
  elBtnSolar.classList.add('hidden');
  document.getElementById('touch-controls').classList.add('hidden');
  document.getElementById('missions-hud').classList.add('hidden');
  replayFrames = null;
  game = null;
  state = S.SOLAR;
  showSolarUI();
}

function startGame() {
  resultShown = false;
  elCardPlanet.classList.add('hidden');
  elCardResult.classList.add('hidden');
  if (!selectedBody) return;

  game = new LanderGame(selectedBody, canvas.width, canvas.height);
  applyUpgrades(game, loadActiveShip());

  // Feature 13: load ghost for this body
  const ghostFrames = loadGhost(selectedBody);
  if (ghostFrames) game.setGhost(ghostFrames);

  const cfg = BODY_DATA[selectedBody];
  document.getElementById('hud-planet-name').textContent = cfg.name.toUpperCase();
  document.getElementById('wind-row').style.display = cfg.windType !== 'none' ? '' : 'none';
  document.getElementById('storm-warn').style.display = 'none';

  elHud.classList.remove('hidden');
  
  elBtnSolar.classList.add('hidden');
  if (IS_TOUCH) document.getElementById('touch-controls').classList.remove('hidden');

  // Assign 2 random secondary missions for this run
  const missionSeed = Date.now() ^ (selectedBody.split('').reduce((a,c) => a + c.charCodeAt(0), 0));
  game.missions = pickMissions(selectedBody, missionSeed);
  renderMissionsHUD(game.missions);
  updateMissionsHUD(game.missions, game);

  // Survey phase: camera pans to show pad before countdown
  surveyTimer = 0;
  game.camX = game.lander.x;
  game.camY = game.lander.y - (game.canvasH / game.SCALE) * 0.33;
  state = S.SURVEY;
}

// ─── Planet card population ───────────────────────────────────────────────────
function showPlanetCard(id) {
  const cfg = BODY_DATA[id];
  document.getElementById('card-emoji').textContent = cfg.emoji;
  document.getElementById('card-name').textContent = cfg.name;
  document.getElementById('card-desc').textContent = cfg.desc;

  const starsEl = document.getElementById('card-stars');
  starsEl.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement('span');
    s.textContent = '★';
    s.className = i <= cfg.stars ? 'star-filled' : 'star-empty';
    starsEl.appendChild(s);
  }

  // Feature 6: personal record in planet card
  const lb = loadLeaderboard();
  const best = lb[id];
  let condHTML = cfg.conditions.map(c => `<div class="cond-row"><span class="ci">${c.ci}</span><span>${c.txt}</span></div>`).join('');
  if (best) {
    const starStr = '★'.repeat(best.stars || 0) + '☆'.repeat(3 - (best.stars || 0));
    condHTML = `<div class="cond-row cond-row--record"><span class="ci">🏆</span><span>Meilleur score: ${best.total} pts (${starStr})</span></div>` + condHTML;
  }
  document.getElementById('card-conditions').innerHTML = condHTML;

  elCardPlanet.classList.remove('hidden');
}

// ─── Result card population ───────────────────────────────────────────────────
function showResultCard(success, score, reason) {
  const titleEl = document.getElementById('res-title');
  titleEl.textContent = success ? 'ATTERRISSAGE RÉUSSI !' : 'MISSION ÉCHOUÉE';
  titleEl.classList.toggle('result-success', success);
  titleEl.classList.toggle('result-fail', !success);
  document.getElementById('res-emoji').textContent = success ? '🎉' : '💥';

  const mm = String(Math.floor(score.time / 60)).padStart(2, '0');
  const ss = String(Math.floor(score.time % 60)).padStart(2, '0');
  const fuelMax = game && game.lander ? (game.lander.fuelMax || BODY_DATA[selectedBody].startFuel) : BODY_DATA[selectedBody].startFuel;
  const fpct = ((score.fuel / fuelMax) * 100).toFixed(0);

  const reasonRow = (!success && reason)
    ? `<div class="stat-row stat-row-danger"><span class="stat-lbl">Cause</span><span class="stat-val">${reason}</span></div>`
    : '';

  const lb = loadLeaderboard();
  const best = lb[selectedBody];
  const bestRow = (success && best && best.total >= (score.total || 0))
    ? `<div class="stat-row"><span class="stat-lbl">🏆 Meilleur</span><span class="stat-val stat-val-gold">${best.total} pts</span></div>`
    : '';

  // Feature 2: precision row
  const precisionRow = (success && score.precisionBonus !== undefined)
    ? `<div class="stat-row"><span class="stat-lbl">Précision</span><span class="stat-val">+${score.precisionBonus} pts</span></div>`
    : '';

  const baseRewards = [10, 20, 50, 80, 150];
  const st = BODY_DATA[selectedBody] ? BODY_DATA[selectedBody].stars : 1;
  let earned = baseRewards[st - 1] || 10;
  if (score.precisionBonus && score.precisionBonus >= 200) earned += 15;
  const missionBonus = score._missionBonus || 0;
  const missionRows = (success && game && game.missions && game.missions.length) ?
    game.missions.map(m => {
      const done = m.check(score, game);
      return `<div class="stat-row stat-row-mission ${done ? 'is-done' : ''}"><span class="stat-lbl">${done?'✔':'○'} ${m.label.replace(/^[^\s]+\s/,'')}</span><span class="stat-val">${done?'+'+m.reward+'💎':'—'}</span></div>`;
    }).join('') : '';
  const diamRow = success ? `<div class="stat-row stat-row-reward"><span class="stat-lbl">💎 Récompense</span><span class="stat-val">+${earned}${missionBonus>0?' (dont +'+missionBonus+' missions)':''}</span></div>` : '';

  document.getElementById('res-stats').innerHTML = `
    ${reasonRow}
    <div class="stat-row"><span class="stat-lbl">Temps</span><span class="stat-val">${mm}:${ss}</span></div>
    <div class="stat-row"><span class="stat-lbl">Carburant restant</span><span class="stat-val">${fpct}%</span></div>
    ${precisionRow}
    <div class="stat-row"><span class="stat-lbl">Score</span><span class="stat-val">${success ? score.total : 0} pts</span></div>
    ${bestRow}
    ${missionRows}
    ${diamRow}
  `;

  const starsEl = document.getElementById('res-stars');
  starsEl.innerHTML = '';
  if (success) {
    for (let i = 1; i <= 3; i++) {
      const s = document.createElement('span');
      s.textContent = '★';
      s.className = i <= score.stars ? 'star-filled' : 'star-empty';
      s.style.fontSize = '28px';
      starsEl.appendChild(s);
    }
  }

  elCardResult.classList.remove('hidden');
  elBtnSolar.classList.remove('hidden');
  elHud.classList.add('hidden');
  
  document.getElementById('missions-hud').classList.add('hidden');
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function showTooltip(x, y, msg) {
  elTooltip.textContent = msg;
  elTooltip.style.left = (x + 14) + 'px';
  elTooltip.style.top = (y - 36) + 'px';
  elTooltip.classList.remove('hidden');
  tooltipTimer = 2.8;
}

function showTooltipHTML(x, y, html) {
  elTooltip.innerHTML = html;
  elTooltip.style.left = Math.min(x + 14, window.innerWidth - 260) + 'px';
  elTooltip.style.top = (y - 36) + 'px';
  elTooltip.classList.remove('hidden');
  tooltipTimer = 0; // persistent while hovered
}

function nonLandableMsg(id) {
  const m = {
    jupiter: "Jupiter est une géante gazeuse — pas de surface solide !",
    saturn: "Saturne est une géante gazeuse. Cliquez sur Titan pour atterrir.",
    uranus: "Uranus est une géante de glace — pas d'atterrissage possible.",
    neptune: "Neptune est une géante de glace — pas d'atterrissage possible.",
  };
  return m[id] || "Corps non atterrissable.";
}

// ─── Easing ───────────────────────────────────────────────────────────────────
function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

// ─── HUD update ───────────────────────────────────────────────────────────────
function updateHUD() {
  if (!game) return;
  const l = game.lander;
  const cfg = game.cfg;

  // Timer
  const mm = String(Math.floor(game.elapsed / 60)).padStart(2, '0');
  const ss = String(Math.floor(game.elapsed % 60)).padStart(2, '0');
  document.getElementById('hud-timer').textContent = mm + ':' + ss;

  // Altitude
  const alt = Math.max(0, l.y - game.terrain.heightAt(l.x) - l.hh);
  document.getElementById('v-alt').textContent = alt.toFixed(0) + ' m';

  // Speeds with color
  const vs = Math.max(0, -l.vy);
  const hs = Math.abs(l.vx);
  const ang = Math.abs(l.angle);
  const color = (v, max) => v > max ? 'danger' : v > max * 0.65 ? 'warn' : 'safe';

  const vsEl = document.getElementById('v-vs');
  const hsEl = document.getElementById('v-hs');
  const angEl = document.getElementById('v-ang');
  if (vsEl) { vsEl.textContent = vs.toFixed(1); vsEl.className = 'hval ' + color(vs, cfg.maxVSpeed); }
  if (hsEl) { hsEl.textContent = hs.toFixed(1); hsEl.className = 'hval ' + color(hs, cfg.maxHSpeed); }
  if (angEl) { angEl.textContent = ang.toFixed(1); angEl.className = 'hval ' + color(ang, cfg.maxAngle); }

  // Fuel
  const fpct = Math.max(0, Math.min(100, l.fuel / (l.fuelMax || cfg.startFuel) * 100));
  const fuelBarEl = document.getElementById('fuel-bar');
  const fuelTxtEl = document.getElementById('v-fuel');
  if (fuelBarEl) fuelBarEl.style.setProperty('--fuel-pct', fpct.toFixed(1) + '%');
  if (fuelTxtEl) fuelTxtEl.textContent = fpct.toFixed(0) + '%';

  // Wind
  const windEl = document.getElementById('v-wind');
  const stormEl = document.getElementById('storm-warn');
  if (windEl && cfg.windType !== 'none') {
    const ws = game.wind.getDisplaySpeed();
    const wdir = game.wind.current >= 0 ? '→' : '←';
    windEl.textContent = wdir + ' ' + ws.toFixed(1) + ' m/s';
  }
  if (stormEl) stormEl.style.display = game.wind.isStorming() ? '' : 'none';

  // Personal best
  const bestEl = document.getElementById('v-best');
  const bestRow = document.getElementById('best-row');
  if (bestEl && bestRow && selectedBody) {
    const lb = loadLeaderboard();
    const best = lb[selectedBody];
    if (best) {
      bestEl.textContent = best.total + ' pts';
      bestRow.style.display = '';
    } else {
      bestRow.style.display = 'none';
    }
  }
}

// ─── Error overlay ───────────────────────────────────────────────────────────
function showError(msg) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f44';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ERREUR JS :', canvas.width / 2, canvas.height / 2 - 20);
  ctx.fillStyle = '#faa';
  ctx.font = '13px monospace';
  ctx.fillText(String(msg).slice(0, 120), canvas.width / 2, canvas.height / 2 + 10);
  ctx.fillStyle = '#888';
  ctx.font = '11px monospace';
  ctx.fillText('Ouvre la console (F12) pour plus de détails', canvas.width / 2, canvas.height / 2 + 36);
}

// ─── Main loop ────────────────────────────────────────────────────────────────
let lastTime = 0;

function loop(ts) {
  // requestAnimationFrame EN PREMIER — la boucle continue même si une erreur survient
  requestAnimationFrame(loop);

  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  try {
    // ── Update ────────────────────────────────────────────────────────────
    if (state === S.SOLAR) {
      solar.update(dt * timeScale);
      if (elSimDate) elSimDate.textContent = solar.getSimDate();
      if (tooltipTimer > 0) {
        tooltipTimer -= dt;
        if (tooltipTimer <= 0) elTooltip.classList.add('hidden');
      }
      // Rotate fun fact every 3s while hovering
      if (hoveredBody) {
        _factTimer += dt;
        if (_factTimer >= 3) {
          _factTimer = 0;
          _hoverFactIdx++;
        }
      }

    } else if (state === S.FADING) {
      fadeProgress = Math.min(1, fadeProgress + dt / FADE_DUR);
      zoomScale = 1 + easeInOut(fadeProgress) * 22;
      if (fadeProgress >= 1) {
        state = S.SELECT;
        hideSolarUI();
        showPlanetCard(selectedBody);
      }

    } else if (state === S.SURVEY && game) {
      // Survey: physics frozen, camera pans to show the landing pad
      surveyTimer += dt;
      if (surveyTimer >= SURVEY_DUR) {
        countdownTimer = 3;
        state = S.COUNTDOWN;
      }

    } else if (state === S.COUNTDOWN && game) {
      // Feature 4: countdown — game initialized but no controls
      game.update(dt);  // update physics (gravity etc) but input stays empty
      countdownTimer -= dt;
      if (countdownTimer <= 0) {
        state = S.PLAYING;
      }

    } else if (state === S.PLAYING && game) {
      game.input = { ...keys };
      game.update(dt);
      updateHUD();
      updateMissionsHUD(game.missions, game);

      if (game.result && !resultShown && game.resultDelay > (game.result.type === 'crash' ? 1.4 : 4.5)) {
        resultShown = true;
        const score = game.getScore();
        if (game.result.type === 'land') {
          unlockBody(selectedBody);

          const baseRewards = [10, 20, 50, 80, 150];
          const st = BODY_DATA[selectedBody].stars || 1;
          let earned = baseRewards[st - 1] || 10;
          if (score.precisionBonus && score.precisionBonus >= 200) earned += 15;
          // Mission secondaires bonus
          const missionBonus = evaluateMissions(game.missions, game, score);
          earned += missionBonus;
          score._missionBonus = missionBonus;
          globalDiamonds += earned;
          saveDiamonds(globalDiamonds);
          document.getElementById('diamond-count').textContent = globalDiamonds;

          // Save ghost only on successful landings with new best score
          const isNewRecord = updateLeaderboard(selectedBody, score);
          if (isNewRecord) {
            saveGhost(selectedBody, game.getRecording());
          }
        }
        // Les crashes ne mettent jamais le leaderboard à jour
        showResultCard(game.result.type === 'land', score, game.result.reason);
        if (game.result.type === 'land') {
          checkVenusBoss(score);
          checkAchievements(score, game);
          const ghost = loadGhost(selectedBody);
          if (ghost) startReplay(ghost, game);
        }
        state = S.RESULT;
      }

    } else if (state === S.RESULT && game) {
      game.update(dt);
    }

    // ── Draw ──────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state === S.SOLAR) {
      ctx.save();
      applySolarTransform(ctx);
      solar.draw(ctx, dt, hoveredBody, getLockedIds(), null, loadLeaderboard());
      ctx.restore();

    } else if (state === S.FADING) {
      const t = easeInOut(fadeProgress);
      ctx.save();
      ctx.translate(zoomOX, zoomOY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-zoomOX, -zoomOY);
      solar.draw(ctx, 0, null);
      ctx.restore();
      if (t > 0.5) {
        ctx.fillStyle = `rgba(0,0,6,${((t - 0.5) / 0.5).toFixed(3)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

    } else if (state === S.SELECT) {
      ctx.fillStyle = '#000008';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      solar.draw(ctx, 0, null);
      ctx.fillStyle = 'rgba(0,0,8,0.65)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

    } else if (state === S.SURVEY && game) {
      // Camera pans from lander spawn → pad → back
      const st = Math.min(1, surveyTimer / SURVEY_DUR);
      let u = st < 0.35 ? st / 0.35 : st < 0.65 ? 1 : (1 - st) / 0.35;
      u = u * u * (3 - 2 * u); // smoothstep
      const lx = game.lander.x;
      const ly = game.lander.y - (game.canvasH / game.SCALE) * 0.33;
      const px = game.terrain.padCenter;
      const py = game.terrain.padHeight + (game.canvasH / game.SCALE) * 0.28;
      game.camX = lx + (px - lx) * u;
      game.camY = ly + (py - ly) * u;
      game.draw(ctx);
      // Overlay text
      const fadeA = st < 0.15 ? st / 0.15 : st > 0.82 ? (1 - st) / 0.18 : 1;
      ctx.save();
      ctx.globalAlpha = fadeA * 0.92;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,210,255,0.95)';
      ctx.font = '15px "Share Tech Mono", monospace';
      ctx.fillText('◉  RECONNAISSANCE DE ZONE  ◉', canvas.width / 2, canvas.height / 2 - 14);
      ctx.fillStyle = 'rgba(0,255,136,0.75)';
      ctx.font = '11px "Share Tech Mono", monospace';
      ctx.fillText('Zone d\'atterrissage repérée — atterrissage imminent', canvas.width / 2, canvas.height / 2 + 10);
      ctx.restore();

    } else if (state === S.COUNTDOWN && game) {
      // Draw game scene + countdown overlay
      game.draw(ctx);
      const num = Math.ceil(countdownTimer);
      ctx.save();
      ctx.font = 'bold 120px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 40;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText(String(num), canvas.width / 2, canvas.height / 2);
      ctx.shadowBlur = 0;
      ctx.restore();

    } else if (state === S.PLAYING || state === S.RESULT) {
      if (game) {
        game.draw(ctx);
        drawReplayOverlay(ctx, canvas.width, canvas.height);
      }
    }

  } catch (err) {
    console.error('Game loop error:', err);
    showError(err.message || err);
  }
}

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  resizeCanvas();
  solar.resize(canvas.width, canvas.height);
  if (game) { game.canvasW = canvas.width; game.canvasH = canvas.height; }
});

// ─── Boss Vénus ───────────────────────────────────────────────────────────────
let _venusBossShown = false;

function checkVenusBoss(score) {
  if (selectedBody !== 'venus') return;
  const lb = loadLeaderboard();
  // Boss unlock: first successful venus landing
  if (!lb['venus'] || lb['venus'].total < score.total) {
    if (!_venusBossShown) {
      _venusBossShown = true;
      setTimeout(() => showBossVictory(), 500);
    }
  }
}

function showBossVictory() {
  const el = document.getElementById('boss-overlay');
  if (!el) return;
  el.classList.remove('hidden');
  // Bonus diamonds for venus boss
  const bonus = 500;
  globalDiamonds += bonus;
  saveDiamonds(globalDiamonds);
  document.getElementById('diamond-count').textContent = globalDiamonds;
  el.querySelector('#boss-reward').textContent = '+500 💎 — Conquérant de Vénus !';
  document.getElementById('btn-boss-close').onclick = () => el.classList.add('hidden');
}

// ─── Achievements ─────────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id:'first_land',    label:'🚀 Premier Atterrissage',    desc:'Réussir un premier atterrissage.',          check: (lb) => Object.keys(lb).length >= 1 },
  { id:'all_planets',   label:'🌌 Grand Tour',              desc:'Atterrir sur toutes les planètes.',         check: (lb) => CAMPAIGN_ORDER.every(id => lb[id]) },
  { id:'perfect',       label:'⭐ Pilote Parfait',          desc:'Obtenir 3★ sur n\'importe quelle planète.', check: (lb) => Object.values(lb).some(e => e.stars >= 3) },
  { id:'speed_moon',    label:'⏱ Véloce',                  desc:'Atterrir sur la Lune en moins de 20s.',     check: (lb) => lb['moon'] && lb['moon'].time <= 20 },
  { id:'full_fuel',     label:'⛽ Économe',                 desc:'Atterrir avec >90% de carburant.',          check: (_lb, s, g) => s && g && s.fuel / g.lander.fuelMax > 0.90 },
  { id:'venus_clear',   label:'🔥 Conquérant de Vénus',    desc:'Atterrir sur Vénus.',                       check: (lb) => !!lb['venus'] },
  { id:'pluto_clear',   label:'❄ Aux Confins',             desc:'Atterrir sur Pluton.',                      check: (lb) => !!lb['pluto'] },
  { id:'no_retro',      label:'🚫 Pure Poussée',            desc:'Atterrir sans rétrofusées.',                check: (_lb, _s, g) => g && !g._usedRetro },
  { id:'survive3',      label:'💪 Survivant',               desc:'Survivre à 3 hazards en une partie.',       check: (_lb, _s, g) => g && g._hazardCount >= 3 },
  { id:'mission_bonus', label:'🎯 Sur-Achiever',            desc:'Compléter 2 missions secondaires.',         check: (_lb, s) => s && s._missionBonus >= 40 },
];

function loadAchievements() { try { return JSON.parse(localStorage.getItem('sl_ach') || '[]'); } catch { return []; } }
function saveAchievements(a) { try { localStorage.setItem('sl_ach', JSON.stringify(a)); } catch {} }

function checkAchievements(score, game) {
  const unlocked = new Set(loadAchievements());
  const lb = loadLeaderboard();
  const newOnes = [];
  for (const ach of ACHIEVEMENTS) {
    if (unlocked.has(ach.id)) continue;
    try {
      if (ach.check(lb, score, game)) {
        unlocked.add(ach.id);
        newOnes.push(ach);
      }
    } catch {}
  }
  if (newOnes.length) {
    saveAchievements([...unlocked]);
    newOnes.forEach((a, i) => setTimeout(() => showAchievementPopup(a), 600 + i * 1800));
  }
}

function showAchievementPopup(ach) {
  const el = document.getElementById('ach-popup');
  if (!el) return;
  el.querySelector('#ach-label').textContent = ach.label;
  el.querySelector('#ach-desc').textContent = ach.desc;
  el.classList.remove('hidden');
  el.classList.add('ach-slide-in');
  setTimeout(() => {
    el.classList.remove('ach-slide-in');
    el.classList.add('ach-slide-out');
    setTimeout(() => { el.classList.add('hidden'); el.classList.remove('ach-slide-out'); }, 600);
  }, 3000);
}

function renderAchievementsModal() {
  const unlocked = new Set(loadAchievements());
  const list = document.getElementById('ach-list');
  if (!list) return;
  list.innerHTML = ACHIEVEMENTS.map(a => {
    const done = unlocked.has(a.id);
    return `<div class="ach-item ${done ? 'done' : 'locked'}">
      <span class="ach-icon">${done ? '✔' : '🔒'}</span>
      <div><div class="ach-name">${a.label}</div><div class="ach-desc-small">${a.desc}</div></div>
    </div>`;
  }).join('');
}

// ─── Upgrades / Skill tree ────────────────────────────────────────────────────
const UPGRADE_CATALOG = {
  thrust:    { name:'🔥 Propulseur +',  desc:'Poussée +15%. Le vaisseau répond plus vite et monte plus fort.',       cost: 60,  max: 3 },
  fuel_cap:  { name:'⛽ Réservoir +',   desc:'Capacité carburant +20%. Vous partez avec plus de temps devant vous.',  cost: 50,  max: 3 },
  gyro:      { name:'🌀 Gyroscope +',   desc:'Rotation +20% plus rapide. Corrections plus précises.',                cost: 45,  max: 3 },
  rcs:       { name:'🛡 Stabilisateur', desc:'Friction angulaire ×1.5. Le vaisseau se stabilise seul plus vite.',    cost: 55,  max: 2 },
  retro:     { name:'💨 Rétro +',       desc:'Puissance rétrofusées +25%. Décélération plus efficace.',              cost: 50,  max: 2 },
};

function loadUpgrades() { try { return JSON.parse(localStorage.getItem('sl_upgrades') || '{}'); } catch { return {}; } }
function saveUpgrades(u) { try { localStorage.setItem('sl_upgrades', JSON.stringify(u)); } catch {} }

function getUpgradeLevel(shipId, upId) {
  const u = loadUpgrades();
  return (u[shipId] && u[shipId][upId]) || 0;
}

function buyUpgrade(shipId, upId) {
  const u = loadUpgrades();
  if (!u[shipId]) u[shipId] = {};
  const cur = u[shipId][upId] || 0;
  const cat = UPGRADE_CATALOG[upId];
  if (!cat || cur >= cat.max) return false;
  const cost = cat.cost + cur * 20;
  if (globalDiamonds < cost) return false;
  globalDiamonds -= cost;
  saveDiamonds(globalDiamonds);
  u[shipId][upId] = cur + 1;
  saveUpgrades(u);
  return true;
}

// Apply upgrades to lander at construction (called from startGame)
function applyUpgrades(game, shipId) {
  const u = loadUpgrades()[shipId] || {};
  const l = game.lander;
  const thrustLvl  = u['thrust']   || 0;
  const fuelLvl    = u['fuel_cap'] || 0;
  const gyroLvl    = u['gyro']     || 0;
  const rcsLvl     = u['rcs']      || 0;
  const retroLvl   = u['retro']    || 0;

  l._thrustBonus  = 1 + thrustLvl * 0.15;
  l._fuelCapBonus = 1 + fuelLvl   * 0.20;
  l._gyroBonus    = 1 + gyroLvl   * 0.20;
  l._rcsBonus     = 1 + rcsLvl    * 0.5;   // extra friction
  l._retroBonus   = 1 + retroLvl  * 0.25;

  // Apply fuel cap bonus immediately
  if (fuelLvl > 0) {
    l.fuel    *= l._fuelCapBonus;
    l.fuelMax *= l._fuelCapBonus;
  }
}

function renderUpgradeUI(shipId) {
  const u = loadUpgrades()[shipId] || {};
  const list = document.getElementById('upgrade-list');
  if (!list) return;
  list.innerHTML = '';
  document.getElementById('upgrade-ship-name').textContent =
    ({ standard:'Module Standard', moustique:'Le Moustique', tank:'Le Tank', alien:'Vaisseau Alien' })[shipId] || shipId;

  for (const [upId, cat] of Object.entries(UPGRADE_CATALOG)) {
    const cur = u[upId] || 0;
    const cost = cat.cost + cur * 20;
    const maxed = cur >= cat.max;
    const canAfford = globalDiamonds >= cost;
    const div = document.createElement('div');
    div.className = 'upgrade-item' + (maxed ? ' maxed' : canAfford ? ' buyable' : ' locked');
    const pips = Array.from({length: cat.max}, (_, i) =>
      `<span class="upg-pip ${i < cur ? 'filled' : ''}"></span>`).join('');
    div.innerHTML = `
      <div class="upg-info">
        <div class="upg-name">${cat.name} ${pips}</div>
        <div class="upg-desc">${cat.desc}</div>
      </div>
      <button class="upg-btn" ${maxed || !canAfford ? 'disabled' : ''} onclick="doBuyUpgrade('${shipId}','${upId}')">
        ${maxed ? 'MAX' : canAfford ? cost+'💎' : cost+'💎'}
      </button>`;
    list.appendChild(div);
  }
  document.getElementById('upgrade-diamonds').textContent = globalDiamonds;
}

window.doBuyUpgrade = function(shipId, upId) {
  if (buyUpgrade(shipId, upId)) {
    document.getElementById('diamond-count').textContent = globalDiamonds;
    renderUpgradeUI(shipId);
  }
};

// ─── Challenge du jour ────────────────────────────────────────────────────────
function getDailyKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function getDailyChallenge() {
  const key = getDailyKey();
  const hash = key.split('').reduce((a,c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  const idx = Math.abs(hash) % CAMPAIGN_ORDER.length;
  const bodyId = CAMPAIGN_ORDER[idx];
  const seed = Math.abs(hash * 7 + 13) % 999999;
  return { bodyId, seed, key };
}

function loadDailyScore() {
  try { return JSON.parse(localStorage.getItem('sl_daily_' + getDailyKey()) || 'null'); } catch { return null; }
}
function saveDailyScore(score) {
  try { localStorage.setItem('sl_daily_' + getDailyKey(), JSON.stringify(score)); } catch {} }

let dailyMode = false;

function startDailyChallenge() {
  const ch = getDailyChallenge();
  if (!BODY_DATA[ch.bodyId]) return;
  dailyMode = true;
  selectedBody = ch.bodyId;
  elTooltip.classList.add('hidden');
  const solarPos = solar.getBodyScreenPos(ch.bodyId);
  const pos = {
    x: (solarPos.x - canvas.width/2) * viewZoom + canvas.width/2 + viewPanX,
    y: (solarPos.y - canvas.height/2) * viewZoom + canvas.height/2 + viewPanY,
  };
  zoomOX = pos.x; zoomOY = pos.y;
  fadeProgress = 0; zoomScale = 1;
  state = S.FADING;
}

// ─── Replay ───────────────────────────────────────────────────────────────────
let replayFrames = null;
let replayIdx = 0;
let replayTimer = 0;
const REPLAY_FRAME_DT = 0.05;

function startReplay(frames, game) {
  replayFrames = frames;
  replayIdx = 0;
  replayTimer = 0;
  // Pass terrain/config from game to replayGame
  window._replayGame = game;
}

function drawReplayOverlay(_ctx, _W, _H) {}

// ─── Daily / Achievements / Upgrades buttons ──────────────────────────────────
document.getElementById('btn-daily').addEventListener('click', startDailyChallenge);
document.getElementById('btn-achievements').addEventListener('click', () => {
  renderAchievementsModal();
  document.getElementById('card-achievements').classList.remove('hidden');
});
document.getElementById('btn-ach-close').addEventListener('click', () => {
  document.getElementById('card-achievements').classList.add('hidden');
});
document.getElementById('btn-upgrades').addEventListener('click', () => {
  renderUpgradeUI(loadActiveShip());
  document.getElementById('card-upgrades').classList.remove('hidden');
});
document.getElementById('btn-upgrades-close').addEventListener('click', () => {
  document.getElementById('card-upgrades').classList.add('hidden');
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
showSolarUI();
requestAnimationFrame(loop);
