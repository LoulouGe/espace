// src/solar/solar-meteors.js -- Meteor system for solar system view

export class SolarMeteorSystem {
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
