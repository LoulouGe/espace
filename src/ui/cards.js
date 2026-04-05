import { t } from '../i18n/i18n.js';
import { BODY_DATA, bodyName, bodyDesc, bodyConditions } from '../data/bodies.js';
import { SHOP_CATALOG, UPGRADE_CATALOG, getShipPalette, drawShipPreview, BASE_REWARDS } from '../data/shop.js';
import {
  loadLeaderboard, loadShips, loadActiveShip, saveActiveShip,
  saveDiamonds, saveShips, loadUpgrades, saveUpgrades,
} from '../storage.js';

// ─── Planet card ────────────────────────────────────────────────────────────

export function showPlanetCard(id, elCardPlanet) {
  const cfg = BODY_DATA[id];
  document.getElementById('card-emoji').textContent = cfg.emoji;
  document.getElementById('card-name').textContent = bodyName(id);
  document.getElementById('card-desc').textContent = bodyDesc(id);

  const starsEl = document.getElementById('card-stars');
  starsEl.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement('span');
    s.textContent = '★';
    s.className = i <= cfg.stars ? 'star-filled' : 'star-empty';
    starsEl.appendChild(s);
  }

  const lb = loadLeaderboard();
  const best = lb[id];
  const conditions = bodyConditions(id);
  let condHTML = conditions.map(c => `<div class="cond-row"><span class="ci">${c.ci}</span><span>${c.txt}</span></div>`).join('');
  if (best) {
    const starStr = '★'.repeat(best.stars || 0) + '☆'.repeat(3 - (best.stars || 0));
    condHTML = `<div class="cond-row cond-row--record"><span class="ci">🏆</span><span>${t('result.record')} ${best.total} pts (${starStr})</span></div>` + condHTML;
  }
  document.getElementById('card-conditions').innerHTML = condHTML;

  elCardPlanet.classList.remove('hidden');
}

// ─── Result card ────────────────────────────────────────────────────────────

