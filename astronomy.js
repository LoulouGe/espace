// astronomy.js — Orbital mechanics & Solar System rendering

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

// Each planet: L0 = mean longitude at J2000 (degrees), dL = daily motion (deg/day)
const ORBITAL_ELEMENTS = [
  { id:'mercury', name:'Mercure', L0:252.25, dL:4.09234, color:'#a8a8a8', r:4  },
  { id:'venus',   name:'Vénus',   L0:181.98, dL:1.60214, color:'#e8c56a', r:7  },
  { id:'earth',   name:'Terre',   L0:100.46, dL:0.98565, color:'#2e86ab', r:8  },
  { id:'mars',    name:'Mars',    L0:355.43, dL:0.52404, color:'#c1440e', r:6  },
  { id:'jupiter', name:'Jupiter', L0:34.40,  dL:0.08306, color:'#c88b3a', r:17 },
  { id:'saturn',  name:'Saturne', L0:49.94,  dL:0.03346, color:'#e4d191', r:13 },
  { id:'uranus',  name:'Uranus',  L0:313.23, dL:0.01177, color:'#7de8e8', r:11 },
  { id:'neptune', name:'Neptune', L0:304.88, dL:0.00600, color:'#3f54ba', r:10 },
];

// Orbit display radii (pixels at base scale 1.0, i.e. canvas 900px min dim)
const BASE_ORBIT_R = [58, 92, 128, 170, 230, 290, 345, 390];

// Moon (orbits Earth)
const MOON_EL = { id:'moon', name:'Lune', L0:218.3, dL:13.1764, color:'#b8b8b8', r:3, orbitR:0 };
// Titan (orbits Saturn, period ~15.95 days)
const TITAN_EL = { id:'titan', name:'Titan', L0:120.0, dL:22.577, color:'#cc8833', r:3, orbitR:0 };

const GAS_GIANTS = new Set(['jupiter','saturn','uranus','neptune']);
const LANDABLE   = new Set(['moon','mercury','mars','titan','earth','venus']);

// Landable body metadata for tooltip/display
const LANDABLE_STARS = { moon:1, mercury:2, mars:3, titan:3, earth:4, venus:5 };

class SolarSystem {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.cx = w / 2; this.cy = h / 2;
    this.simTime = Date.now();
    this._computeScale();
    this._buildStars(350);
    // Twinkle state
    this._twinkle = new Float32Array(350).map(() => Math.random());
  }

  _computeScale() {
    const minDim = Math.min(this.w, this.h);
    this.orbitScale = (minDim * 0.47) / 395;
    ORBITAL_ELEMENTS.forEach((el, i) => {
      el.orbitR = BASE_ORBIT_R[i] * this.orbitScale;
    });
    MOON_EL.orbitR  = 22 * this.orbitScale;
    TITAN_EL.orbitR = 28 * this.orbitScale;
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this.cx = w / 2; this.cy = h / 2;
    this._computeScale();
    this._buildStars(350);
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
    for (const el of ORBITAL_ELEMENTS) {
      const p = this._pos(el, this.simTime);
      if (Math.hypot(sx - p.x, sy - p.y) <= Math.max(el.r + 6, 14)) return el.id;
    }
    const earthPos = this._pos(ORBITAL_ELEMENTS[2], this.simTime);
    const moonPos  = this._moonPos(earthPos, MOON_EL, this.simTime);
    if (Math.hypot(sx - moonPos.x, sy - moonPos.y) <= 14) return 'moon';

    const saturnPos = this._pos(ORBITAL_ELEMENTS[5], this.simTime);
    const titanPos  = this._moonPos(saturnPos, TITAN_EL, this.simTime);
    if (Math.hypot(sx - titanPos.x, sy - titanPos.y) <= 14) return 'titan';

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
    const el = ORBITAL_ELEMENTS.find(e => e.id === id);
    return el ? this._pos(el, this.simTime) : { x: this.cx, y: this.cy };
  }

  update(dt) {
    this.simTime += dt * 1000;
  }

  draw(ctx, dtSec) {
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

      // Planet glow
      const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, el.r * 2.5);
      grad.addColorStop(0,   el.color + 'cc');
      grad.addColorStop(0.4, el.color + '44');
      grad.addColorStop(1,   el.color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, el.r * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Planet body
      ctx.fillStyle = el.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, el.r, 0, Math.PI * 2);
      ctx.fill();

      // Saturn rings
      if (el.id === 'saturn') {
        ctx.save();
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
        ctx.restore();
      }

      // Label
      ctx.fillStyle = 'rgba(190,210,255,0.85)';
      ctx.font = '11px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(el.name, pos.x, pos.y + el.r + 13);

      // Landable indicator
      if (LANDABLE.has(el.id)) {
        const stars = LANDABLE_STARS[el.id];
        ctx.fillStyle = '#fc0';
        ctx.font = '8px monospace';
        ctx.fillText('★'.repeat(stars) + '☆'.repeat(5 - stars), pos.x, pos.y + el.r + 24);
      } else {
        ctx.fillStyle = 'rgba(150,150,180,0.5)';
        ctx.font = '8px monospace';
        ctx.fillText('⛔ gaz', pos.x, pos.y + el.r + 24);
      }
    }

    // Moon
    const moonPos = this._moonPos(earthPos, MOON_EL, t);
    ctx.fillStyle = MOON_EL.color;
    ctx.beginPath();
    ctx.arc(moonPos.x, moonPos.y, MOON_EL.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(190,190,190,0.75)';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Lune ★☆☆☆☆', moonPos.x, moonPos.y + MOON_EL.r + 12);

    // Titan
    const titanPos = this._moonPos(saturnPos, TITAN_EL, t);
    ctx.fillStyle = TITAN_EL.color;
    ctx.beginPath();
    ctx.arc(titanPos.x, titanPos.y, TITAN_EL.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,150,60,0.75)';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Titan ★★★☆☆', titanPos.x, titanPos.y + TITAN_EL.r + 12);

    // Title
    ctx.fillStyle = 'rgba(150,180,255,0.5)';
    ctx.font = '12px "Share Tech Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Cliquez sur une planète pour atterrir', 14, this.h - 14);
  }

  getSimDate() {
    const d = new Date(this.simTime);
    return d.toLocaleDateString('fr-FR', { year:'numeric', month:'short', day:'numeric' });
  }
}
