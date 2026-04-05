import { t } from '../i18n/i18n.js';
import { seededRand } from '../utils.js';

// ─── Planet gameplay configurations ─────────────────────────────────────────
// Extracted from lander.js BODY_DATA. Display strings (name, desc, conditions)
// removed -- they now come from i18n via bodyName(), bodyDesc(), bodyConditions().
// condCount preserves the original conditions array length for UI layout.

export const BODY_DATA = {
  moon: {
    emoji: '\u{1F315}', stars: 1, condCount: 3,
    gravity: 1.24,
    thrustAssist: 1.14,
    retroAssist: 1.08,
    drag: 0,
    windType: 'none', windBase: 0, windAmp: 0,
    groundColor: '#8a8a8a', groundAccent: '#606060', groundDark: '#404040',
    skyTop: '#000000', skyBot: '#000018',
    showStars: true, starAlpha: 1.0,
    hasFog: false,
    terrainRoughness: 0.75,
    padWidth: 80, startAlt: 165, startFuel: 800,
    maxVSpeed: 4.0, maxHSpeed: 3.0, maxAngle: 20,
    hazardType: 'none',
  },
  mercury: {
    emoji: '\u26AB', stars: 2, condCount: 4,
    gravity: 3.70,
    hazardRate: 1.05,
    hazardPower: 1.0,
    drag: 0,
    windType: 'none', windBase: 0, windAmp: 0,
    groundColor: '#707070', groundAccent: '#505050', groundDark: '#303030',
    skyTop: '#000000', skyBot: '#050508',
    showStars: true, starAlpha: 0.9,
    hasFog: false,
    terrainRoughness: 1.05,
    padWidth: 66, startAlt: 170, startFuel: 900,
    maxVSpeed: 3.5, maxHSpeed: 2.3, maxAngle: 16,
    hazardType: 'flare',
  },
  mars: {
    emoji: '\u{1F534}', stars: 3, condCount: 4,
    gravity: 3.72,
    hazardRate: 1.12,
    hazardPower: 1.06,
    drag: 0.004,
    windType: 'gusty', windBase: 3, windAmp: 10,
    windGustChance: 0.0015,
    hasDustStorm: true, dustStormChance: 0.0003,
    groundColor: '#8b3a0f', groundAccent: '#5a2808', groundDark: '#3a1805',
    skyTop: '#7a2010', skyBot: '#c04520',
    showStars: false, starAlpha: 0,
    hasFog: true, fogColor: 'rgba(180,80,30,0.18)',
    terrainRoughness: 0.8,
    padWidth: 60, startAlt: 165, startFuel: 1000,
    maxVSpeed: 3.2, maxHSpeed: 2.0, maxAngle: 13,
    hazardType: 'magnetic',
  },
  titan: {
    emoji: '\u{1F7E0}', stars: 4, condCount: 4,
    gravity: 1.35,
    hazardRate: 1.2,
    hazardPower: 1.12,
    drag: 0.014,
    windType: 'shear', windBase: 4.5, windAmp: 8,
    groundColor: '#704214', groundAccent: '#4a2a0a', groundDark: '#2a1505',
    skyTop: '#552200', skyBot: '#aa5500',
    showStars: false, starAlpha: 0,
    hasFog: true, fogColor: 'rgba(200,100,0,0.3)',
    terrainRoughness: 0.64,
    padWidth: 58, startAlt: 165, startFuel: 1200,
    maxVSpeed: 3.7, maxHSpeed: 2.3, maxAngle: 16,
    hazardType: 'downburst',
  },
  earth: {
    emoji: '\u{1F30D}', stars: 4, condCount: 4,
    gravity: 9.81,
    hazardRate: 1.26,
    hazardPower: 1.16,
    drag: 0.007,
    windType: 'turbulent', windBase: 3.2, windAmp: 8,
    groundColor: '#2d7a2d', groundAccent: '#1a4a1a', groundDark: '#0a2a0a',
    skyTop: '#08204e', skyBot: '#1a5276',
    showStars: false, starAlpha: 0,
    hasFog: true, fogColor: 'rgba(100,150,255,0.12)',
    hasClouds: true,
    terrainRoughness: 0.52,
    padWidth: 56, startAlt: 155, startFuel: 1600,
    maxVSpeed: 3.4, maxHSpeed: 2.0, maxAngle: 15,
    hazardType: 'lightning',
  },
  venus: {
    emoji: '\u{1F315}', stars: 5, condCount: 5,
    gravity: 8.87,
    hazardRate: 1.38,
    hazardPower: 1.24,
    drag: 0.03,
    windType: 'hurricane', windBase: 6, windAmp: 12,
    groundColor: '#5a2a05', groundAccent: '#3a1502', groundDark: '#1a0800',
    skyTop: '#5a1500', skyBot: '#aa3000',
    showStars: false, starAlpha: 0,
    hasFog: true, fogColor: 'rgba(255,80,0,0.35)',
    terrainRoughness: 0.95,
    padWidth: 48, startAlt: 165, startFuel: 2500,
    maxVSpeed: 3.1, maxHSpeed: 1.7, maxAngle: 12,
    hazardType: 'acidrain',
  },
  io: {
    emoji: '\u{1F7E1}', stars: 5, condCount: 4,
    gravity: 1.79,
    hazardRate: 1.5,
    hazardPower: 1.34,
    drag: 0.002,
    windType: 'gusty', windBase: 2, windAmp: 5, windGustChance: 0.0013,
    groundColor: '#d4a820', groundAccent: '#a07810', groundDark: '#5a3800',
    skyTop: '#1a0800', skyBot: '#3a1200',
    showStars: true, starAlpha: 0.65,
    hasFog: true, fogColor: 'rgba(255,160,20,0.18)',
    terrainRoughness: 1.02,
    padWidth: 44, startAlt: 172, startFuel: 1300,
    maxVSpeed: 3.0, maxHSpeed: 1.8, maxAngle: 12,
    hazardType: 'volcano',
  },
  europa: {
    emoji: '\u{1F535}', stars: 5, condCount: 4,
    gravity: 1.31,
    hazardRate: 1.62,
    hazardPower: 1.42,
    drag: 0.005,
    windType: 'shear', windBase: 2.4, windAmp: 5.2,
    groundColor: '#b8d4f8', groundAccent: '#7aaae0', groundDark: '#305898',
    skyTop: '#000818', skyBot: '#001838',
    showStars: true, starAlpha: 0.88,
    hasFog: true, fogColor: 'rgba(130,185,255,0.10)',
    terrainRoughness: 0.42,
    padWidth: 40, startAlt: 172, startFuel: 1100,
    maxVSpeed: 2.8, maxHSpeed: 1.7, maxAngle: 11,
    hazardType: 'geyser',
  },
  pluto: {
    emoji: '\u26AA', stars: 5, condCount: 4,
    gravity: 0.62,
    hazardRate: 1.78,
    hazardPower: 1.52,
    drag: 0.001,
    windType: 'shear', windBase: 1.8, windAmp: 4.2,
    groundColor: '#c0aa88', groundAccent: '#907858', groundDark: '#503828',
    skyTop: '#000004', skyBot: '#040010',
    showStars: true, starAlpha: 1.0,
    hasFog: false,
    terrainRoughness: 0.8,
    padWidth: 36, startAlt: 185, startFuel: 800,
    maxVSpeed: 2.5, maxHSpeed: 1.5, maxAngle: 10,
    hazardType: 'solarwind',
  },
};

