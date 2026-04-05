// src/app.js -- Main entry point: imports all modules, wires orchestration logic

'use strict';

// ─── State & Utils ──────────────────────────────────────────────────────────
import {
  S, FADE_DURATION, SURVEY_DURATION, COUNTDOWN_DURATION,
  CRASH_DELAY, LAND_DELAY, ZOOM_STEP, VIEW_MIN, VIEW_MAX,
} from './state.js';
import { easeInOut } from './utils.js';

// ─── i18n ───────────────────────────────────────────────────────────────────
import { t, setLang, getLang, applyI18nToDOM } from './i18n/i18n.js';

// ─── Data ───────────────────────────────────────────────────────────────────
import { BODY_DATA, CAMPAIGN_ORDER, bodyName, pickMissions } from './data/bodies.js';
import { BASE_REWARDS, VENUS_BOSS_REWARD, UPGRADE_CATALOG } from './data/shop.js';
import { LANDABLE, getFact } from './data/orbits.js';

// ─── Engine & Solar ─────────────────────────────────────────────────────────
import { LanderGame } from './engine/game.js';
import { SolarSystem } from './solar/solar-system.js';

// ─── Storage ────────────────────────────────────────────────────────────────
import {
  loadProgress, saveProgress,
  loadDiamonds, saveDiamonds,
  loadShips, saveShips,
  loadActiveShip, saveActiveShip,
  loadLeaderboard, saveLeaderboard,
  saveGhost, loadGhost,
  loadUpgrades, saveUpgrades,
} from './storage.js';

// ─── Input ──────────────────────────────────────────────────────────────────
import { keys, setupInput, IS_TOUCH } from './input.js';

// ─── UI ─────────────────────────────────────────────────────────────────────
import { renderMissionsHUD, updateMissionsHUD, evaluateMissions } from './ui/hud.js';
import { showPlanetCard, showResultCard, updateShopUI, renderUpgradeUI } from './ui/cards.js';
import { showTooltip, showTooltipHTML, nonLandableMsg } from './ui/tooltips.js';
import { checkAchievements, renderAchievementsModal, showAchievementPopup } from './ui/achievements.js';

// ─── Canvas setup ───────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();

// ─── Application state ──────────────────────────────────────────────────────
const app = {
  state: S.SOLAR,
  solar: new SolarSystem(canvas.width, canvas.height),
  game: null,
  fadeProgress: 0,
  zoomScale: 1,
  zoomOX: 0,
  zoomOY: 0,
  selectedBody: null,
  hoveredBody: null,
  viewZoom: 1,
  viewPanX: 0,
  viewPanY: 0,
  countdownTimer: 0,
  surveyTimer: 0,
  resultShown: false,
  tooltipTimer: 0,
  hoverFactIdx: 0,
  factTimer: 0,
  globalDiamonds: loadDiamonds(),
  dailyMode: false,
  timeScale: 100000,
  lastTime: 0,
  venusBossShown: false,
};

// ─── Initialize input ───────────────────────────────────────────────────────
setupInput();

// ─── UI element refs ────────────────────────────────────────────────────────
const elHud        = document.getElementById('hud');
const elBtnSolar   = document.getElementById('btn-solar');
const elTimeCtrl   = document.getElementById('time-ctrl');
const elSimDate    = document.getElementById('sim-date');
const elCardPlanet = document.getElementById('card-planet');
const elCardResult = document.getElementById('card-result');
const elTooltip    = document.getElementById('tooltip');

// ─── Solar view pan/zoom ────────────────────────────────────────────────────

function screenToSolar(sx, sy) {
  return {
    x: (sx - canvas.width / 2 - app.viewPanX) / app.viewZoom + canvas.width / 2,
    y: (sy - canvas.height / 2 - app.viewPanY) / app.viewZoom + canvas.height / 2,
  };
}

function applySolarTransform(c) {
  c.translate(canvas.width / 2 + app.viewPanX, canvas.height / 2 + app.viewPanY);
  c.scale(app.viewZoom, app.viewZoom);
  c.translate(-canvas.width / 2, -canvas.height / 2);
}

