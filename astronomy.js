// astronomy.js — Orbital mechanics & Solar System rendering

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

// Safari ne supporte pas les hex 8 chiffres (#rrggbbaa) — conversion en rgba()
function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

// Each planet: L0 = mean longitude at J2000 (degrees), dL = daily motion (deg/day)
const ORBITAL_ELEMENTS = [
  { id:'mercury', name:'Mercure', L0:252.25, dL:4.09234, color:'#a8a8a8', r:4,  orbitR:58  },
  { id:'venus',   name:'Vénus',   L0:181.98, dL:1.60214, color:'#e8c56a', r:7,  orbitR:92  },
  { id:'earth',   name:'Terre',   L0:100.46, dL:0.98565, color:'#2e86ab', r:8,  orbitR:128 },
  { id:'mars',    name:'Mars',    L0:355.43, dL:0.52404, color:'#c1440e', r:6,  orbitR:170 },
  { id:'jupiter', name:'Jupiter', L0:34.40,  dL:0.08306, color:'#c88b3a', r:17, orbitR:230 },
  { id:'saturn',  name:'Saturne', L0:49.94,  dL:0.03346, color:'#e4d191', r:13, orbitR:290 },
  { id:'uranus',  name:'Uranus',  L0:313.23, dL:0.01177, color:'#7de8e8', r:11, orbitR:345 },
  { id:'neptune', name:'Neptune', L0:304.88, dL:0.00600, color:'#3f54ba', r:10, orbitR:390 },
];

// Orbit display radii (pixels at base scale 1.0, i.e. canvas 900px min dim)
const BASE_ORBIT_R = [58, 92, 128, 170, 230, 290, 345, 390];

// Moon (orbits Earth)
const MOON_EL = { id:'moon', name:'Lune', L0:218.3, dL:13.1764, color:'#b8b8b8', r:3, orbitR:0 };
// Titan (orbits Saturn, period ~15.95 days)
const TITAN_EL = { id:'titan', name:'Titan', L0:120.0, dL:22.577, color:'#cc8833', r:3, orbitR:0 };
// Io (orbits Jupiter, period ~1.77 days)
const IO_EL = { id:'io', name:'Io', L0:84.1, dL:203.49, color:'#d4a820', r:3, orbitR:0 };
// Europa (orbits Jupiter, period ~3.55 days)
const EUROPA_EL = { id:'europa', name:'Europa', L0:171.6, dL:101.37, color:'#7aade0', r:3, orbitR:0 };
// Pluto (very slow, period ~248 years)
const PLUTO_EL = { id:'pluto', name:'Pluton', L0:238.9, dL:0.00397, color:'#c0aa88', r:4, orbitR:0 };
const PLUTO_ORBIT_R = 440; // beyond Neptune

const GAS_GIANTS = new Set(['jupiter','saturn','uranus','neptune']);
const LANDABLE   = new Set(['moon','mercury','mars','titan','earth','venus','io','europa','pluto']);

// Landable body metadata for tooltip/display
const LANDABLE_STARS = { moon:1, mercury:2, mars:3, titan:3, earth:4, venus:5, io:4, europa:4, pluto:5 };

