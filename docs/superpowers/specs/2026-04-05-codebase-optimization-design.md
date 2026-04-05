# Space Lander -- Codebase Optimization Design

## Goal

Refactor the Space Lander codebase from 3 monolithic files into ES6 modules, fix known bugs, add i18n (French + English), and add a CLAUDE.md file. No gameplay changes.

## Approach

Incremental refactor using ES6 modules (`<script type="module">`). No build tools, no framework, no npm. The game continues to run by opening index.html directly or via any static file server.

---

## 1. Module Structure

The 3 monolithic files (`main.js` ~1,382 lines, `lander.js` ~1,900 lines, `astronomy.js` ~609 lines) split into focused modules:

```
src/
  i18n/
    fr.js              -- French strings
    en.js              -- English strings
    i18n.js            -- language loader, exports t() function
  data/
    bodies.js          -- BODY_DATA (planet gameplay configs, no display strings)
    shop.js            -- SHOP_CATALOG, UPGRADE_CATALOG, ship palettes, drawShipPreview()
    orbits.js          -- ORBITAL_ELEMENTS, PLANET_FACTS (moved to i18n), PLANET_AU, moon/satellite elements
  engine/
    terrain.js         -- Terrain class
    lander.js          -- Lander class
    particles.js       -- ParticleSystem class
    wind.js            -- WindSystem class
    hazards.js         -- HazardSystem class
    game.js            -- LanderGame class (orchestrates engine components)
  solar/
    solar-system.js    -- SolarSystem class
    solar-meteors.js   -- SolarMeteorSystem class
  ui/
    hud.js             -- updateHUD(), renderMissionsHUD(), updateMissionsHUD()
    cards.js           -- showPlanetCard(), showResultCard(), shop UI, upgrade UI
    tooltips.js        -- showTooltip(), showTooltipHTML(), nonLandableMsg()
    achievements.js    -- ACHIEVEMENTS data, check/render/popup logic
  storage.js           -- all localStorage load/save functions (progress, diamonds, ships, leaderboard, ghost, achievements, upgrades, daily)
  input.js             -- keyboard + touch input handling, keys object
  state.js             -- state enum (SOLAR, FADING, SELECT, etc.), timing constants
  app.js               -- entry point: canvas setup, AppState object, main loop, state transitions, event listeners
index.html             -- updated: <script type="module" src="src/app.js">
style.css              -- unchanged
```

### Key rules

- Each file exports only what other modules need via `export`/`import`
- No global variables -- mutable state lives in an `AppState` plain object in `app.js`, passed to functions that need it
- `BODY_DATA` keeps only gameplay values (gravity, fuel, padWidth, etc.) -- all display strings (names, descriptions, conditions) move to i18n files
- Ship palettes unified: `getShipPalette()` (lander.js) and `getShopShipPalette()` (main.js) merge into one `getShipPalette(id)` in `src/data/shop.js`
- `drawShopShip()` and in-game ship drawing share shapes via `drawShipPreview(ctx, id, palette, size)` in `src/data/shop.js`

---

## 2. i18n System

### Architecture

Flat dot-notation key-value maps, one file per language. A `t(key)` function does the lookup.

```js
// src/i18n/i18n.js
import fr from './fr.js';
import en from './en.js';

const LANGS = { fr, en };
let current = localStorage.getItem('sl_lang') || (navigator.language.startsWith('en') ? 'en' : 'fr');
let strings = LANGS[current] || LANGS.fr;

export function t(key) {
  return strings[key] || key;
}

export function setLang(id) {
  current = id;
  strings = LANGS[id] || LANGS.fr;
  localStorage.setItem('sl_lang', id);
}

export function getLang() { return current; }
```

### String categories

| Category | Example key | French | English |
|----------|------------|--------|---------|
| HUD labels | `hud.fuel` | CARBURANT | FUEL |
| Planet names | `body.moon.name` | Lune | Moon |
| Planet descriptions | `body.moon.desc` | Notre satellite naturel... | Our natural satellite... |
| Planet conditions | `body.moon.cond.0` | Pas d'atmosphere | No atmosphere |
| Planet facts | `fact.moon.0` | S'eloigne de la Terre... | Drifting away from Earth... |
| Shop items | `shop.standard.name` | Module Standard | Standard Module |
| Achievements | `ach.first_land.label` | Premier Atterrissage | First Landing |
| Result messages | `result.success` | ATTERRISSAGE REUSSI ! | SUCCESSFUL LANDING! |
| UI buttons | `btn.launch` | Lancer la Mission | Launch Mission |
| Tooltips | `tooltip.locked` | Terminez d'abord ... | Complete ... first |
| Non-landable | `tooltip.gas_giant` | Jupiter est une geante gazeuse... | Jupiter is a gas giant... |

### HTML integration

Static HTML labels get `data-i18n` attributes:

```html
<span class="hlbl" data-i18n="hud.fuel">CARBURANT</span>
```

On load and on language switch, a `applyI18nToDOM()` function walks all `[data-i18n]` elements and sets their `textContent` from `t()`.

### Language toggle

A button added to `#solar-top-left`:

```html
<button id="btn-lang" class="btn-s nav-btn">FR / EN</button>
```

Clicking toggles between `fr` and `en`, calls `setLang()`, then `applyI18nToDOM()` and re-renders any visible dynamic UI.

---

## 3. Bug Fixes

### Bug 1: Lander drifts off right edge