function zoomViewAt(sx, sy, factor) {
  const newZoom = Math.max(VIEW_MIN, Math.min(VIEW_MAX, app.viewZoom * factor));
  const ratio = newZoom / app.viewZoom;
  app.viewPanX = sx - canvas.width / 2 - (sx - canvas.width / 2 - app.viewPanX) * ratio;
  app.viewPanY = sy - canvas.height / 2 - (sy - canvas.height / 2 - app.viewPanY) * ratio;
  app.viewZoom = newZoom;

  const maxPanX = (canvas.width / 2) * (app.viewZoom - 1);
  const maxPanY = (canvas.height / 2) * (app.viewZoom - 1);
  app.viewPanX = Math.max(-maxPanX, Math.min(maxPanX, app.viewPanX));
  app.viewPanY = Math.max(-maxPanY, Math.min(maxPanY, app.viewPanY));

  updateTimeCtrlVisibility();
}

function resetViewZoom() {
  app.viewZoom = 1; app.viewPanX = 0; app.viewPanY = 0;
  updateTimeCtrlVisibility();
}

function updateTimeCtrlVisibility() {
  if (app.state === S.SOLAR) {
    elTimeCtrl.style.display = (app.viewZoom > 1.05 || Math.abs(app.viewPanX) > 5 || Math.abs(app.viewPanY) > 5) ? 'none' : '';
  }
}

// ─── Mouse wheel zoom ───────────────────────────────────────────────────────
canvas.addEventListener('wheel', e => {
  if (app.state !== S.SOLAR) return;
  e.preventDefault();
  const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
  zoomViewAt(e.clientX, e.clientY, factor);
}, { passive: false });

// ─── Touch pinch/pan ────────────────────────────────────────────────────────
let _touches = {};
let _lastPinchDist = null;
let _lastPanMid = null;

