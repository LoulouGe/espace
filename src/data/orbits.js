import { t } from '../i18n/i18n.js';

// ─── Orbital mechanics data ─────────────────────────────────────────────────
// Extracted from astronomy.js. Display `name` properties removed from orbital
// elements -- callers use orbitBodyName() instead.

export const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

// Each planet: L0 = mean longitude at J2000 (degrees), dL = daily motion (deg/day)
export const ORBITAL_ELEMENTS = [
  { id: 'mercury', L0: 252.25, dL: 4.09234, color: '#a8a8a8', r: 4,  orbitR: 58 },
  { id: 'venus',   L0: 181.98, dL: 1.60214, color: '#e8c56a', r: 7,  orbitR: 92 },
  { id: 'earth',   L0: 100.46, dL: 0.98565, color: '#2e86ab', r: 8,  orbitR: 128 },
  { id: 'mars',    L0: 355.43, dL: 0.52404, color: '#c1440e', r: 6,  orbitR: 170 },
  { id: 'jupiter', L0: 34.40,  dL: 0.08306, color: '#c88b3a', r: 17, orbitR: 230 },
  { id: 'saturn',  L0: 49.94,  dL: 0.03346, color: '#e4d191', r: 13, orbitR: 290 },
  { id: 'uranus',  L0: 313.23, dL: 0.01177, color: '#7de8e8', r: 11, orbitR: 345 },
  { id: 'neptune', L0: 304.88, dL: 0.00600, color: '#3f54ba', r: 10, orbitR: 390 },
];

export const EARTH_EL   = ORBITAL_ELEMENTS.find(el => el.id === 'earth');
export const JUPITER_EL = ORBITAL_ELEMENTS.find(el => el.id === 'jupiter');
export const SATURN_EL  = ORBITAL_ELEMENTS.find(el => el.id === 'saturn');

// Orbit display radii (pixels at base scale 1.0, i.e. canvas 900px min dim)
export const BASE_ORBIT_R = [58, 92, 128, 170, 230, 290, 345, 390];

// Satellite elements
export const MOON_EL   = { id: 'moon',   L0: 218.3, dL: 13.1764, color: '#b8b8b8', r: 3, orbitR: 0 };
export const TITAN_EL  = { id: 'titan',  L0: 120.0, dL: 22.577,  color: '#cc8833', r: 3, orbitR: 0 };
export const IO_EL     = { id: 'io',     L0: 84.1,  dL: 203.49,  color: '#d4a820', r: 3, orbitR: 0 };
export const EUROPA_EL = { id: 'europa', L0: 171.6, dL: 101.37,  color: '#7aade0', r: 3, orbitR: 0 };
export const PLUTO_EL  = { id: 'pluto',  L0: 238.9, dL: 0.00397, color: '#c0aa88', r: 4, orbitR: 0 };

export const PLUTO_ORBIT_R = 440;

export const GAS_GIANTS = new Set(['jupiter', 'saturn', 'uranus', 'neptune']);
export const LANDABLE   = new Set(['moon', 'mercury', 'mars', 'titan', 'earth', 'venus', 'io', 'europa', 'pluto']);

export const LANDABLE_STARS = { moon: 1, mercury: 2, mars: 3, titan: 3, earth: 4, venus: 5, io: 4, europa: 4, pluto: 5 };

// Semi-major axis in AU (for approximate distance calculations)
export const PLANET_AU = {
  mercury: 0.387, venus: 0.723, earth: 1.000, mars: 1.524,
  jupiter: 5.203, saturn: 9.537, uranus: 19.19, neptune: 30.07, pluto: 39.48,
};
export const AU_KM = 149597871;

// ─── i18n helpers ────────────────────────────────────────────────────────────
// PLANET_FACTS removed -- facts now come from i18n.

export function getFact(id, idx) {
  return t('fact.' + id + '.' + idx);
}

export function orbitBodyName(id) {
  return t('body.' + id + '.name');
}
