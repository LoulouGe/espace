// src/storage.js

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem('sl_progress') || '{}'); } catch { return {}; }
}
export function saveProgress(p) {
  try { localStorage.setItem('sl_progress', JSON.stringify(p)); } catch { }
}
export function loadDiamonds() {
  try { return parseInt(localStorage.getItem('sl_diamonds') || '0', 10); } catch { return 0; }
}
export function saveDiamonds(v) {
  try { localStorage.setItem('sl_diamonds', String(v)); } catch { }
}
export function loadShips() {
  try { return JSON.parse(localStorage.getItem('sl_ships') || '["standard"]'); } catch { return ['standard']; }
}
export function saveShips(s) {
  try { localStorage.setItem('sl_ships', JSON.stringify(s)); } catch { }
}
export function loadActiveShip() {
  try { return localStorage.getItem('sl_active_ship') || 'standard'; } catch { return 'standard'; }
}
export function saveActiveShip(id) {
  try { localStorage.setItem('sl_active_ship', id); } catch { }
}
export function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem('sl_lb') || '{}'); } catch { return {}; }
}
export function saveLeaderboard(lb) {
  try { localStorage.setItem('sl_lb', JSON.stringify(lb)); } catch { }
}
export function saveGhost(id, frames) {
  try {
    const limited = frames.slice(0, 2000);
    localStorage.setItem('sl_ghost_' + id, JSON.stringify(limited));
  } catch { }
}
export function loadGhost(id) {
  try {
    const raw = localStorage.getItem('sl_ghost_' + id);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function loadAchievements() {
  try { return JSON.parse(localStorage.getItem('sl_ach') || '[]'); } catch { return []; }
}
export function saveAchievements(a) {
  try { localStorage.setItem('sl_ach', JSON.stringify(a)); } catch { }
}
export function loadUpgrades() {
  try { return JSON.parse(localStorage.getItem('sl_upgrades') || '{}'); } catch { return {}; }
}
export function saveUpgrades(u) {
  try { localStorage.setItem('sl_upgrades', JSON.stringify(u)); } catch { }
}
export function loadDailyScore(key) {
  try { return JSON.parse(localStorage.getItem('sl_daily_' + key) || 'null'); } catch { return null; }
}
export function saveDailyScore(key, score) {
  try { localStorage.setItem('sl_daily_' + key, JSON.stringify(score)); } catch { }
}