canvas.addEventListener('touchstart', e => {
  if (app.state !== S.SOLAR) return;
  Array.from(e.changedTouches).forEach(t => { _touches[t.identifier] = { x: t.clientX, y: t.clientY }; });
  const ids = Object.keys(_touches);
  if (ids.length === 2) {
    const a = _touches[ids[0]], b = _touches[ids[1]];
    _lastPinchDist = Math.hypot(b.x - a.x, b.y - a.y);
    _lastPanMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
}, { passive: true });

canvas.addEventListener('touchmove', e => {
  if (app.state !== S.SOLAR) return;
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
      app.viewPanX += mid.x - _lastPanMid.x;
      app.viewPanY += mid.y - _lastPanMid.y;

      const maxPanX = (canvas.width / 2) * (app.viewZoom - 1);
      const maxPanY = (canvas.height / 2) * (app.viewZoom - 1);
      app.viewPanX = Math.max(-maxPanX, Math.min(maxPanX, app.viewPanX));
      app.viewPanY = Math.max(-maxPanY, Math.min(maxPanY, app.viewPanY));

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

// ─── Campaign helpers ───────────────────────────────────────────────────────

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

// ─── Canvas click handler ───────────────────────────────────────────────────
canvas.addEventListener('click', e => {
  if (app.state !== S.SOLAR) return;
  const sc = screenToSolar(e.clientX, e.clientY);
  const id = app.solar.getBodyAt(sc.x, sc.y);
  if (!id) return;
  if (!LANDABLE.has(id)) {
    showTooltip(elTooltip, e.clientX, e.clientY, nonLandableMsg(id));
    app.tooltipTimer = 2.8;
    return;
  }
  if (getLockedIds().has(id)) {
    const idx = CAMPAIGN_ORDER.indexOf(id);
    const prev = CAMPAIGN_ORDER[idx - 1];
    const prevName = prev ? bodyName(prev) : '?';
    showTooltip(elTooltip, e.clientX, e.clientY, t('tooltip.locked', { planet: prevName }));
    app.tooltipTimer = 2.8;
    return;
  }
  elTooltip.classList.add('hidden');
  app.tooltipTimer = 0;
  app.selectedBody = id;
  const solarPos = app.solar.getBodyScreenPos(id);
  const pos = {
    x: (solarPos.x - canvas.width / 2) * app.viewZoom + canvas.width / 2 + app.viewPanX,
    y: (solarPos.y - canvas.height / 2) * app.viewZoom + canvas.height / 2 + app.viewPanY,
  };
  app.zoomOX = pos.x;
  app.zoomOY = pos.y;
  app.fadeProgress = 0;
  app.zoomScale = 1;
  app.state = S.FADING;
});

// ─── Mousemove handler (hover tooltips with fact rotation) ──────────────────
canvas.addEventListener('mousemove', e => {
  if (app.state !== S.SOLAR) return;
  const prev = app.hoveredBody;
  const hsc = screenToSolar(e.clientX, e.clientY);
  app.hoveredBody = app.solar.getBodyAt(hsc.x, hsc.y);
  canvas.style.cursor = app.hoveredBody ? 'pointer' : 'crosshair';

  if (app.hoveredBody !== prev) {
    app.hoverFactIdx = 0;
    app.factTimer = 0;
  }

  if (app.hoveredBody) {
    const dist = app.solar.getDistFromEarth(app.hoveredBody);
    const fact = getFact(app.hoveredBody, app.hoverFactIdx);
    const locked = getLockedIds().has(app.hoveredBody);
    const lb = loadLeaderboard();
    // BUG FIX 6 -- optional chaining for leaderboard null access
    const best = lb?.[app.hoveredBody];
    let html = `<b>${bodyName(app.hoveredBody)}</b>`;
    if (dist) html += `<br>${t('tooltip.distance', { dist })}`;
    if (fact) html += `<br>💡 ${fact}`;
    if (best) html += `<br>${t('tooltip.record', { score: best.total })}`;
    if (locked) html += `<br>${t('tooltip.locked_short')}`;
    showTooltipHTML(elTooltip, e.clientX, e.clientY, html);
  } else {
    elTooltip.classList.add('hidden');
    app.tooltipTimer = 0;
  }
});

// ─── Reset button ───────────────────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm(t('solar.reset_confirm'))) {
    localStorage.clear();
    location.reload();
  }
});

// ─── Shop button handlers ───────────────────────────────────────────────────
const elShopCard = document.getElementById('card-shop');

function equipShip(id) {
  saveActiveShip(id);
  updateShopUI(app.globalDiamonds, equipShip, buyShip);
}

function buyShip(id, cost) {
  if (app.globalDiamonds >= cost && !new Set(loadShips()).has(id)) {
    app.globalDiamonds -= cost;
    saveDiamonds(app.globalDiamonds);
    const ships = loadShips();
    ships.push(id);
    saveShips(ships);
    equipShip(id);
    document.getElementById('diamond-count').textContent = app.globalDiamonds;
  }
}

document.getElementById('btn-shop').addEventListener('click', () => {
  app.state = S.SHOP;
  hideSolarUI();
  updateShopUI(app.globalDiamonds, equipShip, buyShip);
  elShopCard.classList.remove('hidden');
});
document.getElementById('btn-shop-close').addEventListener('click', () => {
  elShopCard.classList.add('hidden');
  app.state = S.SOLAR;
  showSolarUI();
});

// ─── Upgrade helpers ────────────────────────────────────────────────────────

function buyUpgrade(shipId, upId) {
  const u = loadUpgrades();
  if (!u[shipId]) u[shipId] = {};
  const cur = u[shipId][upId] || 0;
  const cat = UPGRADE_CATALOG[upId];
  if (!cat || cur >= cat.max) return false;
  const cost = cat.cost + cur * 20;
  if (app.globalDiamonds < cost) return false;
  app.globalDiamonds -= cost;
  saveDiamonds(app.globalDiamonds);
  u[shipId][upId] = cur + 1;
  saveUpgrades(u);
  return true;
}

