import { BODY_DATA } from '../data/bodies.js';
import { t } from '../i18n/i18n.js';

class HazardSystem {
  constructor(bodyId) {
    this.bodyId = bodyId;
    this.cfg = BODY_DATA[bodyId] || {};
    this._t = 0;
    this._state = 0; // 0: idle, 1: warning, 2: active
    this._timer = 0;
    this._engineCutout = false;
    this._rotationMult = 1;
    this._fuelDrainMult = 1;
    this._vertForce = 0;
    this._impulse = null;
    this._torqueImpulse = 0;
    this._warning = null;
  }

  get _hazardRate() { return this.cfg.hazardRate || 1; }
  get _hazardPower() { return this.cfg.hazardPower || 1; }

  update(dt) {
    this._t += dt;
    this._impulse = null;
    this._torqueImpulse = 0;
    switch (this.bodyId) {
      case 'moon':    this._updateMeteor(dt);    break;
      case 'mercury': this._updateFlare(dt);     break;
      case 'mars':    this._updateMagnetic(dt);  break;
      case 'titan':   this._updateDownburst(dt); break;
      case 'earth':   this._updateLightning(dt); break;
      case 'venus':   this._updateAcidRain(dt);  break;
      case 'io':      this._updateVolcano(dt);   break;
      case 'europa':  this._updateGeyser(dt);    break;
      case 'pluto':   this._updateSolarWind(dt); break;
    }
  }

