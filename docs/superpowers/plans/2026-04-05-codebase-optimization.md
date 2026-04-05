# Space Lander Codebase Optimization -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Space Lander from 3 monolithic files into ES6 modules, fix 7 bugs, add French/English i18n, and create a CLAUDE.md.

**Architecture:** Incremental module extraction -- move classes and functions from the 3 existing files into focused ES6 modules under `src/`, wire them together with imports, then delete the originals. No build tools. `<script type="module" src="src/app.js">` replaces the 3 `<script>` tags.

**Tech Stack:** Vanilla JavaScript (ES6 modules), HTML5 Canvas 2D, CSS3, localStorage.

---

## File Structure

### New files to create:

| File | Responsibility |
|------|---------------|
| `src/i18n/fr.js` | French translation strings |
| `src/i18n/en.js` | English translation strings |
| `src/i18n/i18n.js` | Language loader, `t()` function, DOM updater |
| `src/data/bodies.js` | `BODY_DATA` (gameplay-only values), `CAMPAIGN_ORDER`, `SECONDARY_MISSIONS`, `seededRand()`, `pickMissions()` |
| `src/data/shop.js` | `SHOP_CATALOG`, `UPGRADE_CATALOG`, `getShipPalette()`, `drawShipPreview()`, `BASE_REWARDS`, `VENUS_BOSS_REWARD` |
| `src/data/orbits.js` | `ORBITAL_ELEMENTS`, satellite elements, `PLANET_AU`, `AU_KM`, `GAS_GIANTS`, `LANDABLE`, `LANDABLE_STARS`, `BASE_ORBIT_R`, `PLUTO_ORBIT_R` |
| `src/engine/terrain.js` | `Terrain` class |
| `src/engine/lander.js` | `Lander` class |
| `src/engine/particles.js` | `ParticleSystem` class |
| `src/engine/wind.js` | `WindSystem` class |
| `src/engine/hazards.js` | `HazardSystem` class |
| `src/engine/game.js` | `LanderGame` class, `MeteorSystem`, `genLandingStars()`, `genClouds()` |
| `src/solar/solar-system.js` | `SolarSystem` class, `drawOrbitalBody()`, `drawInfoChip()`, helper functions |
| `src/solar/solar-meteors.js` | `SolarMeteorSystem` class |
| `src/ui/hud.js` | `updateHUD()`, `renderMissionsHUD()`, `updateMissionsHUD()`, `evaluateMissions()` |
| `src/ui/cards.js` | `showPlanetCard()`, `showResultCard()`, shop/upgrade UI functions |
| `src/ui/tooltips.js` | `showTooltip()`, `showTooltipHTML()`, `nonLandableMsg()` |
| `src/ui/achievements.js` | `ACHIEVEMENTS`, `checkAchievements()`, `renderAchievementsModal()`, `showAchievementPopup()` |
| `src/storage.js` | All `load*`/`save*` functions for localStorage |
| `src/input.js` | Keyboard + touch input handler, `keys` object |
| `src/state.js` | State enum `S`, timing constants (`FADE_DURATION`, `SURVEY_DURATION`, etc.) |
| `src/utils.js` | Shared utilities: `colorAlpha()`, `lighten()`, `lightenColor()`, `hexAlpha()`, `mixHex()`, `easeInOut()` |
| `src/app.js` | Entry point: canvas, `AppState`, main loop, state transitions, event listeners |
| `CLAUDE.md` | Project documentation for contributors |

### Files to modify:
| File | Change |
|------|--------|
| `index.html` | Replace 3 `<script>` tags with `<script type="module" src="src/app.js">`, add `data-i18n` attributes, add language toggle button, remove dead `data-speed` buttons |

### Files to delete:
| File | Reason |
|------|--------|
| `main.js` | Replaced by `src/app.js` + `src/ui/*` + `src/storage.js` + `src/input.js` + `src/state.js` |
| `lander.js` | Replaced by `src/engine/*` + `src/data/bodies.js` + `src/data/shop.js` |
| `astronomy.js` | Replaced by `src/solar/*` + `src/data/orbits.js` |

---

## Task 1: Create utility and state modules

**Files:**
- Create: `src/utils.js`
- Create: `src/state.js`

- [ ] **Step 1: Create `src/utils.js`**

Extract shared utility functions from `lander.js` and `astronomy.js`:

```js
// src/utils.js

export function colorAlpha(color, alpha) {
  if (!color) return color;
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (color.startsWith('rgba(')) {
    return color.replace(/rgba\(([^)]+),[^,]+\)$/, `rgba($1,${alpha})`);
  }
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
  }
  return color;
}

export function lighten(hex, amt) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amt);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amt);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amt);
  return `rgb(${r},${g},${b})`;
}

// Alias used in astronomy.js
export const lightenColor = lighten;

export function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function mixHex(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${b2})`;
}