function doBuyUpgrade(shipId, upId) {
  if (buyUpgrade(shipId, upId)) {
    document.getElementById('diamond-count').textContent = app.globalDiamonds;
    renderUpgradeUI(shipId, app.globalDiamonds, doBuyUpgrade);
  }
}

// ─── Apply upgrades to lander at construction ───────────────────────────────

function applyUpgrades(game, shipId) {
  const u = loadUpgrades()[shipId] || {};
  const l = game.lander;
  const thrustLvl = u['thrust'] || 0;
  const fuelLvl = u['fuel_cap'] || 0;
  const gyroLvl = u['gyro'] || 0;
  const rcsLvl = u['rcs'] || 0;
  const retroLvl = u['retro'] || 0;
  l._thrustBonus = 1 + thrustLvl * 0.15;
  l._fuelCapBonus = 1 + fuelLvl * 0.20;
  l._gyroBonus = 1 + gyroLvl * 0.20;
  l._rcsBonus = 1 + rcsLvl * 0.5;
  l._retroBonus = 1 + retroLvl * 0.25;
  if (fuelLvl > 0) {
    l.fuel *= l._fuelCapBonus;
    l.fuelMax *= l._fuelCapBonus;
  }
}

// ─── Planet card launch/back ────────────────────────────────────────────────
document.getElementById('btn-launch').addEventListener('click', startGame);
document.getElementById('btn-back').addEventListener('click', () => {
  elCardPlanet.classList.add('hidden');
  app.state = S.SOLAR;
  showSolarUI();
});

// ─── Result card retry/solar ────────────────────────────────────────────────
document.getElementById('btn-retry').addEventListener('click', () => {
  elCardResult.classList.add('hidden');
  startGame();
});
document.getElementById('btn-to-solar').addEventListener('click', returnToSolar);
elBtnSolar.addEventListener('click', returnToSolar);

// ─── State helpers ──────────────────────────────────────────────────────────

function showSolarUI() {
  elTimeCtrl.style.display = '';
  document.getElementById('solar-top-right').style.display = '';
  document.getElementById('solar-top-left').style.display = '';
  document.getElementById('diamond-count').textContent = app.globalDiamonds;
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
  app.game = null;
  app.state = S.SOLAR;
  showSolarUI();
}

// ─── startGame ──────────────────────────────────────────────────────────────

function startGame() {
  app.resultShown = false;
  elCardPlanet.classList.add('hidden');
  elCardResult.classList.add('hidden');
  if (!app.selectedBody) return;

  app.game = new LanderGame(app.selectedBody, canvas.width, canvas.height);
  applyUpgrades(app.game, loadActiveShip());

  // Load ghost for this body
  const ghostFrames = loadGhost(app.selectedBody);
  if (ghostFrames) app.game.setGhost(ghostFrames);

  const cfg = BODY_DATA[app.selectedBody];
  document.getElementById('hud-planet-name').textContent = bodyName(app.selectedBody).toUpperCase();
  document.getElementById('wind-row').style.display = cfg.windType !== 'none' ? '' : 'none';
  document.getElementById('storm-warn').style.display = 'none';

  elHud.classList.remove('hidden');
  elBtnSolar.classList.add('hidden');
  if (IS_TOUCH) document.getElementById('touch-controls').classList.remove('hidden');

  // BUG FIX 5 -- Mission seed collision: add random component
  const missionSeed = Date.now() ^ (app.selectedBody.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) ^ (Math.random() * 0xFFFF | 0);
  app.game.missions = pickMissions(app.selectedBody, missionSeed);
  renderMissionsHUD(app.game.missions);
  updateMissionsHUD(app.game.missions, app.game);

  // Survey phase: camera pans to show pad before countdown
  app.surveyTimer = 0;
  app.game.camX = app.game.lander.x;
  app.game.camY = app.game.lander.y - (app.game.canvasH / app.game.SCALE) * 0.33;
  app.state = S.SURVEY;
}

// ─── Venus boss ─────────────────────────────────────────────────────────────

