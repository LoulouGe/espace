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
const S = { SOLAR: 'solar', FADING: 'fading', SELECT: 'select', PLAYING: 'playing', RESULT: 'result', COUNTDOWN: 'countdown', SHOP: 'shop' };
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

// ─── Countdown state ─────────────────────────────────────────────────────────
let countdownTimer = 0;

// ─── Campaign & Leaderboard ───────────────────────────────────────────────────
const CAMPAIGN_ORDER = ['moon', 'mercury', 'mars', 'titan', 'earth', 'venus'];

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

// ─── Feature 1: Global Fuel ───────────────────────────────────────────────────
function loadGlobalFuel() {
  try { return parseFloat(localStorage.getItem('sl_fuel') || '100'); } catch { return 100; }
}
function saveGlobalFuel(v) {
  try { localStorage.setItem('sl_fuel', String(Math.max(0, Math.min(100, v)))); } catch { }
}

let globalFuel = loadGlobalFuel();

// Returns fuelInfo object {id: pct} for all landable bodies (same global fuel for simplicity)
function getFuelInfo() {
  const info = {};
  for (const id of LANDABLE) {
    info[id] = globalFuel;
  }
  return info;
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
const elCtrl = document.getElementById('controls-bar');
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
  moustique: { name: "Le Moustique", desc: "Agile, rotation v.rapide. Très peu de fuel. Parfait pour la précision extrême.", cost: 115 },
  tank: { name: "Le Tank", desc: "Lourd et blindé. Double réserve de fuel. Impose une réduction aux forces extérieures. Rotation lente.", cost: 315 },
  alien: { name: "Vaisseau Alien", desc: "Moteurs à antigravité surpuissants ! Immunité TOTALE à l'acide, aux pannes solaires et au magnétisme.", cost: 685 }
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
      btnHTML = `<button class="btn shop-item-btn" disabled style="opacity:0.6;">ÉQUIPÉ</button>`;
    } else if (isUnlocked) {
      btnHTML = `<button class="btn shop-item-btn" onclick="equipShip('${id}')">SÉLECTIONNER</button>`;
    } else {
      btnHTML = `<button class="btn shop-item-btn" onclick="buyShip('${id}', ${item.cost})" ${!canAfford ? 'disabled' : ''}>${item.cost} 💎</button>`;
    }

    div.innerHTML = `
      <div class="shop-item-icon" style="width:56px; height:56px; flex-shrink:0; background:rgba(0,0,0,0.5); border-radius:8px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(0,255,255,0.2);">
        <canvas id="cvs-shop-${id}" width="50" height="50"></canvas>
      </div>
      <div class="shop-item-info" style="margin-left:12px; display:flex; flex-direction:column; justify-content:center;">
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.desc}</div>
      </div>
      <div>${btnHTML}</div>
    `;
    list.appendChild(div);

    // Draw miniature asynchronously
    setTimeout(() => { drawShopShip(id); }, 0);
  }
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
  
  ctx.save();
  ctx.translate(25, 25); 

  const bodyGrad = ctx.createLinearGradient(-pw/2, -ph/2, pw/2, ph/2);
  if (id === 'moustique') {
    bodyGrad.addColorStop(0, '#fde'); bodyGrad.addColorStop(0.5, '#e8a'); bodyGrad.addColorStop(1, '#a25');
  } else if (id === 'tank') {
    bodyGrad.addColorStop(0, '#566'); bodyGrad.addColorStop(0.5, '#344'); bodyGrad.addColorStop(1, '#122');
  } else if (id === 'alien') {
    bodyGrad.addColorStop(0, '#aff'); bodyGrad.addColorStop(0.5, '#0fa'); bodyGrad.addColorStop(1, '#055');
  } else {
    bodyGrad.addColorStop(0, '#dde'); bodyGrad.addColorStop(0.5, '#bbc'); bodyGrad.addColorStop(1, '#88a');
  }

  // Draw hull
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-pw/2, -ph/2, pw, ph * 0.65, 4);
  ctx.fill();

  // Draw engine
  ctx.fillStyle = '#445';
  ctx.beginPath();
  const ey = ph/2 - 1.5;
  const wBottom = pw * 0.4;
  ctx.moveTo(-wBottom, ey);
  ctx.lineTo(wBottom, ey);
  ctx.lineTo(pw * 0.5, ey + ph * 0.35);
  ctx.lineTo(-pw * 0.5, ey + ph * 0.35);
  ctx.fill();

  // Draw legs
  ctx.strokeStyle = '#99a'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-pw/2, 0); ctx.lineTo(-pw * 0.9, ph * 0.7); ctx.lineTo(-pw, ph * 0.7);
  ctx.moveTo(pw/2, 0); ctx.lineTo(pw * 0.9, ph * 0.7); ctx.lineTo(pw, ph * 0.7);
  ctx.stroke();

  // Draw window
  const wx = 0, wy = -ph * 0.15, wr = pw * 0.25;
  ctx.fillStyle = '#112'; ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#0cf'; ctx.lineWidth = 1; ctx.stroke();

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
  document.getElementById('diamond-count').textContent = globalDiamonds;
  elBtnSolar.classList.add('hidden');
  elHud.classList.add('hidden');
  elCtrl.classList.add('hidden');
  updateTimeCtrlVisibility();
}