  _updateMeteor(dt) {
    if (this._state === 0) {
      if (Math.random() < 0.0005 * this._hazardRate * dt * 60) {
        this._state = 1;
        this._timer = 2.5;
        this._warning = t('hazard.meteor.warn');
      }
    } else if (this._state === 1) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 2;
        this._timer = 0.12;
        const mag = (7 + Math.random() * 10) * this._hazardPower;
        const sign = Math.random() < 0.5 ? 1 : -1;
        this._impulse = { vx: mag * sign, vy: (2 + Math.random() * 4) * this._hazardPower };
        this._warning = t('hazard.meteor.active');
      }
    } else if (this._state === 2) {
      this._timer -= dt;
      if (this._timer <= 0) { this._state = 0; this._warning = null; }
    }
  }

  _updateFlare(dt) {
    if (this._state === 0) {
      if (Math.random() < 0.0003 * this._hazardRate * dt * 60) {
        this._state = 1;
        this._timer = 2.5;
        this._warning = t('hazard.flare.warn');
      }
    } else if (this._state === 1) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 2;
        this._timer = (1.5 + Math.random()) * (0.95 + this._hazardPower * 0.18);
        this._engineCutout = true;
        this._warning = t('hazard.flare.active');
      }
    } else if (this._state === 2) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 0;
        this._engineCutout = false;
        this._warning = null;
      }
    }
  }

  _updateMagnetic(dt) {
    if (this._state === 0) {
      if (Math.random() < 0.0003 * this._hazardRate * dt * 60) {
        this._state = 1;
        this._timer = 2.5;
        this._warning = t('hazard.magnetic.warn');
      }
    } else if (this._state === 1) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 2;
        this._timer = (2 + Math.random() * 2) * (0.95 + this._hazardPower * 0.16);
        this._rotationMult = -1;
        this._warning = t('hazard.magnetic.active');
      }
    } else if (this._state === 2) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 0;
        this._rotationMult = 1;
        this._warning = null;
      }
    }
  }

  _updateDownburst(dt) {
    if (this._state === 0) {
      if (Math.random() < 0.0004 * this._hazardRate * dt * 60) {
        this._state = 1;
        this._timer = 3.0;
        this._warning = t('hazard.downburst.warn');
      }
    } else if (this._state === 1) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 2;
        this._timer = (0.8 + Math.random() * 1.0) * (0.95 + this._hazardPower * 0.22);
        this._vertForce = -(10 + Math.random() * 8) * this._hazardPower;
        this._warning = t('hazard.downburst.active');
      }
    } else if (this._state === 2) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 0;
        this._vertForce = 0;
        this._warning = null;
      }
    }
  }

  _updateLightning(dt) {
    if (this._state === 0) {
      if (Math.random() < 0.0009 * this._hazardRate * dt * 60) {
        this._state = 1;
        this._timer = 1.8;
        this._warning = t('hazard.lightning.warn');
      }
    } else if (this._state === 1) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 2;
        this._timer = 0.35 * (0.95 + this._hazardPower * 0.18);
        this._engineCutout = true;
        const mag = (14 + Math.random() * 10) * this._hazardPower;
        const sign = Math.random() < 0.5 ? 1 : -1;
        this._impulse = { vx: mag * sign, vy: (5 + Math.random() * 5) * this._hazardPower };
        this._torqueImpulse = sign * (40 + Math.random() * 35) * this._hazardPower;
        this._warning = t('hazard.lightning.active');
      }
    } else if (this._state === 2) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 0;
        this._engineCutout = false;
        this._warning = null;
      }
    }
  }

  _updateAcidRain(_dt) {
    const period = 20;
    const onFraction = 0.30;
    const phase = (this._t % period) / period;

    if (phase > 0.85) {
      this._state = 1;
      this._fuelDrainMult = 1;
      this._warning = t('hazard.acid.warn');
    } else if (phase < onFraction) {
      this._state = 2;
      this._fuelDrainMult = 2.0;
      this._warning = t('hazard.acid.active');
    } else {
      this._state = 0;
      this._fuelDrainMult = 1;
      this._warning = null;
    }
  }

  _updateVolcano(dt) {
    // Io: éruption périodique projette des rochers = impulsion forte + aléatoire
    if (this._state === 0) {
      if (Math.random() < 0.0005 * this._hazardRate * dt * 60) {
        this._state = 1;
        this._timer = 2.8;
        this._warning = t('hazard.volcano.warn');
      }
    } else if (this._state === 1) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 2;
        this._timer = 0.15;
        const mag = (10 + Math.random() * 12) * this._hazardPower;
        const sign = Math.random() < 0.5 ? 1 : -1;
        this._impulse = { vx: mag * sign * 0.8, vy: (4 + Math.random() * 8) * this._hazardPower };
        this._warning = t('hazard.volcano.active');
      }
    } else if (this._state === 2) {
      this._timer -= dt;
      if (this._timer <= 0) { this._state = 0; this._warning = null; }
    }
  }

  _updateGeyser(dt) {
    // Europa: geysers d'eau qui poussent vers le haut
    if (this._state === 0) {
      if (Math.random() < 0.0006 * this._hazardRate * dt * 60) {
        this._state = 1;
        this._timer = 2.5;
        this._warning = t('hazard.geyser.warn');
      }
    } else if (this._state === 1) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 2;
        this._timer = (1.2 + Math.random() * 1.0) * (0.95 + this._hazardPower * 0.22);
        this._vertForce = (18 + Math.random() * 12) * this._hazardPower; // pousse vers le HAUT
        this._warning = t('hazard.geyser.active');
      }
    } else if (this._state === 2) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._state = 0;
        this._vertForce = 0;
        this._warning = null;
      }
    }
  }

  _updateSolarWind(dt) {
    // Pluton: vent solaire constant avec oscillation = dérive latérale progressive
    const period = 18 / Math.max(1, this._hazardRate * 0.92);
    const phase = (this._t % period) / period;
    if (phase < 0.1) {
      this._state = 1;
      this._warning = t('hazard.solarwind.warn');
    } else if (phase < 0.45) {
      this._state = 2;
      const dir = Math.floor(this._t / period) % 2 === 0 ? 1 : -1;
      this._impulse = { vx: dir * 3.5 * dt * this._hazardPower, vy: 0 }; // continu, petit par dt
      this._warning = t('hazard.solarwind.active');
    } else {
      this._state = 0;
      this._warning = null;
    }
  }

  get engineCutout() { return this._engineCutout; }
  get rotationMult() { return this._rotationMult; }
  get fuelDrainMult() { return this._fuelDrainMult; }
  get vertForce() { return this._vertForce; }
  get warning() { return this._warning; }
  get isActive() { return this._state === 2; }
  get isWarning() { return this._state === 1; }
  consumeImpulse() { const i = this._impulse; this._impulse = null; return i; }
  consumeTorqueImpulse() { const t = this._torqueImpulse; this._torqueImpulse = 0; return t; }
}

export { HazardSystem };