const PLANET_FACTS = {
  mercury: ["Révolution : 88 jours terrestres","Surface : −180°C la nuit, +430°C le jour","Aucune lune, aucune atmosphère","Son noyau représente 85% de son rayon"],
  venus:   ["Rotation rétrograde — le Soleil se lève à l'ouest","Pression atm. : 90× celle de la Terre","Une journée vénusienne dure plus qu'une année","Planète la plus chaude : 462°C en permanence"],
  earth:   ["Seule planète connue abritant la vie","71% de la surface est de l'eau","La Lune stabilise l'inclinaison axiale à 23°","Le champ magnétique dévie les vents solaires"],
  mars:    ["Olympus Mons : 22 km de haut, 3× l'Everest","Un sol martien dure 24h 37min","La poussière colore le ciel en rose-orangé","Deux lunes : Phobos (déclin) et Deimos"],
  jupiter: ["1 300 Terres tiendraient dans Jupiter","La Grande Tache Rouge dure depuis 350+ ans","95 lunes confirmées","Champ magnétique 20 000× celui de la Terre"],
  saturn:  ["Anneaux : 70 000 km de large, <1 km d'épaisseur","Densité inférieure à l'eau — il flotterait !","146 lunes connues","Les anneaux disparaîtront dans ~100 Ma"],
  uranus:  ["Axe incliné à 98° — il 'roule' autour du Soleil","Saisons de 21 ans terrestres chacune","27 lunes nommées d'après Shakespeare","Planète la plus froide : −224°C"],
  neptune: ["Vents à 2 100 km/h — record du système solaire","Voyager 2 seul visiteur humain (1989)","Un an Neptune = 165 ans terrestres","Triton orbite à l'envers et se rapproche"],
  moon:    ["S'éloigne de la Terre de 3,8 cm par an","12 humains y ont marché entre 1969 et 1972","Toujours la même face est tournée vers la Terre","Ses marées ralentissent la rotation terrestre"],
  titan:   ["Seule lune du système avec une atmosphère dense","Lacs de méthane liquide en surface","Pression atm. : 1,45× celle de la Terre","Température : −179°C"],
  io:      ["La lune la plus volcanique du système solaire","Plus de 400 volcans actifs recensés","Éruptions visibles depuis l'espace","Chauffée par les marées gravitationnelles de Jupiter"],
  europa:  ["Possède un océan liquide sous sa glace","Surface parmi les plus lisses du système solaire","Candidat no.1 pour la vie extraterrestre","Les geysers d'eau jaillissent à 200 km de hauteur"],
  pluto:   ["Classé planète naine depuis 2006","Son année dure 248 ans terrestres","Charon est si gros qu'ils s'orbitent mutuellement","New Horizons l'a survolé en 2015"],
};

// Semi-grand axe en UA (pour calcul de distance approximative)
const PLANET_AU = {
  mercury:0.387, venus:0.723, earth:1.000, mars:1.524,
  jupiter:5.203, saturn:9.537, uranus:19.19, neptune:30.07, pluto:39.48,
};
const AU_KM = 149597871;