function checkVenusBoss(score) {
  if (app.selectedBody !== 'venus') return;
  const lb = loadLeaderboard();
  if (!lb['venus'] || lb['venus'].total < score.total) {
    if (!app.venusBossShown) {
      app.venusBossShown = true;
      setTimeout(() => showBossVictory(), 500);
    }
  }
}

function showBossVictory() {
  const el = document.getElementById('boss-overlay');
  if (!el) return;
  el.classList.remove('hidden');
  app.globalDiamonds += VENUS_BOSS_REWARD;
  saveDiamonds(app.globalDiamonds);
  document.getElementById('diamond-count').textContent = app.globalDiamonds;
  el.querySelector('#boss-reward').textContent = t('boss.reward');
  document.getElementById('btn-boss-close').onclick = () => el.classList.add('hidden');
}

// ─── Daily challenge ────────────────────────────────────────────────────────

function getDailyKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getDailyChallenge() {
  const key = getDailyKey();
  const hash = key.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  const idx = Math.abs(hash) % CAMPAIGN_ORDER.length;
  const bodyId = CAMPAIGN_ORDER[idx];
  const seed = Math.abs(hash * 7 + 13) % 999999;
  return { bodyId, seed, key };
}

function startDailyChallenge() {
  const ch = getDailyChallenge();
  if (!BODY_DATA[ch.bodyId]) return;
  app.dailyMode = true;
  app.selectedBody = ch.bodyId;
  elTooltip.classList.add('hidden');
  const solarPos = app.solar.getBodyScreenPos(ch.bodyId);
  const pos = {
    x: (solarPos.x - canvas.width / 2) * app.viewZoom + canvas.width / 2 + app.viewPanX,
    y: (solarPos.y - canvas.height / 2) * app.viewZoom + canvas.height / 2 + app.viewPanY,
  };
  app.zoomOX = pos.x;
  app.zoomOY = pos.y;
  app.fadeProgress = 0;
  app.zoomScale = 1;
  app.state = S.FADING;
}

// ─── Replay (minimal -- no dead drawReplayOverlay) ──────────────────────────

function startReplay(frames, game) {
  // Replay frames stored but overlay intentionally removed (dead code)
  // Ghost system handles replay via game.setGhost()
}

// ─── Achievements / Upgrades / Daily button handlers ────────────────────────

document.getElementById('btn-daily').addEventListener('click', startDailyChallenge);
document.getElementById('btn-achievements').addEventListener('click', () => {
  renderAchievementsModal();
  document.getElementById('card-achievements').classList.remove('hidden');
});
document.getElementById('btn-ach-close').addEventListener('click', () => {
  document.getElementById('card-achievements').classList.add('hidden');
});
document.getElementById('btn-upgrades').addEventListener('click', () => {
  renderUpgradeUI(loadActiveShip(), app.globalDiamonds, doBuyUpgrade);
  document.getElementById('card-upgrades').classList.remove('hidden');
});
document.getElementById('btn-upgrades-close').addEventListener('click', () => {
  document.getElementById('card-upgrades').classList.add('hidden');
});

// ─── Language toggle ────────────────────────────────────────────────────────
document.getElementById('btn-lang').addEventListener('click', () => {
  setLang(getLang() === 'fr' ? 'en' : 'fr');
  document.getElementById('diamond-count').textContent = app.globalDiamonds;
});

// ─── Error overlay ──────────────────────────────────────────────────────────

function showError(msg) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f44';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(t('error.title'), canvas.width / 2, canvas.height / 2 - 20);
  ctx.fillStyle = '#faa';
  ctx.font = '13px monospace';
  ctx.fillText(String(msg).slice(0, 120), canvas.width / 2, canvas.height / 2 + 10);
  ctx.fillStyle = '#888';
  ctx.font = '11px monospace';
  ctx.fillText(t('error.hint'), canvas.width / 2, canvas.height / 2 + 36);
}

// ─── HUD update ─────────────────────────────────────────────────────────────

