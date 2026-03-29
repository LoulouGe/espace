// main.js — App controller, state machine, game loop

'use strict';

// ─── Canvas ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();

// ─── State ────────────────────────────────────────────────────────────────────
const S = { SOLAR:'solar', FADING:'fading', SELECT:'select', PLAYING:'playing', RESULT:'result' };
let state = S.SOLAR;

// ─── Singletons ───────────────────────────────────────────────────────────────
let solar = new SolarSystem(canvas.width, canvas.height);
let game  = null;

// ─── Input ────────────────────────────────────────────────────────────────────
const keys = { up:false, left:false, right:false, space:false };
document.addEventListener('keydown', e => {
  if (e.code === 'ArrowUp'    || e.code === 'KeyW') { keys.up    = true; e.preventDefault(); }
  if (e.code === 'ArrowLeft'  || e.code === 'KeyA') { keys.left  = true; e.preventDefault(); }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = true; e.preventDefault(); }
  if (e.code === 'Space')                           { keys.space = true; e.preventDefault(); }
});
document.addEventListener('keyup', e => {
  if (e.code === 'ArrowUp'    || e.code === 'KeyW') keys.up    = false;
  if (e.code === 'ArrowLeft'  || e.code === 'KeyA') keys.left  = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space')                           keys.space = false;
});

// ─── Fade + zoom state ────────────────────────────────────────────────────────
let fadeProgress = 0;         // 0→1
let zoomScale    = 1;
let zoomOX       = 0;         // target planet screen X
let zoomOY       = 0;         // target planet screen Y
const FADE_DUR   = 0.9;       // seconds
let selectedBody = null;
let hoveredBody  = null;

// ─── Time scale ───────────────────────────────────────────────────────────────
let timeScale = 1;

// ─── Result shown guard ───────────────────────────────────────────────────────
let resultShown = false;

// ─── Tooltip ─────────────────────────────────────────────────────────────────
let tooltipTimer = 0;

// ─── UI refs ─────────────────────────────────────────────────────────────────
const elHud       = document.getElementById('hud');
const elCtrl      = document.getElementById('controls-bar');
const elBtnSolar  = document.getElementById('btn-solar');
const elTimeCtrl  = document.getElementById('time-ctrl');
const elSimDate   = document.getElementById('sim-date');
const elCardPlanet= document.getElementById('card-planet');
const elCardResult= document.getElementById('card-result');
const elTooltip   = document.getElementById('tooltip');

// ─── Canvas interactions ──────────────────────────────────────────────────────
canvas.addEventListener('click', e => {
  if (state !== S.SOLAR) return;
  const id = solar.getBodyAt(e.clientX, e.clientY);
  if (!id) return;
  if (!LANDABLE.has(id)) {
    showTooltip(e.clientX, e.clientY, nonLandableMsg(id));
    return;
  }
  selectedBody = id;
  const pos    = solar.getBodyScreenPos(id);
  zoomOX       = pos.x;
  zoomOY       = pos.y;
  fadeProgress = 0;
  zoomScale    = 1;
  state        = S.FADING;
});

canvas.addEventListener('mousemove', e => {
  if (state !== S.SOLAR) return;
  hoveredBody = solar.getBodyAt(e.clientX, e.clientY);
  canvas.style.cursor = hoveredBody ? 'pointer' : 'crosshair';
});

// ─── Time buttons ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    timeScale = Number(btn.dataset.speed);
    document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

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
  elTimeCtrl.classList.remove('hidden');
  elBtnSolar.classList.add('hidden');
  elHud.classList.add('hidden');
  elCtrl.classList.add('hidden');
}

function hideSolarUI() {
  elTimeCtrl.classList.add('hidden');
}

function returnToSolar() {
  elCardResult.classList.add('hidden');
  elCardPlanet.classList.add('hidden');
  elHud.classList.add('hidden');
  elCtrl.classList.add('hidden');
  elBtnSolar.classList.add('hidden');
  game  = null;
  state = S.SOLAR;
  showSolarUI();
}