// Feature 9: Meteor system for solar view
class SolarMeteorSystem {
  constructor() { this.meteors = []; }
  update(dt, W, H) {
    if (Math.random() < 0.002 * dt * 60) {
      const fromLeft = Math.random() < 0.5;
      this.meteors.push({
        x: fromLeft ? -20 : W + 20,
        y: Math.random() * H * 0.6,
        vx: (fromLeft ? 1 : -1) * (150 + Math.random() * 200),
        vy: 50 + Math.random() * 100,
        len: 20 + Math.random() * 40,
        alpha: 0.5 + Math.random() * 0.4,
      });
    }
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.x < -100 || m.x > W + 100 || m.y > H + 100) this.meteors.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const m of this.meteors) {
      const angle = Math.atan2(m.vy, m.vx);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(angle);
      const g = ctx.createLinearGradient(-m.len, 0, 4, 0);
      g.addColorStop(0, `rgba(255,255,255,0)`);
      g.addColorStop(0.7, `rgba(200,220,255,${m.alpha * 0.5})`);
      g.addColorStop(1, `rgba(255,255,255,${m.alpha})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-m.len, 0); ctx.lineTo(4, 0); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${m.alpha})`;
      ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

class SolarSystem {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.cx = w / 2; this.cy = h / 2;
    this.simTime = Date.now();
    this._computeScale();
    this._buildStars(350);
    // Twinkle state
    this._twinkle = new Float32Array(350).map(() => Math.random());
    // Feature 9: meteors in solar view
    this.meteors = new SolarMeteorSystem();
  }

  _computeScale() {
    const minDim = Math.min(this.w, this.h);
    this.orbitScale = (minDim * 0.47) / 395;
    ORBITAL_ELEMENTS.forEach((el, i) => {
      el.orbitR = BASE_ORBIT_R[i] * this.orbitScale;
    });
    MOON_EL.orbitR   = 22 * this.orbitScale;
    TITAN_EL.orbitR  = 28 * this.orbitScale;
    IO_EL.orbitR     = 20 * this.orbitScale;
    EUROPA_EL.orbitR = 26 * this.orbitScale;
    PLUTO_EL.orbitR  = PLUTO_ORBIT_R * this.orbitScale;
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this.cx = w / 2; this.cy = h / 2;
    this._computeScale();
    this._buildStars(350);
    this.meteors = new SolarMeteorSystem();
  }

  _buildStars(n) {
    this.stars = [];
    for (let i = 0; i < n; i++) {
      this.stars.push({
        x: Math.random(), y: Math.random(),
        b: 0.2 + Math.random() * 0.8,
        s: Math.random() < 0.85 ? 1 : (Math.random() < 0.6 ? 1.5 : 2),
        tw: Math.random() * Math.PI * 2,
        tws: 0.5 + Math.random() * 1.5,
      });
    }
  }

  _angle(el, t) {
    const days = (t - J2000_MS) / 86400000;
    return (((el.L0 + el.dL * days) % 360) + 360) % 360;
  }

  _pos(el, t) {
    const rad = this._angle(el, t) * Math.PI / 180;
    return { x: this.cx + el.orbitR * Math.cos(rad), y: this.cy + el.orbitR * Math.sin(rad) };
  }

  _moonPos(parentPos, moonEl, t) {
    const rad = this._angle(moonEl, t) * Math.PI / 180;
    return { x: parentPos.x + moonEl.orbitR * Math.cos(rad), y: parentPos.y + moonEl.orbitR * Math.sin(rad) };
  }

  // Returns body id clicked, or null
  getBodyAt(sx, sy) {
    // Check Pluto first (orbit outside ORBITAL_ELEMENTS list)
    const plutoPos = this._pos(PLUTO_EL, this.simTime);
    if (Math.hypot(sx - plutoPos.x, sy - plutoPos.y) <= Math.max(PLUTO_EL.r + 6, 14)) return 'pluto';

    for (const el of ORBITAL_ELEMENTS) {
      const p = this._pos(el, this.simTime);
      if (Math.hypot(sx - p.x, sy - p.y) <= Math.max(el.r + 6, 14)) return el.id;
    }
    const earthPos  = this._pos(ORBITAL_ELEMENTS[2], this.simTime);
    const moonPos   = this._moonPos(earthPos, MOON_EL, this.simTime);
    if (Math.hypot(sx - moonPos.x, sy - moonPos.y) <= 14) return 'moon';

    const saturnPos = this._pos(ORBITAL_ELEMENTS[5], this.simTime);
    const titanPos  = this._moonPos(saturnPos, TITAN_EL, this.simTime);
    if (Math.hypot(sx - titanPos.x, sy - titanPos.y) <= 14) return 'titan';

    const jupiterPos = this._pos(ORBITAL_ELEMENTS[3], this.simTime);
    const ioPos      = this._moonPos(jupiterPos, IO_EL, this.simTime);
    if (Math.hypot(sx - ioPos.x, sy - ioPos.y) <= 14) return 'io';

    const europaPos  = this._moonPos(jupiterPos, EUROPA_EL, this.simTime);
    if (Math.hypot(sx - europaPos.x, sy - europaPos.y) <= 14) return 'europa';

    return null;
  }

  // Screen position of a body (for zoom target)
  getBodyScreenPos(id) {
    if (id === 'moon') {
      const earthPos = this._pos(ORBITAL_ELEMENTS[2], this.simTime);
      return this._moonPos(earthPos, MOON_EL, this.simTime);
    }
    if (id === 'titan') {
      const saturnPos = this._pos(ORBITAL_ELEMENTS[5], this.simTime);
      return this._moonPos(saturnPos, TITAN_EL, this.simTime);
    }
    if (id === 'io') {
      const jupiterPos = this._pos(ORBITAL_ELEMENTS[3], this.simTime);
      return this._moonPos(jupiterPos, IO_EL, this.simTime);
    }
    if (id === 'europa') {
      const jupiterPos = this._pos(ORBITAL_ELEMENTS[3], this.simTime);
      return this._moonPos(jupiterPos, EUROPA_EL, this.simTime);
    }
    if (id === 'pluto') return this._pos(PLUTO_EL, this.simTime);
    const el = ORBITAL_ELEMENTS.find(e => e.id === id);
    return el ? this._pos(el, this.simTime) : { x: this.cx, y: this.cy };
  }

  update(dt) {
    this.simTime += dt * 1000;
  }

  // Feature 1 & 5: draw(ctx, dtSec, hoveredId, lockedIds, fuelInfo, leaderboard)
  draw(ctx, dtSec, hoveredId, lockedIds, fuelInfo, leaderboard) {
    const t = this.simTime;

    // Background
    ctx.fillStyle = '#000008';
    ctx.fillRect(0, 0, this.w, this.h);

    // Stars with twinkle
    for (const s of this.stars) {
      if (dtSec) s.tw += s.tws * dtSec;
      const alpha = s.b * (0.7 + 0.3 * Math.sin(s.tw));
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x * this.w, s.y * this.h, s.s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Feature 9: meteors in solar view
    this.meteors.update(dtSec || 0.016, this.w, this.h);
    this.meteors.draw(ctx);

    // Orbit rings
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (const el of ORBITAL_ELEMENTS) {
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, el.orbitR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Moon orbit (near Earth)
    const earthPos = this._pos(ORBITAL_ELEMENTS[2], t);
    ctx.strokeStyle = 'rgba(150,180,255,0.1)';
    ctx.beginPath();
    ctx.arc(earthPos.x, earthPos.y, MOON_EL.orbitR, 0, Math.PI * 2);
    ctx.stroke();

    // Titan orbit (near Saturn)
    const saturnPos = this._pos(ORBITAL_ELEMENTS[5], t);
    ctx.strokeStyle = 'rgba(200,150,50,0.1)';
    ctx.beginPath();
    ctx.arc(saturnPos.x, saturnPos.y, TITAN_EL.orbitR, 0, Math.PI * 2);
    ctx.stroke();

    // Io + Europa orbits (near Jupiter)
    const jupiterPos = this._pos(ORBITAL_ELEMENTS[3], t);
    ctx.strokeStyle = 'rgba(200,160,30,0.1)';
    ctx.beginPath(); ctx.arc(jupiterPos.x, jupiterPos.y, IO_EL.orbitR,     0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(100,160,220,0.1)';
    ctx.beginPath(); ctx.arc(jupiterPos.x, jupiterPos.y, EUROPA_EL.orbitR, 0, Math.PI * 2); ctx.stroke();

    // Pluto orbit ring
    ctx.strokeStyle = 'rgba(192,170,136,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, PLUTO_EL.orbitR, 0, Math.PI * 2); ctx.stroke();

    // Orbital trails (dernières positions comme pointillés)
    const TRAIL_N = 55;
    const TRAIL_DAYS = 3; // jours par point
    for (const el of ORBITAL_ELEMENTS) {
      for (let k = 1; k <= TRAIL_N; k++) {
        const pastT = t - k * TRAIL_DAYS * 86400000;
        const pp    = this._pos(el, pastT);
        const alpha = (1 - k / TRAIL_N) * 0.5;
        ctx.fillStyle = hexAlpha(el.color, alpha);
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Moon trail
    for (let k = 1; k <= 35; k++) {
      const pastT = t - k * 0.7 * 86400000;
      const ep    = this._pos(ORBITAL_ELEMENTS[2], pastT);
      const mp    = this._moonPos(ep, MOON_EL, pastT);
      ctx.fillStyle = `rgba(184,184,184,${((1 - k/35) * 0.4).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(mp.x, mp.y, 1, 0, Math.PI * 2); ctx.fill();
    }
    // Titan trail
    for (let k = 1; k <= 35; k++) {
      const pastT = t - k * 0.5 * 86400000;
      const sp    = this._pos(ORBITAL_ELEMENTS[5], pastT);
      const tp2   = this._moonPos(sp, TITAN_EL, pastT);
      ctx.fillStyle = `rgba(204,136,51,${((1 - k/35) * 0.4).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(tp2.x, tp2.y, 1, 0, Math.PI * 2); ctx.fill();
    }
    // Io trail
    for (let k = 1; k <= 20; k++) {
      const pastT = t - k * 0.06 * 86400000;
      const jp2   = this._pos(ORBITAL_ELEMENTS[3], pastT);
      const ip    = this._moonPos(jp2, IO_EL, pastT);
      ctx.fillStyle = `rgba(212,168,32,${((1 - k/20) * 0.35).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(ip.x, ip.y, 1, 0, Math.PI * 2); ctx.fill();
    }
    // Europa trail
    for (let k = 1; k <= 20; k++) {
      const pastT = t - k * 0.12 * 86400000;
      const jp3   = this._pos(ORBITAL_ELEMENTS[3], pastT);
      const ep    = this._moonPos(jp3, EUROPA_EL, pastT);
      ctx.fillStyle = `rgba(122,173,224,${((1 - k/20) * 0.35).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(ep.x, ep.y, 1, 0, Math.PI * 2); ctx.fill();
    }
    // Pluto trail (slow — 10-day intervals)
    for (let k = 1; k <= 25; k++) {
      const pastT = t - k * 10 * 86400000;
      const pp2   = this._pos(PLUTO_EL, pastT);
      ctx.fillStyle = `rgba(192,170,136,${((1 - k/25) * 0.3).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(pp2.x, pp2.y, 1, 0, Math.PI * 2); ctx.fill();
    }

    // Sun corona
    const sg = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, 70);
    sg.addColorStop(0,   'rgba(255,240,150,0.9)');
    sg.addColorStop(0.25,'rgba(255,200,60,0.6)');
    sg.addColorStop(0.6, 'rgba(255,120,0,0.2)');
    sg.addColorStop(1,   'rgba(255,60,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, 70, 0, Math.PI * 2);
    ctx.fill();

    // Sun
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe88a';
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, 10, 0, Math.PI * 2);
    ctx.fill();

    // Planets
    for (let i = 0; i < ORBITAL_ELEMENTS.length; i++) {
      const el = ORBITAL_ELEMENTS[i];
      const pos = this._pos(el, t);
      const isLocked = lockedIds && lockedIds.has(el.id);

      ctx.save();
      if (isLocked) ctx.globalAlpha = 0.35;

      // Hover glow
      const isHovered = hoveredId === el.id;
      const glowR = isHovered ? el.r * 5 : el.r * 2.5;
      const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
      grad.addColorStop(0,   hexAlpha(el.color, isHovered ? 1.0 : 0.8));
      grad.addColorStop(0.4, hexAlpha(el.color, isHovered ? 0.5 : 0.27));
      grad.addColorStop(1,   hexAlpha(el.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Planet body
      ctx.fillStyle = isHovered ? lightenColor(el.color, 40) : el.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, el.r, 0, Math.PI * 2);
      ctx.fill();

      // Saturn rings
      if (el.id === 'saturn') {
        ctx.strokeStyle = 'rgba(228,209,145,0.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, el.r * 2.2, el.r * 0.7, 0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(200,180,100,0.25)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, el.r * 2.7, el.r * 0.85, 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Lock icon
      if (isLocked) {
        ctx.fillStyle = 'rgba(255,200,100,0.9)';
        ctx.font = `${Math.max(10, el.r)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('🔒', pos.x, pos.y + el.r * 0.4);
      }

      // Label
      ctx.fillStyle = 'rgba(190,210,255,0.85)';
      ctx.font = '11px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(el.name, pos.x, pos.y + el.r + 13);

      // Feature 5: leaderboard stars under label for landable planets
      if (LANDABLE.has(el.id)) {
        if (leaderboard && leaderboard[el.id]) {
          const lbStars = leaderboard[el.id].stars || 0;
          ctx.fillStyle = '#fc0';
          ctx.font = '6px monospace';
          ctx.fillText(
            '★'.repeat(lbStars) + '☆'.repeat(3 - lbStars),
            pos.x, pos.y + el.r + 24
          );
        } else {
          ctx.fillStyle = isLocked ? 'rgba(180,180,100,0.5)' : '#fc0';
          ctx.font = '8px monospace';
          ctx.fillText('★'.repeat(LANDABLE_STARS[el.id]) + '☆'.repeat(5 - LANDABLE_STARS[el.id]), pos.x, pos.y + el.r + 24);
        }
        // Feature 1: fuel bar under stars for landable planets removed
      } else {
        ctx.fillStyle = 'rgba(150,150,180,0.5)';
        ctx.font = '8px monospace';
        ctx.fillText('⛔ gaz', pos.x, pos.y + el.r + 24);
      }
      ctx.restore();
    }

    // Moon
    const moonPos = this._moonPos(earthPos, MOON_EL, t);
    const moonHov = hoveredId === 'moon';
    const moonLocked = lockedIds && lockedIds.has('moon');
    if (moonLocked) ctx.globalAlpha = 0.35;
    if (moonHov) {
      const mg = ctx.createRadialGradient(moonPos.x, moonPos.y, 0, moonPos.x, moonPos.y, MOON_EL.r * 5);
      mg.addColorStop(0, hexAlpha(MOON_EL.color, 1.0));
      mg.addColorStop(0.4, hexAlpha(MOON_EL.color, 0.5));
      mg.addColorStop(1, hexAlpha(MOON_EL.color, 0));
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(moonPos.x, moonPos.y, MOON_EL.r * 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = moonHov ? lightenColor(MOON_EL.color, 40) : MOON_EL.color;
    ctx.beginPath();
    ctx.arc(moonPos.x, moonPos.y, MOON_EL.r, 0, Math.PI * 2);
    ctx.fill();
    if (moonLocked) {
      ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('🔒', moonPos.x, moonPos.y + MOON_EL.r * 0.4);
    }
    ctx.globalAlpha = 1;

    // Moon label + Feature 5 leaderboard stars
    ctx.fillStyle = 'rgba(190,190,190,0.75)';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Lune', moonPos.x, moonPos.y + MOON_EL.r + 12);
    if (leaderboard && leaderboard['moon']) {
      const lbStars = leaderboard['moon'].stars || 0;
      ctx.fillStyle = '#fc0';
      ctx.font = '6px monospace';
      ctx.fillText('★'.repeat(lbStars) + '☆'.repeat(3 - lbStars), moonPos.x, moonPos.y + MOON_EL.r + 20);
    } else {
      ctx.fillStyle = moonLocked ? 'rgba(180,180,100,0.5)' : '#fc0';
      ctx.font = '7px monospace';
      ctx.fillText('★☆☆☆☆', moonPos.x, moonPos.y + MOON_EL.r + 20);
    }
    // Feature 1: Moon fuel bar removed

    // Titan
    const titanPos = this._moonPos(saturnPos, TITAN_EL, t);
    const titanHov = hoveredId === 'titan';
    const titanLocked = lockedIds && lockedIds.has('titan');
    if (titanLocked) ctx.globalAlpha = 0.35;
    if (titanHov) {
      const tg = ctx.createRadialGradient(titanPos.x, titanPos.y, 0, titanPos.x, titanPos.y, TITAN_EL.r * 5);
      tg.addColorStop(0, hexAlpha(TITAN_EL.color, 1.0));
      tg.addColorStop(0.4, hexAlpha(TITAN_EL.color, 0.5));
      tg.addColorStop(1, hexAlpha(TITAN_EL.color, 0));
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.arc(titanPos.x, titanPos.y, TITAN_EL.r * 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = titanHov ? lightenColor(TITAN_EL.color, 40) : TITAN_EL.color;
    ctx.beginPath();
    ctx.arc(titanPos.x, titanPos.y, TITAN_EL.r, 0, Math.PI * 2);
    ctx.fill();
    if (titanLocked) {
      ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('🔒', titanPos.x, titanPos.y + TITAN_EL.r * 0.4);
    }
    ctx.globalAlpha = 1;

    // Titan label + Feature 5 leaderboard stars
    ctx.fillStyle = 'rgba(200,150,60,0.75)';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Titan', titanPos.x, titanPos.y + TITAN_EL.r + 12);
    if (leaderboard && leaderboard['titan']) {
      const lbStars = leaderboard['titan'].stars || 0;
      ctx.fillStyle = '#fc0';
      ctx.font = '6px monospace';
      ctx.fillText('★'.repeat(lbStars) + '☆'.repeat(3 - lbStars), titanPos.x, titanPos.y + TITAN_EL.r + 20);
    } else {
      ctx.fillStyle = titanLocked ? 'rgba(180,180,100,0.5)' : '#fc0';
      ctx.font = '7px monospace';
      ctx.fillText('★★★☆☆', titanPos.x, titanPos.y + TITAN_EL.r + 20);
    }
    // Feature 1: Titan fuel bar removed

    // ── Io ──
    const ioPos = this._moonPos(jupiterPos, IO_EL, t);
    const ioHov = hoveredId === 'io';
    const ioLocked = lockedIds && lockedIds.has('io');
    ctx.save();
    if (ioLocked) ctx.globalAlpha = 0.35;
    if (ioHov) {
      const ig = ctx.createRadialGradient(ioPos.x, ioPos.y, 0, ioPos.x, ioPos.y, IO_EL.r * 5);
      ig.addColorStop(0, hexAlpha(IO_EL.color, 1)); ig.addColorStop(1, hexAlpha(IO_EL.color, 0));
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.arc(ioPos.x, ioPos.y, IO_EL.r * 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = ioHov ? lightenColor(IO_EL.color, 40) : IO_EL.color;
    ctx.beginPath(); ctx.arc(ioPos.x, ioPos.y, IO_EL.r, 0, Math.PI * 2); ctx.fill();
    if (ioLocked) { ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('🔒', ioPos.x, ioPos.y + IO_EL.r * 0.4); }
    ctx.fillStyle = 'rgba(212,180,50,0.75)'; ctx.font = '9px "Share Tech Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText('Io', ioPos.x, ioPos.y + IO_EL.r + 12);
    if (leaderboard && leaderboard['io']) {
      const s = leaderboard['io'].stars || 0;
      ctx.fillStyle = '#fc0'; ctx.font = '6px monospace';
      ctx.fillText('★'.repeat(s)+'☆'.repeat(3-s), ioPos.x, ioPos.y + IO_EL.r + 20);
    } else {
      ctx.fillStyle = ioLocked ? 'rgba(180,180,100,0.5)' : '#fc0'; ctx.font = '7px monospace';
      ctx.fillText('★★★★☆', ioPos.x, ioPos.y + IO_EL.r + 20);
    }
    ctx.restore();

    // ── Europa ──
    const europaPos = this._moonPos(jupiterPos, EUROPA_EL, t);
    const europaHov = hoveredId === 'europa';
    const europaLocked = lockedIds && lockedIds.has('europa');
    ctx.save();
    if (europaLocked) ctx.globalAlpha = 0.35;
    if (europaHov) {
      const eg2 = ctx.createRadialGradient(europaPos.x, europaPos.y, 0, europaPos.x, europaPos.y, EUROPA_EL.r * 5);
      eg2.addColorStop(0, hexAlpha(EUROPA_EL.color, 1)); eg2.addColorStop(1, hexAlpha(EUROPA_EL.color, 0));
      ctx.fillStyle = eg2;
      ctx.beginPath(); ctx.arc(europaPos.x, europaPos.y, EUROPA_EL.r * 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = europaHov ? lightenColor(EUROPA_EL.color, 40) : EUROPA_EL.color;
    ctx.beginPath(); ctx.arc(europaPos.x, europaPos.y, EUROPA_EL.r, 0, Math.PI * 2); ctx.fill();
    if (europaLocked) { ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('🔒', europaPos.x, europaPos.y + EUROPA_EL.r * 0.4); }
    ctx.fillStyle = 'rgba(122,180,230,0.75)'; ctx.font = '9px "Share Tech Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText('Europa', europaPos.x, europaPos.y + EUROPA_EL.r + 12);
    if (leaderboard && leaderboard['europa']) {
      const s = leaderboard['europa'].stars || 0;
      ctx.fillStyle = '#fc0'; ctx.font = '6px monospace';
      ctx.fillText('★'.repeat(s)+'☆'.repeat(3-s), europaPos.x, europaPos.y + EUROPA_EL.r + 20);
    } else {
      ctx.fillStyle = europaLocked ? 'rgba(180,180,100,0.5)' : '#fc0'; ctx.font = '7px monospace';
      ctx.fillText('★★★★☆', europaPos.x, europaPos.y + EUROPA_EL.r + 20);
    }
    ctx.restore();

    // ── Pluto ──
    const plutoPos2 = this._pos(PLUTO_EL, t);
    const plutoHov = hoveredId === 'pluto';
    const plutoLocked = lockedIds && lockedIds.has('pluto');
    ctx.save();
    if (plutoLocked) ctx.globalAlpha = 0.35;
    if (plutoHov) {
      const pg = ctx.createRadialGradient(plutoPos2.x, plutoPos2.y, 0, plutoPos2.x, plutoPos2.y, PLUTO_EL.r * 5);
      pg.addColorStop(0, hexAlpha(PLUTO_EL.color, 1)); pg.addColorStop(1, hexAlpha(PLUTO_EL.color, 0));
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(plutoPos2.x, plutoPos2.y, PLUTO_EL.r * 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = plutoHov ? lightenColor(PLUTO_EL.color, 40) : PLUTO_EL.color;
    ctx.beginPath(); ctx.arc(plutoPos2.x, plutoPos2.y, PLUTO_EL.r, 0, Math.PI * 2); ctx.fill();
    if (plutoLocked) { ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('🔒', plutoPos2.x, plutoPos2.y + PLUTO_EL.r * 0.4); }
    ctx.fillStyle = 'rgba(192,180,150,0.75)'; ctx.font = '9px "Share Tech Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText('Pluton', plutoPos2.x, plutoPos2.y + PLUTO_EL.r + 12);
    if (leaderboard && leaderboard['pluto']) {
      const s = leaderboard['pluto'].stars || 0;
      ctx.fillStyle = '#fc0'; ctx.font = '6px monospace';
      ctx.fillText('★'.repeat(s)+'☆'.repeat(3-s), plutoPos2.x, plutoPos2.y + PLUTO_EL.r + 20);
    } else {
      ctx.fillStyle = plutoLocked ? 'rgba(180,180,100,0.5)' : '#fc0'; ctx.font = '7px monospace';
      ctx.fillText('★★★★★', plutoPos2.x, plutoPos2.y + PLUTO_EL.r + 20);
    }
    ctx.restore();

    // Title
    ctx.fillStyle = 'rgba(150,180,255,0.5)';
    ctx.font = '12px "Share Tech Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Cliquez sur une planète pour atterrir', 14, this.h - 14);
  }

  getDistFromEarth(id) {
    if (id === 'moon')   return '384 400 km';
    if (id === 'titan')  id = 'saturn';
    if (id === 'io')     id = 'jupiter';
    if (id === 'europa') id = 'jupiter';
    const au = PLANET_AU[id];
    if (!au) return null;
    const earthEl  = ORBITAL_ELEMENTS[2];
    const targetEl = ORBITAL_ELEMENTS.find(e => e.id === id);
    if (!targetEl) return null;
    const eA = this._angle(earthEl,  this.simTime) * Math.PI / 180;
    const tA = this._angle(targetEl, this.simTime) * Math.PI / 180;
    const dKm = Math.sqrt(1 + au*au - 2*au*Math.cos(tA - eA)) * AU_KM;
    if (dKm > 1e9)  return (dKm / 1e9).toFixed(2) + ' Md km';
    if (dKm > 1e6)  return Math.round(dKm / 1e6) + ' M km';
    return Math.round(dKm / 1000) + ' k km';
  }

  getFact(id, idx) {
    const facts = PLANET_FACTS[id];
    if (!facts) return null;
    return facts[((idx || 0) % facts.length + facts.length) % facts.length];
  }

  getSimDate() {
    const d = new Date(this.simTime);
    return d.toLocaleDateString('fr-FR', { year:'numeric', month:'short', day:'numeric' });
  }
}

function lightenColor(hex, amt) {
  const r = Math.min(255, parseInt(hex.slice(1,3),16) + amt);
  const g = Math.min(255, parseInt(hex.slice(3,5),16) + amt);
  const b = Math.min(255, parseInt(hex.slice(5,7),16) + amt);
  return `rgb(${r},${g},${b})`;
}