function updateHUD() {
  if (!app.game) return;
  const l = app.game.lander;
  const cfg = app.game.cfg;

  // Timer
  const mm = String(Math.floor(app.game.elapsed / 60)).padStart(2, '0');
  const ss = String(Math.floor(app.game.elapsed % 60)).padStart(2, '0');
  document.getElementById('hud-timer').textContent = mm + ':' + ss;

  // Altitude
  const alt = Math.max(0, l.y - app.game.terrain.heightAt(l.x) - l.hh);
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
    const ws = app.game.wind.getDisplaySpeed();
    const wdir = app.game.wind.current >= 0 ? '→' : '←';
    windEl.textContent = wdir + ' ' + ws.toFixed(1) + ' m/s';
  }
  if (stormEl) stormEl.style.display = app.game.wind.isStorming() ? '' : 'none';

  // Personal best
  const bestEl = document.getElementById('v-best');
  const bestRow = document.getElementById('best-row');
  if (bestEl && bestRow && app.selectedBody) {
    const lb = loadLeaderboard();
    const best = lb[app.selectedBody];
    if (best) {
      bestEl.textContent = best.total + ' pts';
      bestRow.style.display = '';
    } else {
      bestRow.style.display = 'none';
    }
  }
}

// ─── Main loop ──────────────────────────────────────────────────────────────