function hideSolarUI() {
  elTimeCtrl.style.display = 'none';
  document.getElementById('solar-top-right').style.display = 'none';
  resetViewZoom();
}

function returnToSolar() {
  elCardResult.classList.add('hidden');
  elCardPlanet.classList.add('hidden');
  elHud.classList.add('hidden');
  elCtrl.classList.add('hidden');
  elBtnSolar.classList.add('hidden');
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

  // Feature 13: load ghost for this body
  const ghostFrames = loadGhost(selectedBody);
  if (ghostFrames) game.setGhost(ghostFrames);

  const cfg = BODY_DATA[selectedBody];
  document.getElementById('hud-planet-name').textContent = cfg.name.toUpperCase();
  document.getElementById('wind-row').style.display = cfg.windType !== 'none' ? '' : 'none';
  document.getElementById('storm-warn').style.display = 'none';

  elHud.classList.remove('hidden');
  elCtrl.classList.remove('hidden');
  elBtnSolar.classList.add('hidden');

  // Feature 4: Countdown
  countdownTimer = 3;
  state = S.COUNTDOWN;
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
    condHTML = `<div class="cond-row" style="border-bottom:1px solid rgba(255,200,0,0.3);padding-bottom:6px;margin-bottom:4px"><span class="ci">🏆</span><span style="color:#fc0">Meilleur score: ${best.total} pts (${starStr})</span></div>` + condHTML;
  }
  document.getElementById('card-conditions').innerHTML = condHTML;

  elCardPlanet.classList.remove('hidden');
}

