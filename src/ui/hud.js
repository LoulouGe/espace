import { t } from '../i18n/i18n.js';

export function getMissionDisplay(mission) {
  const label = t(mission.labelKey);
  const desc = t(mission.descKey);
  const match = label.match(/^(\S+)\s+(.*)$/);
  return {
    icon: match ? match[1] : '◎',
    title: match ? match[2] : label,
    desc: desc,
  };
}

export function renderMissionsHUD(missions) {
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
        <span class="mission-state">${t('missions.pending')}</span>
      </div>
    </div>`;
  }).join('');
  hud.classList.remove('hidden');
}

export function updateMissionsHUD(missions, game) {
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
      unlocked ? t('missions.complete') : ready ? t('missions.ready') : t('missions.pending');
  });
}

export function evaluateMissions(missions, game, score) {
  if (!missions || !game || !game.result || game.result.type !== 'land') return 0;
  let bonus = 0;
  missions.forEach(m => {
    if (m.check(score, game)) bonus += m.reward;
  });
  return bonus;
}
