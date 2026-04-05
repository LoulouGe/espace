import { t } from '../i18n/i18n.js';
import { CAMPAIGN_ORDER } from '../data/bodies.js';
import { loadLeaderboard, loadAchievements, saveAchievements } from '../storage.js';

// ─── Achievement definitions ────────────────────────────────────────────────

const ACHIEVEMENTS = [
  { id: 'first_land',    labelKey: 'ach.first_land.label',    descKey: 'ach.first_land.desc',    check: (lb) => Object.keys(lb).length >= 1 },
  { id: 'all_planets',   labelKey: 'ach.all_planets.label',   descKey: 'ach.all_planets.desc',   check: (lb) => CAMPAIGN_ORDER.every(id => lb[id]) },
  { id: 'perfect',       labelKey: 'ach.perfect.label',       descKey: 'ach.perfect.desc',       check: (lb) => Object.values(lb).some(e => e.stars >= 3) },
  { id: 'speed_moon',    labelKey: 'ach.speed_moon.label',    descKey: 'ach.speed_moon.desc',    check: (lb) => lb['moon'] && lb['moon'].time <= 20 },
  { id: 'full_fuel',     labelKey: 'ach.full_fuel.label',     descKey: 'ach.full_fuel.desc',     check: (_lb, s, g) => s && g && s.fuel / g.lander.fuelMax > 0.90 },
  { id: 'venus_clear',   labelKey: 'ach.venus_clear.label',   descKey: 'ach.venus_clear.desc',   check: (lb) => !!lb['venus'] },
  { id: 'pluto_clear',   labelKey: 'ach.pluto_clear.label',   descKey: 'ach.pluto_clear.desc',   check: (lb) => !!lb['pluto'] },
  { id: 'no_retro',      labelKey: 'ach.no_retro.label',      descKey: 'ach.no_retro.desc',      check: (_lb, _s, g) => g && !g._usedRetro },
  { id: 'survive3',      labelKey: 'ach.survive3.label',      descKey: 'ach.survive3.desc',      check: (_lb, _s, g) => g && g._hazardCount >= 3 },
  { id: 'mission_bonus', labelKey: 'ach.mission_bonus.label', descKey: 'ach.mission_bonus.desc', check: (_lb, s) => s && s._missionBonus >= 40 },
];

export { ACHIEVEMENTS };

// ─── Check & unlock ─────────────────────────────────────────────────────────

export function checkAchievements(score, game) {
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

// ─── Achievement popup ──────────────────────────────────────────────────────

export function showAchievementPopup(ach) {
  const el = document.getElementById('ach-popup');
  if (!el) return;
  el.querySelector('#ach-label').textContent = t(ach.labelKey);
  el.querySelector('#ach-desc').textContent = t(ach.descKey);
  el.classList.remove('hidden');
  el.classList.add('ach-slide-in');
  setTimeout(() => {
    el.classList.remove('ach-slide-in');
    el.classList.add('ach-slide-out');
    setTimeout(() => { el.classList.add('hidden'); el.classList.remove('ach-slide-out'); }, 600);
  }, 3000);
}

// ─── Achievements modal ─────────────────────────────────────────────────────

export function renderAchievementsModal() {
  const unlocked = new Set(loadAchievements());
  const list = document.getElementById('ach-list');
  if (!list) return;
  list.innerHTML = ACHIEVEMENTS.map(a => {
    const done = unlocked.has(a.id);
    return `<div class="ach-item ${done ? 'done' : 'locked'}">
      <span class="ach-icon">${done ? '✔' : '🔒'}</span>
      <div><div class="ach-name">${t(a.labelKey)}</div><div class="ach-desc-small">${t(a.descKey)}</div></div>
    </div>`;
  }).join('');
}
