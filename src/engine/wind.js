import { BODY_DATA } from '../data/bodies.js';

class WindSystem {
  constructor(bodyId) {
    this.cfg = BODY_DATA[bodyId];
    this.t = 0;
    this.current = 0;  // current wind acceleration in m/s²
    this.gustTimer = 0;
    this.gustActive = false;
    this.gustStrength = 0;
    this.stormState = 0; // 0=idle, 1=warning, 2=active
    this.stormTimer = 0;
    this.stormStrength = 0;
    this.direction = 1;  // +1 or -1
  }

  update(dt) {
    const cfg = this.cfg;
    this.t += dt;

    if (cfg.windType === 'none') { this.current = 0; return; }

    let wind = 0;

    if (cfg.windType === 'gusty') {
      // Sine base + random gusts
      wind = Math.sin(this.t * 0.4) * cfg.windBase * 0.5;
      if (!this.gustActive) {
        if (Math.random() < cfg.windGustChance * dt * 60) {
          this.gustActive = true;
          this.gustTimer = 0.8 + Math.random() * 2;
          this.gustStrength = (cfg.windBase + Math.random() * cfg.windAmp) * (Math.random() < 0.5 ? 1 : -1);
        }
      } else {
        wind += this.gustStrength;
        this.gustTimer -= dt;
        if (this.gustTimer <= 0) this.gustActive = false;
      }
      // Dust storm
      if (cfg.hasDustStorm) {
        if (this.stormState === 0) {
          if (Math.random() < cfg.dustStormChance * dt * 60) {
            this.stormState = 1;
            this.stormTimer = 2.5; // warning duration
          }
        } else if (this.stormState === 1) {
          this.stormTimer -= dt;
          if (this.stormTimer <= 0) {
            this.stormState = 2;
            this.stormTimer = 4 + Math.random() * 5;
            this.stormStrength = (cfg.windAmp + Math.random() * 10) * (Math.random() < 0.5 ? 1 : -1);
          }
        } else if (this.stormState === 2) {
          wind += this.stormStrength;
          this.stormTimer -= dt;
          if (this.stormTimer <= 0) this.stormState = 0;
        }
      }
    } else if (cfg.windType === 'shear') {
      // Low-frequency oscillation (Titan)
      wind = Math.sin(this.t * 0.18) * cfg.windBase;
      wind += Math.sin(this.t * 0.43 + 1.2) * cfg.windAmp * 0.4;
      wind += (Math.random() - 0.5) * cfg.windBase * 0.3;
    } else if (cfg.windType === 'turbulent') {
      // Earth turbulence
      wind = Math.sin(this.t * 0.35) * cfg.windBase;
      wind += Math.sin(this.t * 1.1 + 0.8) * cfg.windAmp * 0.3;
      wind += Math.sin(this.t * 2.7 + 2.1) * cfg.windAmp * 0.15;
      wind += (Math.random() - 0.5) * cfg.windBase * 0.5;
    } else if (cfg.windType === 'hurricane') {
      // Venus — constant strong push + chaos
      wind = cfg.windBase * 1.5 * this.direction;
      wind += Math.sin(this.t * 0.6) * cfg.windAmp * 0.6;
      wind += Math.sin(this.t * 1.8) * cfg.windAmp * 0.3;
      wind += (Math.random() - 0.5) * cfg.windAmp * 0.4;
      // Occasional direction flip
      if (Math.random() < 0.0002 * dt * 60) this.direction *= -1;
    }

    // Apply drag model: wind force = wind_acc (direct m/s² perturbation)
    this.current = wind;
  }

  getForce() { return this.current; }
  isStorming() { return this.stormState === 2; }
  isWarning() { return this.stormState === 1; }
  getDisplaySpeed() {
    // Convert back to approximate m/s for display
    return Math.abs(this.current) * 2.5;
  }
}

export { WindSystem };