**Location:** `lander.js` boundary clamping (around line 1195)
**Problem:** Only clamps `x < 0`, not `x > terrainWidth`
**Fix:** Add right-side boundary: `if (this.x > this.terrainWidth) this.x = this.terrainWidth; this.vx = -Math.abs(this.vx) * 0.3;`

### Bug 2: Hover fact rotation not updating display

**Location:** `main.js` lines 956-961 (main loop) and 302-331 (mousemove)
**Problem:** `_hoverFactIdx` increments in the loop, but tooltip only re-renders on mousemove
**Fix:** When `_hoverFactIdx` changes in the loop, also update tooltip content (call the tooltip render logic from the loop, not just from mousemove)

### Bug 3: Result display race condition

**Location:** `main.js` line 995
**Problem:** `resultShown = true` is set after score processing -- if the block runs twice before completion, duplicate rewards could be granted
**Fix:** Move `resultShown = true` to be the very first statement inside the `if` block

### Bug 4: Duplicate ship palettes

**Location:** `getShipPalette()` in lander.js, `getShopShipPalette()` in main.js
**Problem:** Same color definitions maintained in two places
**Fix:** Single `getShipPalette(id)` in `src/data/shop.js`, imported by both consumers

### Bug 5: Mission seed collision

**Location:** `main.js` line 719
**Problem:** `Date.now() ^ charSum` can repeat for rapid re-launches within the same millisecond
**Fix:** `Date.now() ^ charSum ^ (Math.random() * 0xFFFF | 0)`

### Bug 6: Leaderboard null access

**Location:** `main.js` line 320
**Problem:** `lb[hoveredBody]` accessed without checking `lb` is populated
**Fix:** Use optional chaining: `lb?.[hoveredBody]`

### Bug 7: Comma operator in boundary clamp

**Location:** `lander.js` line 1195
**Problem:** `this.x = 0, this.vx = ...` uses comma operator -- works but confusing
**Fix:** Rewrite as separate statements inside explicit braces

---

## 4. Constants & Code Cleanup

### Constants extraction

Magic numbers become named constants in their respective modules:

| Current | Becomes | Module |
|---------|---------|--------|
| `0.9` (fade) | `FADE_DURATION` | state.js |
| `2.0` (survey) | `SURVEY_DURATION` | state.js |
| `3` (countdown) | `COUNTDOWN_DURATION` | state.js |
| `[10, 20, 50, 80, 150]` | `BASE_REWARDS` | src/data/shop.js |
| `1.4` / `4.5` (result delays) | `CRASH_DELAY` / `LAND_DELAY` | state.js |
| `500` (venus bonus) | `VENUS_BOSS_REWARD` | src/data/shop.js |
| `1.12` (zoom factor) | `ZOOM_STEP` | app.js |
| `VIEW_MIN=1.0`, `VIEW_MAX=4.0` | stay, already named | app.js |

### Global state cleanup

The ~50 mutable globals in main.js become an `AppState` object:

```js
const appState = {
  state: S.SOLAR,
  fadeProgress: 0,
  zoomScale: 1,
  zoomOX: 0, zoomOY: 0,
  selectedBody: null,
  hoveredBody: null,
  viewZoom: 1, viewPanX: 0, viewPanY: 0,
  countdownTimer: 0,
  surveyTimer: 0,
  resultShown: false,
  tooltipTimer: 0,
  hoverFactIdx: 0,
  factTimer: 0,
  globalDiamonds: 0,
  dailyMode: false,
  timeScale: 100000,
  // ... etc
};
```

### Dead code removal

| Code | Location | Reason |
|------|----------|--------|
| `drawReplayOverlay()` | main.js:1360 | Empty function, no-op |
| `_lastHovered` | main.js:299 | Assigned, never read |
| `window._replayGame` | main.js:1358 | Assigned, never consumed |
| `data-speed` buttons | index.html:160-162 | `display:none`, no listeners |

### Ship drawing deduplication

`drawShopShip()` (main.js, 170 lines) merges with in-game ship drawing:

- Extract `drawShipPreview(ctx, id, palette, scale)` to `src/data/shop.js`
- Shop thumbnails call it with small scale
- Any future ship preview reuses it
- The in-game lander still draws via `Lander.draw()` (different code path with thrust flames, rotation, etc.) -- only the static preview is shared

---

## 5. CLAUDE.md

Created at project root with:

- What the project is
- How to run it (no build step)
- Architecture overview (module map)
- Key conventions (ES6 modules, no globals, i18n via t(), localStorage key prefix)
- Game state flow diagram
- Testing approach (manual)

Content detailed in the approved design section above.

---

## 6. Scope Boundaries

**In scope:**
- ES6 module split
- i18n (French + English)
- 7 bug fixes listed above
- Constants extraction
- Global state cleanup
- Dead code removal
- Ship palette/drawing dedup
- CLAUDE.md creation

**Out of scope:**
- Build tools / bundler
- TypeScript
- Test framework
- Accessibility improvements
- Performance optimizations (particle pooling, trail caching)
- New features
- CSS refactoring

---

## 7. Risk Mitigation

- **Regression risk:** The refactor preserves all existing logic -- code moves between files but doesn't change behavior. Bug fixes are surgical.
- **ES6 module loading order:** Unlike `<script>` tags, modules have their own scope. Any implicit dependency on load order must become an explicit `import`.
- **Browser support:** `<script type="module">` is supported in all modern browsers (Chrome 61+, Firefox 60+, Safari 11+). The game already requires modern JS features (optional chaining, nullish coalescing) so this is not a regression.
- **localStorage compatibility:** No changes to storage format -- existing save data continues to work.