// ─── i18n helpers ────────────────────────────────────────────────────────────

export function bodyName(id) { return t('body.' + id + '.name'); }
export function bodyDesc(id) { return t('body.' + id + '.desc'); }
export function bodyConditions(id) {
  const n = BODY_DATA[id] ? BODY_DATA[id].condCount : 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      ci: t('body.' + id + '.cond.' + i + '.ci'),
      txt: t('body.' + id + '.cond.' + i + '.txt'),
    });
  }
  return out;
}

// ─── Campaign order ─────────────────────────────────────────────────────────

export const CAMPAIGN_ORDER = ['moon', 'mercury', 'mars', 'titan', 'earth', 'venus', 'io', 'europa', 'pluto'];

// ─── Secondary missions ─────────────────────────────────────────────────────
// label/desc replaced with i18n keys; check functions preserved as-is.

export const SECONDARY_MISSIONS = [
  { id: 'fast',    labelKey: 'mission.fast.label',    descKey: 'mission.fast.desc',    check: s => s.time <= 35,                                                       reward: 25 },
  { id: 'fuel',    labelKey: 'mission.fuel.label',    descKey: 'mission.fuel.desc',    check: (s, g) => s.fuel / g.lander.fuelMax > 0.70,                               reward: 30 },
  { id: 'precise', labelKey: 'mission.precise.label', descKey: 'mission.precise.desc', check: s => s.precisionBonus >= 250,                                             reward: 20 },
  { id: 'smooth',  labelKey: 'mission.smooth.label',  descKey: 'mission.smooth.desc',  check: (s, g) => g._landVS !== undefined && g._landVS < 1.5,                     reward: 25 },
  { id: 'noretro', labelKey: 'mission.noretro.label', descKey: 'mission.noretro.desc', check: (s, g) => !g._usedRetro,                                                  reward: 20 },
  { id: 'tilt',    labelKey: 'mission.tilt.label',    descKey: 'mission.tilt.desc',    check: (s, g) => g._landAngle !== undefined && Math.abs(g._landAngle) < 5,        reward: 20 },
  { id: 'hazard',  labelKey: 'mission.hazard.label',  descKey: 'mission.hazard.desc',  check: (s, g) => g._hazardCount >= 2,                                            reward: 35 },
  { id: 'stars3',  labelKey: 'mission.stars3.label',  descKey: 'mission.stars3.desc',  check: s => s.stars === 3,                                                       reward: 30 },
];

export function pickMissions(bodyId, seed) {
  const rng = seededRand(seed);
  const pool = [...SECONDARY_MISSIONS];
  const picks = [];
  while (picks.length < 2 && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}