function startGame() {
  resultShown = false;
  elCardPlanet.classList.add('hidden');
  elCardResult.classList.add('hidden');
  if (!selectedBody) return;

  game = new LanderGame(selectedBody, canvas.width, canvas.height);

  const cfg = BODY_DATA[selectedBody];
  document.getElementById('hud-planet-name').textContent = cfg.name.toUpperCase();
  document.getElementById('wind-row').style.display  = cfg.windType !== 'none' ? '' : 'none';
  document.getElementById('storm-warn').style.display = 'none';

  elHud.classList.remove('hidden');
  elCtrl.classList.remove('hidden');
  elBtnSolar.classList.add('hidden');
  state = S.PLAYING;
}

// ─── Planet card population ───────────────────────────────────────────────────
function showPlanetCard(id) {
  const cfg = BODY_DATA[id];
  document.getElementById('card-emoji').textContent = cfg.emoji;
  document.getElementById('card-name').textContent  = cfg.name;
  document.getElementById('card-desc').textContent  = cfg.desc;

  const starsEl = document.getElementById('card-stars');
  starsEl.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement('span');
    s.textContent = '★';
    s.className   = i <= cfg.stars ? 'star-filled' : 'star-empty';
    starsEl.appendChild(s);
  }

  document.getElementById('card-conditions').innerHTML =
    cfg.conditions.map(c => `<div class="cond-row"><span class="ci">${c.ci}</span><span>${c.txt}</span></div>`).join('');

  elCardPlanet.classList.remove('hidden');
}