export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function seededRand(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
```

- [ ] **Step 2: Create `src/state.js`**

```js
// src/state.js

export const S = {
  SOLAR: 'solar',
  FADING: 'fading',
  SELECT: 'select',
  PLAYING: 'playing',
  RESULT: 'result',
  COUNTDOWN: 'countdown',
  SURVEY: 'survey',
  SHOP: 'shop',
};

export const FADE_DURATION = 0.9;
export const SURVEY_DURATION = 2.0;
export const COUNTDOWN_DURATION = 3;
export const CRASH_DELAY = 1.4;
export const LAND_DELAY = 4.5;
export const ZOOM_STEP = 1.12;
export const VIEW_MIN = 1.0;
export const VIEW_MAX = 4.0;
```

- [ ] **Step 3: Verify both files parse correctly**

Run: `node --check src/utils.js && node --check src/state.js`
Expected: No output (success)

- [ ] **Step 4: Commit**

```bash
git add src/utils.js src/state.js
git commit -m "refactor: extract utility functions and state constants into ES6 modules"
```

---

## Task 2: Create i18n system with French and English

**Files:**
- Create: `src/i18n/i18n.js`
- Create: `src/i18n/fr.js`
- Create: `src/i18n/en.js`

- [ ] **Step 1: Create `src/i18n/fr.js`**

Extract ALL French strings from the codebase into a flat key-value map. This includes:
- HUD labels from `index.html` (CARBURANT, ALT, VIT, INCL, VENT, etc.)
- Planet names, descriptions, and conditions from `BODY_DATA` in `lander.js`
- Planet facts from `PLANET_FACTS` in `astronomy.js`
- Shop item names/descriptions from `SHOP_CATALOG` in `main.js`
- Upgrade names/descriptions from `UPGRADE_CATALOG` in `main.js`
- Achievement labels/descriptions from `ACHIEVEMENTS` in `main.js`
- Secondary mission labels/descriptions from `SECONDARY_MISSIONS` in `lander.js`
- Result messages, button labels, tooltips, warnings from `main.js`
- Hazard warnings from `HazardSystem` in `lander.js`
- All other UI text (modal titles, error messages, etc.)

The file must be a complete mapping -- every user-visible French string in the game.

```js
// src/i18n/fr.js
export default {
  // HUD
  'hud.alt': 'ALT',
  'hud.vspeed': 'VIT \u2193',
  'hud.hspeed': 'VIT \u2192',
  'hud.incl': 'INCL',
  'hud.fuel': 'CARBURANT',
  'hud.wind': 'VENT',
  'hud.storm': '\u26a0 TEMP\u00caTE',
  'hud.record': 'RECORD',
  'hud.timer': '00:00',
  'hud.pad': '\u25bc PAD',

  // Missions HUD
  'missions.header': 'OBJECTIFS DE MISSION',
  'missions.title': 'Bonus tactiques',
  'missions.lock': "D\u00e9blocage \u00e0 l'atterrissage",
  'missions.subtitle': "Remplissez les conditions en vol, les r\u00e9compenses ne sont valid\u00e9es qu'apr\u00e8s un atterrissage r\u00e9ussi.",
  'missions.pending': 'En attente',
  'missions.ready': 'Pr\u00eat \u00e0 valider',
  'missions.complete': 'D\u00e9bloqu\u00e9',

  // Navigation buttons
  'nav.daily': '\ud83d\udcc5 D\u00c9FI DU JOUR',
  'nav.achievements': '\ud83c\udfc6 SUCC\u00c8S',
  'nav.upgrades': '\ud83d\udee0 AM\u00c9LIORATIONS',
  'nav.shop': '\ud83d\uded2 HANGAR',

  // Shop
  'shop.title': 'HANGAR SPATIAL',
  'shop.balance': 'Fonds disponibles:',
  'shop.close': 'FERMER',
  'shop.equipped': '\u00c9QUIP\u00c9',
  'shop.select': 'S\u00c9LECTIONNER',
  'shop.standard.name': 'Module Standard',
  'shop.standard.desc': "Le mod\u00e8le d'origine. \u00c9quilibr\u00e9 et polyvalent.",
  'shop.moustique.name': 'Le Moustique',
  'shop.moustique.desc': 'Agile, rotation v.rapide. Tr\u00e8s peu de fuel. Parfait pour la pr\u00e9cision extr\u00eame.',
  'shop.tank.name': 'Le Tank',
  'shop.tank.desc': 'Lourd et blind\u00e9. Double r\u00e9serve de fuel. Impose une r\u00e9duction aux forces ext\u00e9rieures. Rotation lente.',
  'shop.alien.name': 'Vaisseau Alien',
  'shop.alien.desc': "Moteurs \u00e0 antigravit\u00e9 surpuissants ! Immunit\u00e9 TOTALE \u00e0 l'acide, aux pannes solaires et au magn\u00e9tisme.",

  // Achievements
  'ach.title': 'SUCC\u00c8S',
  'ach.close': 'FERMER',
  'ach.popup': 'SUCC\u00c8S D\u00c9VERROUILL\u00c9',
  'ach.first_land.label': '\ud83d\ude80 Premier Atterrissage',
  'ach.first_land.desc': 'R\u00e9ussir un premier atterrissage.',
  'ach.all_planets.label': '\ud83c\udf0c Grand Tour',
  'ach.all_planets.desc': 'Atterrir sur toutes les plan\u00e8tes.',
  'ach.perfect.label': '\u2b50 Pilote Parfait',
  'ach.perfect.desc': "Obtenir 3\u2605 sur n'importe quelle plan\u00e8te.",
  'ach.speed_moon.label': '\u23f1 V\u00e9loce',
  'ach.speed_moon.desc': 'Atterrir sur la Lune en moins de 20s.',
  'ach.full_fuel.label': '\u26fd \u00c9conome',
  'ach.full_fuel.desc': 'Atterrir avec >90% de carburant.',
  'ach.venus_clear.label': '\ud83d\udd25 Conqu\u00e9rant de V\u00e9nus',
  'ach.venus_clear.desc': 'Atterrir sur V\u00e9nus.',
  'ach.pluto_clear.label': '\u2744 Aux Confins',
  'ach.pluto_clear.desc': 'Atterrir sur Pluton.',
  'ach.no_retro.label': '\ud83d\udeab Pure Pouss\u00e9e',
  'ach.no_retro.desc': 'Atterrir sans r\u00e9trofus\u00e9es.',
  'ach.survive3.label': '\ud83d\udcaa Survivant',
  'ach.survive3.desc': 'Survivre \u00e0 3 hazards en une partie.',
  'ach.mission_bonus.label': '\ud83c\udfaf Sur-Achiever',
  'ach.mission_bonus.desc': 'Compl\u00e9ter 2 missions secondaires.',

  // Upgrades
  'upgrades.title': 'AM\u00c9LIORATIONS',
  'upgrades.ship': 'Vaisseau:',
  'upgrades.funds': 'Fonds:',
  'upgrades.close': 'FERMER',
  'upgrades.max': 'MAX',
  'upgrade.thrust.name': '\ud83d\udd25 Propulseur +',
  'upgrade.thrust.desc': 'Pouss\u00e9e +15%. Le vaisseau r\u00e9pond plus vite et monte plus fort.',
  'upgrade.fuel_cap.name': '\u26fd R\u00e9servoir +',
  'upgrade.fuel_cap.desc': 'Capacit\u00e9 carburant +20%. Vous partez avec plus de temps devant vous.',
  'upgrade.gyro.name': '\ud83c\udf00 Gyroscope +',
  'upgrade.gyro.desc': 'Rotation +20% plus rapide. Corrections plus pr\u00e9cises.',
  'upgrade.rcs.name': '\ud83d\udee1 Stabilisateur',
  'upgrade.rcs.desc': 'Friction angulaire \u00d71.5. Le vaisseau se stabilise seul plus vite.',
  'upgrade.retro.name': '\ud83d\udca8 R\u00e9tro +',
  'upgrade.retro.desc': 'Puissance r\u00e9trofus\u00e9es +25%. D\u00e9c\u00e9l\u00e9ration plus efficace.',

  // Planet card
  'card.launch': '\ud83d\ude80 Lancer la Mission',
  'card.back': '\u2190 Retour',

  // Result card
  'result.success': 'ATTERRISSAGE R\u00c9USSI !',
  'result.fail': 'MISSION \u00c9CHOU\u00c9E',
  'result.retry': '\ud83d\udd04 R\u00e9essayer',
  'result.solar': '\ud83c\udf0c Syst\u00e8me Solaire',
  'result.time': 'Temps',
  'result.fuel': 'Carburant restant',
  'result.precision': 'Pr\u00e9cision',
  'result.score': 'Score',
  'result.best': '\ud83c\udfc6 Meilleur',
  'result.reward': '\ud83d\udc8e R\u00e9compense',
  'result.cause': 'Cause',
  'result.record': 'Meilleur score:',

  // Boss overlay
  'boss.title': 'V\u00c9NUS VAINCUE',
  'boss.text': "Vous avez surv\u00e9cu aux conditions extr\u00eames et avez dompt\u00e9 l'atmosph\u00e8re infernale de V\u00e9nus. Un exploit digne des plus grands pilotes de l'Histoire !",
  'boss.reward': '+500 \ud83d\udc8e \u2014 Conqu\u00e9rant de V\u00e9nus !',
  'boss.close': 'ACCEPTER LA R\u00c9COMPENSE',

  // Survey overlay
  'survey.title': '\u25c9  RECONNAISSANCE DE ZONE  \u25c9',
  'survey.subtitle': "Zone d'atterrissage rep\u00e9r\u00e9e \u2014 atterrissage imminent",

  // Error overlay
  'error.title': 'ERREUR JS :',
  'error.hint': 'Ouvre la console (F12) pour plus de d\u00e9tails',

  // Solar view
  'solar.hint': 'Cliquez sur une plan\u00e8te pour atterrir',
  'solar.reset': 'RESET',
  'solar.reset_confirm': 'Voulez-vous vraiment effacer votre progression (records, d\u00e9blocages, carburant, fant\u00f4mes) et recommencer \u00e0 z\u00e9ro ?',

  // Tooltips
  'tooltip.locked': 'Terminez d\'abord {planet} pour d\u00e9bloquer cette destination.',
  'tooltip.jupiter': "Jupiter est une g\u00e9ante gazeuse \u2014 pas de surface solide !",
  'tooltip.saturn': "Saturne est une g\u00e9ante gazeuse. Cliquez sur Titan pour atterrir.",
  'tooltip.uranus': "Uranus est une g\u00e9ante de glace \u2014 pas d'atterrissage possible.",
  'tooltip.neptune': "Neptune est une g\u00e9ante de glace \u2014 pas d'atterrissage possible.",
  'tooltip.default': 'Corps non atterrissable.',
  'tooltip.distance': '\ud83d\udce1 Distance Terre :',
  'tooltip.record': '\ud83c\udfc6 Record :',
  'tooltip.locked_short': '\ud83d\udd12 Terminez la plan\u00e8te pr\u00e9c\u00e9dente',

  // Collision reasons
  'collision.off_pad': "Hors de la zone d'atterrissage !",
  'collision.vspeed': 'Vitesse verticale trop \u00e9lev\u00e9e : {v} m/s (max {max})',
  'collision.hspeed': 'Vitesse horizontale trop \u00e9lev\u00e9e : {v} m/s (max {max})',
  'collision.angle': 'Inclinaison trop forte : {v}\u00b0 (max {max}\u00b0)',

  // Hazard warnings
  'hazard.meteor.warn': '\u2604 IMPACT M\u00c9T\u00c9ORITE IMMINENT !',
  'hazard.meteor.active': '\u2604 IMPACT M\u00c9T\u00c9ORITE !',
  'hazard.flare.warn': '\u2600 \u00c9RUPTION SOLAIRE IMMINENTE !',
  'hazard.flare.active': '\u2600 \u00c9RUPTION SOLAIRE \u2014 Moteur hors ligne !',
  'hazard.magnetic.warn': '\ud83e\uddf2 ORAGE MAGN\u00c9TIQUE IMMINENT !',
  'hazard.magnetic.active': '\ud83e\uddf2 ORAGE MAGN\u00c9TIQUE \u2014 Gyroscope invers\u00e9 !',
  'hazard.downburst.warn': '\u2b07 RAFALE VERTICALE IMMINENTE !',
  'hazard.downburst.active': '\u2b07 RAFALE VERTICALE !',
  'hazard.lightning.warn': '\u26a1 FOUDRE IMMINENTE !',
  'hazard.lightning.active': '\u26a1 FOUDRE \u2014 D\u00e9charge violente !',
  'hazard.acid.warn': '\u2620 PLUIE ACIDE IMMINENTE !',
  'hazard.acid.active': '\u2620 PLUIE ACIDE \u2014 Carburant corrod\u00e9 !',
  'hazard.volcano.warn': '\ud83c\udf0b \u00c9RUPTION VOLCANIQUE IMMINENTE !',
  'hazard.volcano.active': '\ud83c\udf0b IMPACT DE ROCHE VOLCANIQUE !',
  'hazard.geyser.warn': '\ud83d\udca6 GEYSER IMMINENT !',
  'hazard.geyser.active': '\ud83d\udca6 GEYSER \u2014 Pouss\u00e9e ascendante !',
  'hazard.solarwind.warn': '\u2600 RAFALE SOLAIRE IMMINENTE !',
  'hazard.solarwind.active': '\u2600 VENT SOLAIRE \u2014 D\u00e9rive lat\u00e9rale !',
  'hazard.no_retro_atmo': "\u274c PAS D'ATMOSPH\u00c8RE POUR R\u00c9TRO !",
  'hazard.storm_incoming': '\u26a0 TEMP\u00caTE IMMINENTE !',

  // Planet names
  'body.moon.name': 'Lune',
  'body.mercury.name': 'Mercure',
  'body.mars.name': 'Mars',
  'body.titan.name': 'Titan',
  'body.earth.name': 'Terre',
  'body.venus.name': 'V\u00e9nus',
  'body.io.name': 'Io',
  'body.europa.name': 'Europa',
  'body.pluto.name': 'Pluton',
  'body.jupiter.name': 'Jupiter',
  'body.saturn.name': 'Saturne',
  'body.uranus.name': 'Uranus',
  'body.neptune.name': 'Neptune',

  // Planet descriptions
  'body.moon.desc': "Notre satellite naturel. Faible gravit\u00e9, aucune atmosph\u00e8re, conditions pr\u00e9visibles. Id\u00e9al pour d\u00e9buter.",
  'body.mercury.desc': "Proche du Soleil, terrain chaotique. Des \u00e9ruptions solaires peuvent couper votre moteur au pire moment.",
  'body.mars.desc': "La plan\u00e8te rouge. Temp\u00eates de poussi\u00e8re et orages magn\u00e9tiques qui inversent vos commandes de rotation.",
  'body.titan.desc': "Lune de Saturne. Vents forts et rafales verticales descendantes soudaines. La faible gravit\u00e9 est votre seul atout.",
  'body.earth.desc': "Atterrir sur Terre est sous-estim\u00e9: forte gravit\u00e9, turbulences, et coups de foudre qui vous d\u00e9stabilisent.",
  'body.venus.desc': "ENFER. Vents d\u00e9vastateurs et pluies d'acide qui rongent votre carburant deux fois plus vite. R\u00e9serv\u00e9 aux meilleurs.",
  'body.io.desc': "La lune la plus volcanique du syst\u00e8me solaire. Des \u00e9ruptions projettent des rochers g\u00e9ants qui d\u00e9stabilisent violemment votre vaisseau.",
  'body.europa.desc': "Lune glac\u00e9e de Jupiter. Des geysers d'eau bouillante surgissent du sol et vous propulsent brutalement vers le haut.",
  'body.pluto.desc': "Aux confins du syst\u00e8me solaire. Gravit\u00e9 quasi-nulle mais un vent solaire incessant vous pousse lat\u00e9ralement sans rel\u00e2che.",

  // Planet conditions (array by index)
  'body.moon.cond.0': "\ud83c\udf11 Pas d'atmosph\u00e8re",
  'body.moon.cond.1': '\u2696\ufe0f Faible gravit\u00e9: 1.24 m/s\u00b2',
  'body.moon.cond.2': '\ud83e\udea8 Surface crat\u00e9ris\u00e9e',
  'body.mercury.cond.0': "\u26ab Pas d'atmosph\u00e8re",
  'body.mercury.cond.1': '\u2696\ufe0f Gravit\u00e9: 3.7 m/s\u00b2',
  'body.mercury.cond.2': '\ud83c\udf0b Terrain tr\u00e8s accident\u00e9',
  'body.mercury.cond.3': '\u2600\ufe0f \u00c9ruptions solaires (moteur coup\u00e9)',
  'body.mars.cond.0': '\ud83d\udca8 Vent soutenu: 3\u201313 m/s',
  'body.mars.cond.1': '\ud83c\udf2a\ufe0f Temp\u00eates de poussi\u00e8re',
  'body.mars.cond.2': '\ud83e\uddf2 Orages magn\u00e9tiques (gyroscope invers\u00e9)',
  'body.mars.cond.3': '\ud83c\udf2b\ufe0f Atmosph\u00e8re fine (CO\u2082)',
  'body.titan.cond.0': '\ud83d\udca8 Vents denses: 4\u201316 m/s',
  'body.titan.cond.1': '\ud83c\udf2b\ufe0f Atmosph\u00e8re \u00e9paisse (azote/m\u00e9thane)',
  'body.titan.cond.2': '\u2b07\ufe0f Rafales verticales soudaines',
  'body.titan.cond.3': '\u2696\ufe0f Faible gravit\u00e9: 1.35 m/s\u00b2',
  'body.earth.cond.0': '\ud83c\udf2c\ufe0f Vent: 4\u201314 m/s + turbulences',
  'body.earth.cond.1': '\u2696\ufe0f Forte gravit\u00e9: 9.81 m/s\u00b2',
  'body.earth.cond.2': '\u26a1 Risque de foudre (impulsion lat\u00e9rale)',
  'body.earth.cond.3': '\ud83c\udf0a Courants atmosph\u00e9riques',
  'body.venus.cond.0': '\ud83c\udf2a\ufe0f Vents: 9\u201324 m/s',
  'body.venus.cond.1': '\u2696\ufe0f Gravit\u00e9: 8.87 m/s\u00b2',
  'body.venus.cond.2': '\ud83d\udd25 Temp\u00e9rature: 462\u00b0C',
  'body.venus.cond.3': "\u2620\ufe0f Pluie d'acide (carburant 2\u00d7 plus vite)",
  'body.venus.cond.4': '\ud83d\udc80 Atmosph\u00e8re ultra-dense (CO\u2082)',
  'body.io.cond.0': '\ud83c\udf0b \u00c9ruptions volcaniques actives',
  'body.io.cond.1': '\ud83e\udea8 Rochers \u00e9ject\u00e9s sans pr\u00e9venir',
  'body.io.cond.2': '\u2622\ufe0f Radiation de Jupiter',
  'body.io.cond.3': '\u2696\ufe0f Gravit\u00e9: 1.79 m/s\u00b2, pad minuscule',
  'body.europa.cond.0': '\ud83e\uddca Surface de glace fractur\u00e9e',
  'body.europa.cond.1': "\ud83d\udca6 Geysers d'eau sous pression",
  'body.europa.cond.2': '\u2696\ufe0f Gravit\u00e9: 1.31 m/s\u00b2, fen\u00eatre tr\u00e8s serr\u00e9e',
  'body.europa.cond.3': '\ud83c\udf0a Oc\u00e9an souterrain instable',
  'body.pluto.cond.0': '\ud83c\udf2c\ufe0f Vent solaire violent et quasi constant',
  'body.pluto.cond.1': '\ud83e\udd76 Temp\u00e9rature: \u2212233\u00b0C',
  'body.pluto.cond.2': '\u2696\ufe0f Quasi-apesanteur: 0.62 m/s\u00b2',
  'body.pluto.cond.3': '\ud83d\udca8 Pouss\u00e9e ionique impr\u00e9visible',

  // Planet facts
  'fact.mercury.0': 'R\u00e9volution : 88 jours terrestres',
  'fact.mercury.1': 'Surface : \u2212180\u00b0C la nuit, +430\u00b0C le jour',
  'fact.mercury.2': 'Aucune lune, aucune atmosph\u00e8re',
  'fact.mercury.3': 'Son noyau repr\u00e9sente 85% de son rayon',
  'fact.venus.0': 'Rotation r\u00e9trograde \u2014 le Soleil se l\u00e8ve \u00e0 l\'ouest',
  'fact.venus.1': 'Pression atm. : 90\u00d7 celle de la Terre',
  'fact.venus.2': 'Une journ\u00e9e v\u00e9nusienne dure plus qu\'une ann\u00e9e',
  'fact.venus.3': 'Plan\u00e8te la plus chaude : 462\u00b0C en permanence',
  'fact.earth.0': 'Seule plan\u00e8te connue abritant la vie',
  'fact.earth.1': '71% de la surface est de l\'eau',
  'fact.earth.2': 'La Lune stabilise l\'inclinaison axiale \u00e0 23\u00b0',
  'fact.earth.3': 'Le champ magn\u00e9tique d\u00e9vie les vents solaires',
  'fact.mars.0': 'Olympus Mons : 22 km de haut, 3\u00d7 l\'Everest',
  'fact.mars.1': 'Un sol martien dure 24h 37min',
  'fact.mars.2': 'La poussi\u00e8re colore le ciel en rose-orang\u00e9',
  'fact.mars.3': 'Deux lunes : Phobos (d\u00e9clin) et Deimos',
  'fact.jupiter.0': '1 300 Terres tiendraient dans Jupiter',
  'fact.jupiter.1': 'La Grande Tache Rouge dure depuis 350+ ans',
  'fact.jupiter.2': '95 lunes confirm\u00e9es',
  'fact.jupiter.3': 'Champ magn\u00e9tique 20 000\u00d7 celui de la Terre',
  'fact.saturn.0': 'Anneaux : 70 000 km de large, <1 km d\'\u00e9paisseur',
  'fact.saturn.1': 'Densit\u00e9 inf\u00e9rieure \u00e0 l\'eau \u2014 il flotterait !',
  'fact.saturn.2': '146 lunes connues',
  'fact.saturn.3': 'Les anneaux dispara\u00eetront dans ~100 Ma',
  'fact.uranus.0': 'Axe inclin\u00e9 \u00e0 98\u00b0 \u2014 il \'roule\' autour du Soleil',
  'fact.uranus.1': 'Saisons de 21 ans terrestres chacune',
  'fact.uranus.2': '27 lunes nomm\u00e9es d\'apr\u00e8s Shakespeare',
  'fact.uranus.3': 'Plan\u00e8te la plus froide : \u2212224\u00b0C',
  'fact.neptune.0': 'Vents \u00e0 2 100 km/h \u2014 record du syst\u00e8me solaire',
  'fact.neptune.1': 'Voyager 2 seul visiteur humain (1989)',
  'fact.neptune.2': 'Un an Neptune = 165 ans terrestres',
  'fact.neptune.3': 'Triton orbite \u00e0 l\'envers et se rapproche',
  'fact.moon.0': 'S\'\u00e9loigne de la Terre de 3,8 cm par an',
  'fact.moon.1': '12 humains y ont march\u00e9 entre 1969 et 1972',
  'fact.moon.2': 'Toujours la m\u00eame face est tourn\u00e9e vers la Terre',
  'fact.moon.3': 'Ses mar\u00e9es ralentissent la rotation terrestre',
  'fact.titan.0': 'Seule lune du syst\u00e8me avec une atmosph\u00e8re dense',
  'fact.titan.1': 'Lacs de m\u00e9thane liquide en surface',
  'fact.titan.2': 'Pression atm. : 1,45\u00d7 celle de la Terre',
  'fact.titan.3': 'Temp\u00e9rature : \u2212179\u00b0C',
  'fact.io.0': 'La lune la plus volcanique du syst\u00e8me solaire',
  'fact.io.1': 'Plus de 400 volcans actifs recens\u00e9s',
  'fact.io.2': '\u00c9ruptions visibles depuis l\'espace',
  'fact.io.3': 'Chauff\u00e9e par les mar\u00e9es gravitationnelles de Jupiter',
  'fact.europa.0': 'Poss\u00e8de un oc\u00e9an liquide sous sa glace',
  'fact.europa.1': 'Surface parmi les plus lisses du syst\u00e8me solaire',
  'fact.europa.2': 'Candidat no.1 pour la vie extraterrestre',
  'fact.europa.3': "Les geysers d'eau jaillissent \u00e0 200 km de hauteur",
  'fact.pluto.0': 'Class\u00e9 plan\u00e8te naine depuis 2006',
  'fact.pluto.1': 'Son ann\u00e9e dure 248 ans terrestres',
  'fact.pluto.2': "Charon est si gros qu'ils s'orbitent mutuellement",
  'fact.pluto.3': "New Horizons l'a survol\u00e9 en 2015",

  // Secondary missions
  'mission.fast.label': '\u23f1 Atterrir en moins de 35s',
  'mission.fast.desc': "Gardez un rythme agressif jusqu'au toucher final.",
  'mission.fuel.label': '\u26fd Atterrir avec >70% de carburant',
  'mission.fuel.desc': 'Optimisez la pouss\u00e9e pour pr\u00e9server vos r\u00e9serves.',
  'mission.precise.label': '\ud83c\udfaf Atterrissage de pr\u00e9cision (>250)',
  'mission.precise.desc': 'Posez-vous au plus pr\u00e8s du centre de la zone.',
  'mission.smooth.label': "\ud83e\udeb6 Vitesse \u2193 < 1.5 m/s \u00e0 l'impact",
  'mission.smooth.desc': 'Touchez le sol avec une descente parfaitement douce.',
  'mission.noretro.label': '\ud83d\udeab Sans utiliser les r\u00e9trofus\u00e9es',
  'mission.noretro.desc': 'Reposez-vous uniquement sur la pouss\u00e9e principale.',
  'mission.tilt.label': "\ud83d\udcd0 Angle < 5\u00b0 \u00e0 l'atterrissage",
  'mission.tilt.desc': 'Gardez le module presque parfaitement droit.',
  'mission.hazard.label': '\u26a1 Survivre \u00e0 2 hazards',
  'mission.hazard.desc': 'Tenez bon malgr\u00e9 les perturbations du terrain.',
  'mission.stars3.label': '\u2b50 Atteindre 3 \u00e9toiles',
  'mission.stars3.desc': 'R\u00e9ussissez une prestation irr\u00e9prochable.',

  // Misc
  'landing_zone': 'ZONE D\'ATTERRISSAGE',
  'gas_giant': '\u26d4 gaz',
  'lang.toggle': 'FR / EN',
  'missions.bonus': 'dont +{n} missions',
};
```

- [ ] **Step 2: Create `src/i18n/en.js`**

English translation of ALL keys above. Write the complete file with every key translated.

- [ ] **Step 3: Create `src/i18n/i18n.js`**

```js
// src/i18n/i18n.js
import fr from './fr.js';
import en from './en.js';

const LANGS = { fr, en };
let currentLang = localStorage.getItem('sl_lang') || (navigator.language.startsWith('en') ? 'en' : 'fr');
let strings = LANGS[currentLang] || LANGS.fr;

export function t(key, params) {
  let s = strings[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(`{${k}}`, v);
    }
  }
  return s;
}