export function showResultCard(success, score, reason, game, selectedBody, globalDiamonds) {
  const titleEl = document.getElementById('res-title');
  titleEl.textContent = success ? t('result.success') : t('result.fail');
  titleEl.classList.toggle('result-success', success);
  titleEl.classList.toggle('result-fail', !success);
  document.getElementById('res-emoji').textContent = success ? '🎉' : '💥';

  const mm = String(Math.floor(score.time / 60)).padStart(2, '0');
  const ss = String(Math.floor(score.time % 60)).padStart(2, '0');
  const fuelMax = game && game.lander ? (game.lander.fuelMax || BODY_DATA[selectedBody].startFuel) : BODY_DATA[selectedBody].startFuel;
  const fpct = ((score.fuel / fuelMax) * 100).toFixed(0);

  const reasonRow = (!success && reason)
    ? `<div class="stat-row stat-row-danger"><span class="stat-lbl">${t('result.cause')}</span><span class="stat-val">${reason}</span></div>`
    : '';

  const lb = loadLeaderboard();
  const best = lb[selectedBody];
  const bestRow = (success && best && best.total >= (score.total || 0))
    ? `<div class="stat-row"><span class="stat-lbl">${t('result.best')}</span><span class="stat-val stat-val-gold">${best.total} pts</span></div>`
    : '';

  const precisionRow = (success && score.precisionBonus !== undefined)
    ? `<div class="stat-row"><span class="stat-lbl">${t('result.precision')}</span><span class="stat-val">+${score.precisionBonus} pts</span></div>`
    : '';

  const st = BODY_DATA[selectedBody] ? BODY_DATA[selectedBody].stars : 1;
  let earned = BASE_REWARDS[st - 1] || 10;
  if (score.precisionBonus && score.precisionBonus >= 200) earned += 15;
  const missionBonus = score._missionBonus || 0;
  const missionRows = (success && game && game.missions && game.missions.length) ?
    game.missions.map(m => {
      const done = m.check(score, game);
      const label = t(m.labelKey).replace(/^[^\s]+\s/, '');
      return `<div class="stat-row stat-row-mission ${done ? 'is-done' : ''}"><span class="stat-lbl">${done?'✔':'○'} ${label}</span><span class="stat-val">${done?'+'+m.reward+'💎':'—'}</span></div>`;
    }).join('') : '';
  const diamRow = success ? `<div class="stat-row stat-row-reward"><span class="stat-lbl">${t('result.reward')}</span><span class="stat-val">+${earned}${missionBonus>0?' (dont +'+missionBonus+' missions)':''}</span></div>` : '';

  document.getElementById('res-stats').innerHTML = `
    ${reasonRow}
    <div class="stat-row"><span class="stat-lbl">${t('result.time')}</span><span class="stat-val">${mm}:${ss}</span></div>
    <div class="stat-row"><span class="stat-lbl">${t('result.fuel')}</span><span class="stat-val">${fpct}%</span></div>
    ${precisionRow}
    <div class="stat-row"><span class="stat-lbl">${t('result.score')}</span><span class="stat-val">${success ? score.total : 0} pts</span></div>
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

  document.getElementById('card-result').classList.remove('hidden');
  document.getElementById('btn-to-solar').classList.remove('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('missions-hud').classList.add('hidden');
}

// ─── Shop UI ────────────────────────────────────────────────────────────────

export function updateShopUI(globalDiamonds, equipShip, buyShip) {
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
      btnHTML = `<button class="btn shop-item-btn" disabled>${t('shop.equipped')}</button>`;
    } else if (isUnlocked) {
      btnHTML = `<button class="btn shop-item-btn" data-action="equip" data-id="${id}">${t('shop.select')}</button>`;
    } else {
      btnHTML = `<button class="btn shop-item-btn" data-action="buy" data-id="${id}" data-cost="${item.cost}" ${!canAfford ? 'disabled' : ''}>${item.cost} 💎</button>`;
    }

    div.innerHTML = `
      <div class="shop-item-icon">
        <canvas id="cvs-shop-${id}" width="50" height="50"></canvas>
      </div>
      <div class="shop-item-info">
        <div class="shop-item-name">${t(item.nameKey)}</div>
        <div class="shop-item-desc">${t(item.descKey)}</div>
      </div>
      <div class="shop-item-actions">${btnHTML}</div>
    `;
    list.appendChild(div);

    // Draw miniature asynchronously
    const cvs = document.getElementById('cvs-shop-' + id);
    if (cvs) {
      setTimeout(() => { drawShipPreview(cvs.getContext('2d'), id); }, 0);
    }
  }

  // Wire up buttons via data attributes instead of inline onclick
  list.querySelectorAll('[data-action="equip"]').forEach(btn => {
    btn.addEventListener('click', () => equipShip(btn.dataset.id));
  });
  list.querySelectorAll('[data-action="buy"]').forEach(btn => {
    btn.addEventListener('click', () => buyShip(btn.dataset.id, Number(btn.dataset.cost)));
  });
}

// ─── Upgrade UI ─────────────────────────────────────────────────────────────

export function renderUpgradeUI(shipId, globalDiamonds, doBuyUpgrade) {
  const u = loadUpgrades()[shipId] || {};
  const list = document.getElementById('upgrade-list');
  if (!list) return;
  list.innerHTML = '';
  document.getElementById('upgrade-ship-name').textContent = t('shop.' + shipId + '.name');

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
        <div class="upg-name">${t(cat.nameKey)} ${pips}</div>
        <div class="upg-desc">${t(cat.descKey)}</div>
      </div>
      <button class="upg-btn" ${maxed || !canAfford ? 'disabled' : ''} data-ship="${shipId}" data-upgrade="${upId}">
        ${maxed ? 'MAX' : cost+'💎'}
      </button>`;
    list.appendChild(div);
  }

  // Wire up buttons via data attributes
  list.querySelectorAll('.upg-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => doBuyUpgrade(btn.dataset.ship, btn.dataset.upgrade));
  });

  document.getElementById('upgrade-diamonds').textContent = globalDiamonds;
}