// ─── Result card population ───────────────────────────────────────────────────
function showResultCard(success, score, reason) {
  const titleEl = document.getElementById('res-title');
  titleEl.textContent = success ? 'ATTERRISSAGE RÉUSSI !' : 'MISSION ÉCHOUÉE';
  titleEl.style.color = success ? '#0f0' : '#f44';
  document.getElementById('res-emoji').textContent = success ? '🎉' : '💥';

  const mm  = String(Math.floor(score.time / 60)).padStart(2, '0');
  const ss  = String(Math.floor(score.time % 60)).padStart(2, '0');
  const fpct= ((score.fuel / BODY_DATA[selectedBody].startFuel) * 100).toFixed(0);

  const reasonRow = (!success && reason)
    ? `<div class="stat-row" style="color:#f88"><span class="stat-lbl">Cause</span><span class="stat-val" style="color:#faa;font-size:11px">${reason}</span></div>`
    : '';

  document.getElementById('res-stats').innerHTML = `
    ${reasonRow}
    <div class="stat-row"><span class="stat-lbl">Temps</span><span class="stat-val">${mm}:${ss}</span></div>
    <div class="stat-row"><span class="stat-lbl">Carburant restant</span><span class="stat-val">${fpct}%</span></div>
    <div class="stat-row"><span class="stat-lbl">Score</span><span class="stat-val">${success ? score.total : 0} pts</span></div>
  `;

  const starsEl = document.getElementById('res-stars');
  starsEl.innerHTML = '';
  if (success) {
    for (let i = 1; i <= 3; i++) {
      const s = document.createElement('span');
      s.textContent    = '★';
      s.className      = i <= score.stars ? 'star-filled' : 'star-empty';
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
  elTooltip.style.left  = (x + 14) + 'px';
  elTooltip.style.top   = (y - 36) + 'px';
  elTooltip.classList.remove('hidden');
  tooltipTimer = 2.8;
}

function nonLandableMsg(id) {
  const m = {
    jupiter: "Jupiter est une géante gazeuse — pas de surface solide !",
    saturn:  "Saturne est une géante gazeuse. Cliquez sur Titan pour atterrir.",
    uranus:  "Uranus est une géante de glace — pas d'atterrissage possible.",
    neptune: "Neptune est une géante de glace — pas d'atterrissage possible.",
  };
  return m[id] || "Corps non atterrissable.";
}

// ─── Easing ───────────────────────────────────────────────────────────────────
function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

// ─── HUD update ───────────────────────────────────────────────────────────────
function updateHUD() {
  if (!game) return;
  const l   = game.lander;
  const cfg = game.cfg;

  // Timer
  const mm = String(Math.floor(game.elapsed / 60)).padStart(2, '0');
  const ss = String(Math.floor(game.elapsed % 60)).padStart(2, '0');
  document.getElementById('hud-timer').textContent = mm + ':' + ss;

  // Altitude
  const alt = Math.max(0, l.y - game.terrain.heightAt(l.x) - l.hh);
  document.getElementById('v-alt').textContent = alt.toFixed(0) + ' m';

  // Speeds with color
  const vs    = Math.max(0, -l.vy);
  const hs    = Math.abs(l.vx);
  const ang   = Math.abs(l.angle);
  const color = (v, max) => v > max ? 'danger' : v > max * 0.65 ? 'warn' : 'safe';

  const vsEl  = document.getElementById('v-vs');
  const hsEl  = document.getElementById('v-hs');
  const angEl = document.getElementById('v-ang');
  if (vsEl)  { vsEl.textContent  = vs.toFixed(1);  vsEl.className  = 'hval ' + color(vs,  cfg.maxVSpeed); }
  if (hsEl)  { hsEl.textContent  = hs.toFixed(1);  hsEl.className  = 'hval ' + color(hs,  cfg.maxHSpeed); }
  if (angEl) { angEl.textContent = ang.toFixed(1); angEl.className = 'hval ' + color(ang, cfg.maxAngle); }

  // Fuel
  const fpct = Math.max(0, Math.min(100, l.fuel / cfg.startFuel * 100));
  const fuelBarEl = document.getElementById('fuel-bar');
  const fuelTxtEl = document.getElementById('v-fuel');
  if (fuelBarEl) fuelBarEl.style.setProperty('--fuel-pct', fpct.toFixed(1) + '%');
  if (fuelTxtEl) fuelTxtEl.textContent = fpct.toFixed(0) + '%';

  // Wind
  const windEl  = document.getElementById('v-wind');
  const stormEl = document.getElementById('storm-warn');
  if (windEl && cfg.windType !== 'none') {
    const ws   = game.wind.getDisplaySpeed();
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
  lastTime  = ts;

  try {
    // ── Update ────────────────────────────────────────────────────────────
    if (state === S.SOLAR) {
      solar.update(dt * timeScale);
      if (elSimDate) elSimDate.textContent = solar.getSimDate();
      if (tooltipTimer > 0) {
        tooltipTimer -= dt;
        if (tooltipTimer <= 0) elTooltip.classList.add('hidden');
      }

    } else if (state === S.FADING) {
      fadeProgress = Math.min(1, fadeProgress + dt / FADE_DUR);
      zoomScale    = 1 + easeInOut(fadeProgress) * 22;
      if (fadeProgress >= 1) {
        state = S.SELECT;
        hideSolarUI();
        showPlanetCard(selectedBody);
      }

    } else if (state === S.PLAYING && game) {
      game.input = { ...keys };
      game.update(dt);
      updateHUD();

      if (game.result && !resultShown && game.resultDelay > (game.result.type === 'crash' ? 1.4 : 0.6)) {
        resultShown = true;
        showResultCard(game.result.type === 'land', game.getScore(), game.result.reason);
        state = S.RESULT;
      }

    } else if (state === S.RESULT && game) {
      game.update(dt);
    }

    // ── Draw ──────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state === S.SOLAR) {
      solar.draw(ctx, dt, hoveredBody);

    } else if (state === S.FADING) {
      const t  = easeInOut(fadeProgress);
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