function loop(ts) {
  requestAnimationFrame(loop);

  const dt = Math.min((ts - app.lastTime) / 1000, 0.05);
  app.lastTime = ts;

  try {
    // ── Update ────────────────────────────────────────────────────────────
    if (app.state === S.SOLAR) {
      app.solar.update(dt * app.timeScale);
      if (elSimDate) elSimDate.textContent = app.solar.getSimDate();
      if (app.tooltipTimer > 0) {
        app.tooltipTimer -= dt;
        if (app.tooltipTimer <= 0) elTooltip.classList.add('hidden');
      }
      // BUG FIX 2 -- Hover fact rotation: rotate fact index while hovering
      if (app.hoveredBody) {
        app.factTimer += dt;
        if (app.factTimer >= 3) {
          app.factTimer = 0;
          app.hoverFactIdx++;
        }
      }

    } else if (app.state === S.FADING) {
      app.fadeProgress = Math.min(1, app.fadeProgress + dt / FADE_DURATION);
      app.zoomScale = 1 + easeInOut(app.fadeProgress) * 22;
      if (app.fadeProgress >= 1) {
        app.state = S.SELECT;
        hideSolarUI();
        showPlanetCard(app.selectedBody, elCardPlanet);
      }

    } else if (app.state === S.SURVEY && app.game) {
      app.surveyTimer += dt;
      if (app.surveyTimer >= SURVEY_DURATION) {
        app.countdownTimer = COUNTDOWN_DURATION;
        app.state = S.COUNTDOWN;
      }

    } else if (app.state === S.COUNTDOWN && app.game) {
      app.game.update(dt);
      app.countdownTimer -= dt;
      if (app.countdownTimer <= 0) {
        app.state = S.PLAYING;
      }

    } else if (app.state === S.PLAYING && app.game) {
      app.game.input = { ...keys };
      app.game.update(dt);
      updateHUD();
      updateMissionsHUD(app.game.missions, app.game);

      // BUG FIX 3 -- Result race condition: resultShown = true FIRST
      if (app.game.result && !app.resultShown && app.game.resultDelay > (app.game.result.type === 'crash' ? CRASH_DELAY : LAND_DELAY)) {
        app.resultShown = true;  // FIRST LINE -- prevents double execution
        const score = app.game.getScore();
        if (app.game.result.type === 'land') {
          unlockBody(app.selectedBody);

          const st = BODY_DATA[app.selectedBody].stars || 1;
          let earned = BASE_REWARDS[st - 1] || 10;
          if (score.precisionBonus && score.precisionBonus >= 200) earned += 15;
          const missionBonus = evaluateMissions(app.game.missions, app.game, score);
          earned += missionBonus;
          score._missionBonus = missionBonus;
          app.globalDiamonds += earned;
          saveDiamonds(app.globalDiamonds);
          document.getElementById('diamond-count').textContent = app.globalDiamonds;

          const isNewRecord = updateLeaderboard(app.selectedBody, score);
          if (isNewRecord) {
            saveGhost(app.selectedBody, app.game.getRecording());
          }
        }
        showResultCard(app.game.result.type === 'land', score, app.game.result.reason, app.game, app.selectedBody, app.globalDiamonds);
        elBtnSolar.classList.remove('hidden');
        if (app.game.result.type === 'land') {
          checkVenusBoss(score);
          checkAchievements(score, app.game);
          const ghost = loadGhost(app.selectedBody);
          if (ghost) startReplay(ghost, app.game);
        }
        app.state = S.RESULT;
      }

    } else if (app.state === S.RESULT && app.game) {
      app.game.update(dt);
    }

    // ── Draw ──────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (app.state === S.SOLAR) {
      ctx.save();
      applySolarTransform(ctx);
      app.solar.draw(ctx, dt, app.hoveredBody, getLockedIds(), null, loadLeaderboard());
      ctx.restore();

    } else if (app.state === S.FADING) {
      const ft = easeInOut(app.fadeProgress);
      ctx.save();
      ctx.translate(app.zoomOX, app.zoomOY);
      ctx.scale(app.zoomScale, app.zoomScale);
      ctx.translate(-app.zoomOX, -app.zoomOY);
      app.solar.draw(ctx, 0, null);
      ctx.restore();
      if (ft > 0.5) {
        ctx.fillStyle = `rgba(0,0,6,${((ft - 0.5) / 0.5).toFixed(3)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

    } else if (app.state === S.SELECT) {
      ctx.fillStyle = '#000008';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      app.solar.draw(ctx, 0, null);
      ctx.fillStyle = 'rgba(0,0,8,0.65)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

    } else if (app.state === S.SURVEY && app.game) {
      const st = Math.min(1, app.surveyTimer / SURVEY_DURATION);
      let u = st < 0.35 ? st / 0.35 : st < 0.65 ? 1 : (1 - st) / 0.35;
      u = u * u * (3 - 2 * u); // smoothstep
      const lx = app.game.lander.x;
      const ly = app.game.lander.y - (app.game.canvasH / app.game.SCALE) * 0.33;
      const px = app.game.terrain.padCenter;
      const py = app.game.terrain.padHeight + (app.game.canvasH / app.game.SCALE) * 0.28;
      app.game.camX = lx + (px - lx) * u;
      app.game.camY = ly + (py - ly) * u;
      app.game.draw(ctx);
      // Survey overlay text
      const fadeA = st < 0.15 ? st / 0.15 : st > 0.82 ? (1 - st) / 0.18 : 1;
      ctx.save();
      ctx.globalAlpha = fadeA * 0.92;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,210,255,0.95)';
      ctx.font = '15px "Share Tech Mono", monospace';
      ctx.fillText(t('survey.title'), canvas.width / 2, canvas.height / 2 - 14);
      ctx.fillStyle = 'rgba(0,255,136,0.75)';
      ctx.font = '11px "Share Tech Mono", monospace';
      ctx.fillText(t('survey.subtitle'), canvas.width / 2, canvas.height / 2 + 10);
      ctx.restore();

    } else if (app.state === S.COUNTDOWN && app.game) {
      app.game.draw(ctx);
      const num = Math.ceil(app.countdownTimer);
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

    } else if (app.state === S.PLAYING || app.state === S.RESULT) {
      if (app.game) {
        app.game.draw(ctx);
      }
    }

  } catch (err) {
    console.error('Game loop error:', err);
    showError(err.message || err);
  }
}

// ─── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  resizeCanvas();
  app.solar.resize(canvas.width, canvas.height);
  if (app.game) { app.game.canvasW = canvas.width; app.game.canvasH = canvas.height; }
});

// ─── Boot ───────────────────────────────────────────────────────────────────
applyI18nToDOM();
showSolarUI();
requestAnimationFrame(loop);