export function setLang(id) {
  currentLang = id;
  strings = LANGS[id] || LANGS.fr;
  localStorage.setItem('sl_lang', id);
  applyI18nToDOM();
}

export function getLang() { return currentLang; }

export function applyI18nToDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}
```

- [ ] **Step 4: Verify all i18n files parse correctly**

Run: `node --check src/i18n/i18n.js && node --check src/i18n/fr.js && node --check src/i18n/en.js`
Expected: No output (success)

- [ ] **Step 5: Commit**

```bash
git add src/i18n/
git commit -m "feat: add i18n system with French and English translations"
```

---

## Task 3: Create data modules

**Files:**
- Create: `src/data/bodies.js`
- Create: `src/data/shop.js`
- Create: `src/data/orbits.js`

- [ ] **Step 1: Create `src/data/bodies.js`**

Move `BODY_DATA` from `lander.js:4-215`, but strip display strings (name, emoji, desc, conditions) -- those now come from i18n. Keep only gameplay-relevant values. Also move `CAMPAIGN_ORDER`, `SECONDARY_MISSIONS`, and `pickMissions()`.

The `conditions` array becomes a count (for rendering) and the `name`/`desc` fields are removed -- callers will use `t('body.moon.name')` instead.

```js
// src/data/bodies.js
import { t } from '../i18n/i18n.js';
import { seededRand } from '../utils.js';