// ─── Result card population ───────────────────────────────────────────────────
function showResultCard(success, score, reason) {
  const titleEl = document.getElementById('res-title');
  titleEl.textContent = success ? 'ATTERRISSAGE RÉUSSI !' : 'MISSION ÉCHOUÉE';
  titleEl.style.color = success ? '#0f0' : '#f44';
  document.getElementById('res-emoji').textContent = success ? '🎉' : '💥';

  const mm = String(Math.floor(score.time / 60)).padStart(2, '0');
  const ss = String(Math.floor(score.time % 60)).padStart(2, '0');
  const fpct = ((score.fuel / BODY_DATA[selectedBody].startFuel) * 100).toFixed(0);

  const reasonRow = (!success && reason)
    ? `<div class="stat-row" style="color:#f88"><span class="stat-lbl">Cause</span><span class="stat-val" style="color:#faa;font-size:11px">${reason}</span></div>`
    : '';

  const lb = loadLeaderboard();
  const best = lb[selectedBody];
  const bestRow = (success && best && best.total >= (score.total || 0))
    ? `<div class="stat-row"><span class="stat-lbl">🏆 Meilleur</span><span class="stat-val" style="color:#fc0">${best.total} pts</span></div>`
    : '';

  // Feature 2: precision row
  const precisionRow = (success && score.precisionBonus !== undefined)
    ? `<div class="stat-row"><span class="stat-lbl">Précision</span><span class="stat-val">+${score.precisionBonus} pts</span></div>`
    : '';

  const baseRewards = [10, 20, 50, 80, 150];
  const st = BODY_DATA[selectedBody] ? BODY_DATA[selectedBody].stars : 1;
  let earned = baseRewards[st - 1] || 10;
  if (score.precisionBonus && score.precisionBonus >= 200) earned += 15;
  const diamRow = success ? `<div class="stat-row" style="background:rgba(0,100,200,0.3); border-radius:4px; padding:6px 8px; margin-top:4px;"><span class="stat-lbl" style="color:#0ff">💎 Récompense</span><span class="stat-val" style="color:#0ff">+${earned}</span></div>` : '';

  document.getElementById('res-stats').innerHTML = `
    ${reasonRow}
    <div class="stat-row"><span class="stat-lbl">Temps</span><span class="stat-val">${mm}:${ss}</span></div>
    <div class="stat-row"><span class="stat-lbl">Carburant restant</span><span class="stat-val">${fpct}%</span></div>
    ${precisionRow}
    <div class="stat-row"><span class="stat-lbl">Score</span><span class="stat-val">${success ? score.total : 0} pts</span></div>
    ${bestRow}
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
  elCtrl.classList.add('hidden');
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
  const fpct = Math.max(0, Math.min(100, l.fuel / cfg.startFuel * 100));
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

      if (game.result && !resultShown && game.resultDelay > (game.result.type === 'crash' ? 1.4 : 4.5)) {
        resultShown = true;
        const score = game.getScore();
        if (game.result.type === 'land') {
          unlockBody(selectedBody);
          // Feature 1: deduct fuel consumed
          const startFuel = BODY_DATA[selectedBody].startFuel;
          const fuelUsed = startFuel - game.lander.fuel;
          const fuelPct = (fuelUsed / startFuel) * 100;
          globalFuel = Math.max(0, globalFuel - fuelPct * 0.5);
          if (globalFuel < 10) {
            console.warn('⚠ Carburant global faible: ' + globalFuel.toFixed(0) + '%');
          }
          saveGlobalFuel(globalFuel);

          const baseRewards = [10, 20, 50, 80, 150];
          const st = BODY_DATA[selectedBody].stars || 1;
          let earned = baseRewards[st - 1] || 10;
          if (score.precisionBonus && score.precisionBonus >= 200) earned += 15;
          globalDiamonds += earned;
          saveDiamonds(globalDiamonds);
          document.getElementById('diamond-count').textContent = globalDiamonds;

          // Feature 13: save ghost if new record
          const isNewRecord = updateLeaderboard(selectedBody, score);
          if (isNewRecord) {
            saveGhost(selectedBody, game.getRecording());
          }
        } else {
          // crash: also deduct some fuel
          const startFuel = BODY_DATA[selectedBody].startFuel;
          const fuelUsed = startFuel - game.lander.fuel;
          const fuelPct = (fuelUsed / startFuel) * 100;
          globalFuel = Math.max(0, globalFuel - fuelPct * 0.3);
          saveGlobalFuel(globalFuel);
          updateLeaderboard(selectedBody, score);
        }
        showResultCard(game.result.type === 'land', score, game.result.reason);
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
      solar.draw(ctx, dt, hoveredBody, getLockedIds(), getFuelInfo(), loadLeaderboard());
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
      if (game) game.draw(ctx);
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

// ─── Boot ─────────────────────────────────────────────────────────────────────
showSolarUI();
requestAnimationFrame(loop);
