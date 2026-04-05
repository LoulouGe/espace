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