export const BODY_DATA = {
  moon: {
    // Display strings accessed via t('body.moon.name'), t('body.moon.desc'), etc.
    emoji: '\ud83c\udf15', stars: 1,
    gravity: 1.24,
    // ... all gameplay values preserved exactly as in original lander.js ...
    condCount: 3,
  },
  // ... all other bodies with same pattern ...
};

// Helper to get display name for a body
export function bodyName(id) { return t('body.' + id + '.name'); }
export function bodyDesc(id) { return t('body.' + id + '.desc'); }
export function bodyConditions(id) {
  const cfg = BODY_DATA[id];
  if (!cfg) return [];
  const result = [];
  for (let i = 0; i < cfg.condCount; i++) {
    result.push(t('body.' + id + '.cond.' + i));
  }
  return result;
}

export const CAMPAIGN_ORDER = ['moon', 'mercury', 'mars', 'titan', 'earth', 'venus', 'io', 'europa', 'pluto'];

export const SECONDARY_MISSIONS = [
  { id: 'fast', labelKey: 'mission.fast.label', descKey: 'mission.fast.desc', check: s => s.time <= 35, reward: 25 },
  { id: 'fuel', labelKey: 'mission.fuel.label', descKey: 'mission.fuel.desc', check: (s, g) => s.fuel / g.lander.fuelMax > 0.70, reward: 30 },
  { id: 'precise', labelKey: 'mission.precise.label', descKey: 'mission.precise.desc', check: s => s.precisionBonus >= 250, reward: 20 },
  { id: 'smooth', labelKey: 'mission.smooth.label', descKey: 'mission.smooth.desc', check: (s, g) => g._landVS !== undefined && g._landVS < 1.5, reward: 25 },
  { id: 'noretro', labelKey: 'mission.noretro.label', descKey: 'mission.noretro.desc', check: (s, g) => !g._usedRetro, reward: 20 },
  { id: 'tilt', labelKey: 'mission.tilt.label', descKey: 'mission.tilt.desc', check: (s, g) => g._landAngle !== undefined && Math.abs(g._landAngle) < 5, reward: 20 },
  { id: 'hazard', labelKey: 'mission.hazard.label', descKey: 'mission.hazard.desc', check: (s, g) => g._hazardCount >= 2, reward: 35 },
  { id: 'stars3', labelKey: 'mission.stars3.label', descKey: 'mission.stars3.desc', check: s => s.stars === 3, reward: 30 },
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
```

Copy ALL gameplay values from the original `BODY_DATA` exactly (gravity, drag, windType, windBase, windAmp, groundColor, skyTop, skyBot, terrainRoughness, padWidth, startFuel, maxVSpeed, maxHSpeed, maxAngle, hazardType, hazardRate, hazardPower, etc.). Do not omit any field. Add `condCount` for each body matching the original conditions array length.

- [ ] **Step 2: Create `src/data/shop.js`**

Move `SHOP_CATALOG`, `UPGRADE_CATALOG`, unified `getShipPalette()`, `drawShipPreview()`, and reward constants.

The `getShipPalette()` must merge both the lander.js version (which uses `glow` as a hex string) and the main.js version (which uses `glow` as an rgba string). Use the lander.js version as canonical and convert to rgba where needed in the drawing code.

```js
// src/data/shop.js
import { t } from '../i18n/i18n.js';
import { colorAlpha } from '../utils.js';

export const BASE_REWARDS = [10, 20, 50, 80, 150];
export const VENUS_BOSS_REWARD = 500;

export const SHOP_CATALOG = {
  standard: { nameKey: 'shop.standard.name', descKey: 'shop.standard.desc', cost: 0 },
  moustique: { nameKey: 'shop.moustique.name', descKey: 'shop.moustique.desc', cost: 240 },
  tank: { nameKey: 'shop.tank.name', descKey: 'shop.tank.desc', cost: 950 },
  alien: { nameKey: 'shop.alien.name', descKey: 'shop.alien.desc', cost: 4800 },
};

export const UPGRADE_CATALOG = {
  thrust: { nameKey: 'upgrade.thrust.name', descKey: 'upgrade.thrust.desc', cost: 60, max: 3 },
  fuel_cap: { nameKey: 'upgrade.fuel_cap.name', descKey: 'upgrade.fuel_cap.desc', cost: 50, max: 3 },
  gyro: { nameKey: 'upgrade.gyro.name', descKey: 'upgrade.gyro.desc', cost: 45, max: 3 },
  rcs: { nameKey: 'upgrade.rcs.name', descKey: 'upgrade.rcs.desc', cost: 55, max: 2 },
  retro: { nameKey: 'upgrade.retro.name', descKey: 'upgrade.retro.desc', cost: 50, max: 2 },
};

export function getShipPalette(type) {
  // Unified palette -- single source of truth
  // Returns hex glow (used by Lander.draw) and rgba glow variant (used by shop preview)
  if (type === 'moustique') {
    return {
      hullLight: '#ffe6f4', hullMid: '#ff9fc9', hullDark: '#7f1f53',
      metal: '#5d3f56', trim: '#ffc7e1', glow: '#ff8ed0',
      canopy: '#87f0ff', canopyGlow: 'rgba(255, 180, 230, 0.35)',
    };
  }
  if (type === 'tank') {
    return {
      hullLight: '#96a8ae', hullMid: '#4e6670', hullDark: '#162128',
      metal: '#334048', trim: '#bed6de', glow: '#79ffd2',
      canopy: '#8fe8ff', canopyGlow: 'rgba(120, 255, 210, 0.24)',
    };
  }
  if (type === 'alien') {
    return {
      hullLight: '#bffcff', hullMid: '#39d9b0', hullDark: '#035d54',
      metal: '#0a4f48', trim: '#d8fffe', glow: '#66ffe0',
      canopy: '#9afaff', canopyGlow: 'rgba(100, 255, 224, 0.32)',
    };
  }
  return {
    hullLight: '#f4f8ff', hullMid: '#aebcd8', hullDark: '#4a5b7c',
    metal: '#6e7d96', trim: '#dde8ff', glow: '#78dfff',
    canopy: '#89d7ff', canopyGlow: 'rgba(120, 220, 255, 0.26)',
  };
}

export function drawShipPreview(ctx, id, size) {
  // Unified ship preview drawing (replaces drawShopShip from main.js)
  // ... port the drawing code from main.js:433-569, using getShipPalette() ...
  // Use colorAlpha(palette.glow, 0.24) instead of the separate rgba glow values
}
```

Port the complete `drawShopShip()` body from main.js:433-569 into `drawShipPreview()`, adapting it to use the unified `getShipPalette()` and `colorAlpha()` for glow conversions.

- [ ] **Step 3: Create `src/data/orbits.js`**

Move orbital data from `astronomy.js:3-71`.

```js
// src/data/orbits.js
import { t } from '../i18n/i18n.js';

export const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

export const ORBITAL_ELEMENTS = [
  { id: 'mercury', L0: 252.25, dL: 4.09234, color: '#a8a8a8', r: 4, orbitR: 58 },
  { id: 'venus', L0: 181.98, dL: 1.60214, color: '#e8c56a', r: 7, orbitR: 92 },
  { id: 'earth', L0: 100.46, dL: 0.98565, color: '#2e86ab', r: 8, orbitR: 128 },
  { id: 'mars', L0: 355.43, dL: 0.52404, color: '#c1440e', r: 6, orbitR: 170 },
  { id: 'jupiter', L0: 34.40, dL: 0.08306, color: '#c88b3a', r: 17, orbitR: 230 },
  { id: 'saturn', L0: 49.94, dL: 0.03346, color: '#e4d191', r: 13, orbitR: 290 },
  { id: 'uranus', L0: 313.23, dL: 0.01177, color: '#7de8e8', r: 11, orbitR: 345 },
  { id: 'neptune', L0: 304.88, dL: 0.00600, color: '#3f54ba', r: 10, orbitR: 390 },
];

export const EARTH_EL = ORBITAL_ELEMENTS.find(el => el.id === 'earth');
export const JUPITER_EL = ORBITAL_ELEMENTS.find(el => el.id === 'jupiter');
export const SATURN_EL = ORBITAL_ELEMENTS.find(el => el.id === 'saturn');

export const BASE_ORBIT_R = [58, 92, 128, 170, 230, 290, 345, 390];

export const MOON_EL = { id: 'moon', L0: 218.3, dL: 13.1764, color: '#b8b8b8', r: 3, orbitR: 0 };
export const TITAN_EL = { id: 'titan', L0: 120.0, dL: 22.577, color: '#cc8833', r: 3, orbitR: 0 };
export const IO_EL = { id: 'io', L0: 84.1, dL: 203.49, color: '#d4a820', r: 3, orbitR: 0 };
export const EUROPA_EL = { id: 'europa', L0: 171.6, dL: 101.37, color: '#7aade0', r: 3, orbitR: 0 };
export const PLUTO_EL = { id: 'pluto', L0: 238.9, dL: 0.00397, color: '#c0aa88', r: 4, orbitR: 0 };
export const PLUTO_ORBIT_R = 440;

export const GAS_GIANTS = new Set(['jupiter', 'saturn', 'uranus', 'neptune']);
export const LANDABLE = new Set(['moon', 'mercury', 'mars', 'titan', 'earth', 'venus', 'io', 'europa', 'pluto']);
export const LANDABLE_STARS = { moon: 1, mercury: 2, mars: 3, titan: 3, earth: 4, venus: 5, io: 4, europa: 4, pluto: 5 };

export const PLANET_AU = {
  mercury: 0.387, venus: 0.723, earth: 1.000, mars: 1.524,
  jupiter: 5.203, saturn: 9.537, uranus: 19.19, neptune: 30.07, pluto: 39.48,
};
export const AU_KM = 149597871;

// Planet facts now come from i18n
export function getFact(id, idx) {
  const key = `fact.${id}.${((idx || 0) % 4 + 4) % 4}`;
  const val = t(key);
  return val !== key ? val : null;
}

// Orbital body display names come from i18n
export function orbitBodyName(id) {
  return t('body.' + id + '.name');
}
```

- [ ] **Step 4: Verify data modules parse**

Run: `node --check src/data/bodies.js && node --check src/data/shop.js && node --check src/data/orbits.js`
Expected: No output (success)

- [ ] **Step 5: Commit**

```bash
git add src/data/
git commit -m "refactor: extract data modules (bodies, shop, orbits) from monolithic files"
```

---

## Task 4: Create engine modules

**Files:**
- Create: `src/engine/terrain.js`
- Create: `src/engine/particles.js`
- Create: `src/engine/wind.js`
- Create: `src/engine/hazards.js`
- Create: `src/engine/lander.js`
- Create: `src/engine/game.js`

- [ ] **Step 1: Create `src/engine/terrain.js`**

Move the `Terrain` class from `lander.js:317-499`. Add `import { BODY_DATA } from '../data/bodies.js'` and `import { seededRand } from '../utils.js'` and `import { lighten } from '../utils.js'`. Add `import { t } from '../i18n/i18n.js'`. Change the pad text `'LANDING ZONE'` to use `t('landing_zone')`. Export the class.

- [ ] **Step 2: Create `src/engine/particles.js`**

Move `ParticleSystem` from `lander.js:502-700`. No imports needed beyond the export. Export the class.

- [ ] **Step 3: Create `src/engine/wind.js`**

Move `WindSystem` from `lander.js:703-792`. Import `BODY_DATA`. Export the class.

- [ ] **Step 4: Create `src/engine/hazards.js`**

Move `HazardSystem` from `lander.js:794-1055`. Import `BODY_DATA` and `t`. Replace all hardcoded French warning strings with `t()` calls using the hazard i18n keys (e.g., `this._warning = t('hazard.meteor.warn')`). Export the class.

- [ ] **Step 5: Create `src/engine/lander.js`**

Move `Lander` from `lander.js:1057-1498`. Import `BODY_DATA`, `getShipPalette` from shop, `colorAlpha` from utils.

**BUG FIX 1 - Right boundary clamp (lander.js:1195):**
Replace:
```js
if (this.x < 0) this.x = 0, this.vx = Math.abs(this.vx) * 0.3;
```
With:
```js
if (this.x < 0) {
  this.x = 0;
  this.vx = Math.abs(this.vx) * 0.3;
}
if (this.x > terrain.width) {
  this.x = terrain.width;
  this.vx = -Math.abs(this.vx) * 0.3;
}
```
This requires passing `terrain` to `update()`. Modify the method signature from `update(dt, input, windForce, hazard)` to `update(dt, input, windForce, hazard, terrain)`.

**BUG FIX 7 - Comma operator** is resolved by the same fix above.

**Collision reason strings:** Replace hardcoded French strings in `checkCollision()` with `t()` calls:
```js
if (!onPad) return { type: 'crash', reason: t('collision.off_pad') };
if (vDown > cfg.maxVSpeed) return { type: 'crash', reason: t('collision.vspeed', { v: vDown.toFixed(1), max: cfg.maxVSpeed }) };
// etc.
```

Export the class.

- [ ] **Step 6: Create `src/engine/game.js`**

Move `LanderGame` from `lander.js:1562-end`, plus `MeteorSystem` (lander.js:1520-1560), `genLandingStars()` (lander.js:1502-1508), `genClouds()` (lander.js:1511-1517). Import all engine classes, `BODY_DATA`, `seededRand`, `lighten`, `colorAlpha`, `t`.

**BUG FIX 1 continued:** In `LanderGame.update()`, pass `this.terrain` to `this.lander.update()`:
```js
this.lander.update(dt, this.input, windF, this.hazard, this.terrain);
```

Export `LanderGame`.

- [ ] **Step 7: Verify engine modules parse**

Run: `for f in src/engine/*.js; do node --check "$f"; done`
Expected: No output (success)

- [ ] **Step 8: Commit**

```bash
git add src/engine/
git commit -m "refactor: extract engine modules (terrain, lander, particles, wind, hazards, game)

Fixes: lander right-boundary clamp, comma operator in boundary code"
```

---

## Task 5: Create solar system modules

**Files:**
- Create: `src/solar/solar-meteors.js`
- Create: `src/solar/solar-system.js`

- [ ] **Step 1: Create `src/solar/solar-meteors.js`**

Move `SolarMeteorSystem` from `astronomy.js:73-111`. Export the class.

- [ ] **Step 2: Create `src/solar/solar-system.js`**

Move `SolarSystem` from `astronomy.js:256-608`, plus helper functions `drawInfoChip()` (astronomy.js:122-149) and `drawOrbitalBody()` (astronomy.js:151-254). Import all orbital data from `src/data/orbits.js`, utility functions from `src/utils.js`, and `SolarMeteorSystem`.

Replace the bottom hint text `'Cliquez sur une planete pour atterrir'` with `t('solar.hint')`.
Replace `body.name` references with `orbitBodyName(body.id)`.
Replace `PLANET_FACTS` usage with `getFact()` from orbits.

Update `getSimDate()` to respect language:
```js
getSimDate() {
  const d = new Date(this.simTime);
  return d.toLocaleDateString(getLang() === 'en' ? 'en-US' : 'fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
}
```

Export the class.

- [ ] **Step 3: Verify solar modules parse**

Run: `node --check src/solar/solar-meteors.js && node --check src/solar/solar-system.js`
Expected: No output (success)

- [ ] **Step 4: Commit**

```bash
git add src/solar/
git commit -m "refactor: extract solar system modules from astronomy.js"
```

---

## Task 6: Create storage and input modules

**Files:**
- Create: `src/storage.js`
- Create: `src/input.js`

- [ ] **Step 1: Create `src/storage.js`**

Move all localStorage functions from `main.js:182-218` and `main.js:1166-1167, 1224-1225`. Export each function.

```js
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
```

- [ ] **Step 2: Create `src/input.js`**

Move input handling from `main.js:23-54`. Export the `keys` object and a setup function.

```js
// src/input.js
export const keys = { up: false, left: false, right: false, space: false };

export function setupInput() {
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

  // Touch controls
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
    el.addEventListener('pointerleave', () => { keys[key] = false; el.classList.remove('active'); });
  }
}

export const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
```

- [ ] **Step 3: Verify modules parse**

Run: `node --check src/storage.js && node --check src/input.js`
Expected: No output (success)

- [ ] **Step 4: Commit**

```bash
git add src/storage.js src/input.js
git commit -m "refactor: extract storage and input modules"
```

---

## Task 7: Create UI modules

**Files:**
- Create: `src/ui/hud.js`
- Create: `src/ui/cards.js`
- Create: `src/ui/tooltips.js`
- Create: `src/ui/achievements.js`

- [ ] **Step 1: Create `src/ui/tooltips.js`**

Move tooltip functions from `main.js:831-855`. Replace French strings with `t()` calls.

- [ ] **Step 2: Create `src/ui/hud.js`**

Move `updateHUD()` from `main.js:861-918`, `renderMissionsHUD()` from `main.js:598-617`, `updateMissionsHUD()` from `main.js:619-635`, `evaluateMissions()` from `main.js:637-644`. Use `t()` for all display strings.

- [ ] **Step 3: Create `src/ui/cards.js`**

Move `showPlanetCard()` from `main.js:732-758`, `showResultCard()` from `main.js:761-828`, shop UI functions from `main.js:362-586`, upgrade UI from `main.js:1215-1305`. Use `t()` for all display strings. Use `bodyName()`, `bodyDesc()`, `bodyConditions()` instead of accessing `cfg.name`, `cfg.desc`, `cfg.conditions`.

- [ ] **Step 4: Create `src/ui/achievements.js`**

Move `ACHIEVEMENTS` from `main.js:1153-1164`, `checkAchievements()`, `showAchievementPopup()`, `renderAchievementsModal()`. Use i18n keys for labels and descriptions.

- [ ] **Step 5: Verify UI modules parse**

Run: `for f in src/ui/*.js; do node --check "$f"; done`
Expected: No output (success)

- [ ] **Step 6: Commit**

```bash
git add src/ui/
git commit -m "refactor: extract UI modules (hud, cards, tooltips, achievements)"
```

---

## Task 8: Create app.js and wire everything together

**Files:**
- Create: `src/app.js`
- Modify: `index.html`

- [ ] **Step 1: Create `src/app.js`**

This is the entry point. It imports everything and orchestrates the app. Port the remaining logic from `main.js`: canvas setup, AppState object (replacing globals), main loop, event listeners, state transitions.

Key changes:
- All 50+ global `let` variables become properties of an `appState` object
- Import all modules
- Call `setupInput()` on load
- Call `applyI18nToDOM()` on load

**BUG FIX 3 - Result race condition:** In the main loop, move `resultShown = true` to be the FIRST line inside the result-check block:
```js
if (game.result && !appState.resultShown && game.resultDelay > (game.result.type === 'crash' ? CRASH_DELAY : LAND_DELAY)) {
  appState.resultShown = true;  // FIRST -- prevents double execution
  // ... rest of score processing ...
}
```

**BUG FIX 2 - Hover fact rotation:** In the solar state update, when `_hoverFactIdx` changes, trigger tooltip re-render:
```js
if (appState.hoveredBody) {
  appState.factTimer += dt;
  if (appState.factTimer >= 3) {
    appState.factTimer = 0;
    appState.hoverFactIdx++;
    // Re-render tooltip with new fact
    updateHoverTooltip(appState);
  }
}
```

**BUG FIX 5 - Mission seed collision:**
```js
const missionSeed = Date.now() ^ (selectedBody.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) ^ (Math.random() * 0xFFFF | 0);
```

**BUG FIX 6 - Leaderboard null access:** Use optional chaining `lb?.[hoveredBody]` in tooltip rendering.

**Dead code removal:**
- Do NOT include `drawReplayOverlay()` (empty function)
- Do NOT include `_lastHovered` variable
- Do NOT include `window._replayGame` assignment

**Language toggle handler:**
```js
document.getElementById('btn-lang').addEventListener('click', () => {
  setLang(getLang() === 'fr' ? 'en' : 'fr');
  // Re-render any visible dynamic UI
});
```

- [ ] **Step 2: Update `index.html`**

Replace:
```html
<script src="astronomy.js"></script>
<script src="lander.js"></script>
<script src="main.js"></script>
```
With:
```html
<script type="module" src="src/app.js"></script>
```

Add `data-i18n` attributes to static labels:
```html
<span class="hlbl" data-i18n="hud.fuel">CARBURANT</span>
```

Add language toggle button to `#solar-top-left`:
```html
<button id="btn-lang" class="btn-s nav-btn">FR / EN</button>
```

Remove dead `data-speed` buttons (lines 160-162 with `style="display:none"`).

Change `<html lang="fr">` to `<html lang="fr" id="html-root">` (language updated dynamically).

- [ ] **Step 3: Test the game loads and runs**

Open `index.html` in a browser (or via a local server since modules require CORS). Verify:
1. Solar system renders
2. Can click a planet and see the card
3. Can launch and play
4. Can land/crash and see result
5. Language toggle switches between FR and EN
6. Shop, upgrades, achievements work

- [ ] **Step 4: Commit**

```bash
git add src/app.js index.html
git commit -m "refactor: create app.js entry point, wire all modules, update index.html

Fixes: result race condition, hover fact rotation, mission seed collision, leaderboard null access
Removes: dead replay overlay, unused _lastHovered, dead speed buttons"
```

---

## Task 9: Delete original files and final cleanup

**Files:**
- Delete: `main.js`
- Delete: `lander.js`
- Delete: `astronomy.js`

- [ ] **Step 1: Delete original monolithic files**

```bash
git rm main.js lander.js astronomy.js
```

- [ ] **Step 2: Final smoke test**

Open in browser. Full playthrough:
1. Solar system loads, language toggle works
2. Click Moon, see card in correct language
3. Launch, survey phase, countdown
4. Play: thrust, rotate, land successfully
5. Result card shows score
6. Return to solar, try another planet
7. Open shop, buy/equip ship
8. Open achievements
9. Open upgrades
10. Switch language mid-game

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor: remove original monolithic files (main.js, lander.js, astronomy.js)"
```

---

## Task 10: Create CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Create CLAUDE.md**

```markdown
# Space Lander

## What is this
A physics-based space landing simulator. Canvas 2D game, vanilla JS with ES6 modules.
No build tools -- runs directly in browser via `<script type="module">`.

## How to run
Open `index.html` in a browser, or serve with any static file server (modules require HTTP).
No npm, no build step.

## Architecture
- `src/app.js` -- entry point, main loop, state machine
- `src/engine/` -- game physics (lander, terrain, particles, wind, hazards)
- `src/solar/` -- orbital mechanics and solar system view
- `src/data/` -- planet configs, shop catalog, orbital elements
- `src/ui/` -- HUD, cards, tooltips, achievements
- `src/i18n/` -- translations (fr.js, en.js)
- `src/storage.js` -- localStorage persistence
- `src/input.js` -- keyboard and touch input
- `src/state.js` -- state machine constants
- `src/utils.js` -- shared utility functions

## Key conventions
- ES6 modules with import/export, no globals
- French is the default language, English also supported
- All display strings go through `t()` from `src/i18n/i18n.js`
- Planet gameplay data in `src/data/bodies.js`, display strings in i18n files
- Ship palettes defined once in `src/data/shop.js`
- localStorage keys prefixed with `sl_`

## Game states
`SOLAR` -> `FADING` -> `SELECT` -> `SURVEY` -> `COUNTDOWN` -> `PLAYING` -> `RESULT`
Also: `SHOP` (modal over SOLAR)

## Testing
No test framework. Test manually by playing through the campaign.
Open browser console (F12) to check for errors.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with project documentation"
```

---

## Task 11: Smart commit (final)

- [ ] **Step 1: Invoke the `smart-commit` skill**

Run the smart-commit skill, telling it to take the whole git branch into account. This will sync CLAUDE.md and README.md with the codebase and create a final commit.
