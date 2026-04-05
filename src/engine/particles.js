class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emitThrust(wx, wy, angle, intense) {
    const count = intense ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.8;
      const speed = 8 + Math.random() * 15;
      const rad = (angle + 180) * Math.PI / 180 + spread;
      this.particles.push({
        x: wx, y: wy,
        vx: Math.sin(rad) * speed,
        vy: Math.cos(rad) * speed,
        life: 1, maxLife: 0.3 + Math.random() * 0.3,
        size: 1.5 + Math.random() * 2,
        type: 'thrust',
        hue: 30 + Math.random() * 30,
      });
    }
  }

  emitSideThrust(wx, wy, angle, side) {
    for (let i = 0; i < 2; i++) {
      // angle = rotation du vaisseau
      const rad = angle * Math.PI / 180;

      // On place l'émission sur le côté haut du vaisseau
      let offsetX = side === 'left' ? 2.5 : -2.5;
      let offsetY = -2;

      // Rotation de l'offset pour suivre le vaisseau
      const rX = offsetX * Math.cos(rad) - offsetY * Math.sin(rad);
      const rY = offsetX * Math.sin(rad) + offsetY * Math.cos(rad);

      // La direction de la flamme est perpendiculaire au vaisseau
      const thrustAngle = side === 'left' ? angle + 90 : angle - 90;
      const tRad = thrustAngle * Math.PI / 180;

      const speed = 4 + Math.random() * 6;
      this.particles.push({
        x: wx + rX, y: wy + rY,
        vx: Math.sin(tRad) * speed,
        vy: Math.cos(tRad) * speed,
        life: 1, maxLife: 0.15 + Math.random() * 0.15,
        size: 1 + Math.random() * 1.5,
        type: 'thrust',
        hue: 45 + Math.random() * 20,
      });
    }
  }

  emitRetro(wx, wy, vx, vy) {
    for (let i = 0; i < 4; i++) {
      const spd = Math.sqrt(vx * vx + vy * vy);
      const nx = spd > 0.1 ? vx / spd : 0;
      const ny = spd > 0.1 ? vy / spd : 0;
      const sp = 5 + Math.random() * 10;
      this.particles.push({
        x: wx + (Math.random() - 0.5) * 3,
        y: wy + (Math.random() - 0.5) * 3,
        vx: nx * sp + (Math.random() - 0.5) * 4,
        vy: ny * sp + (Math.random() - 0.5) * 4,
        life: 1, maxLife: 0.2 + Math.random() * 0.2,
        size: 1.5, type: 'retro', hue: 180,
      });
    }
  }

  emitExplosion(wx, wy) {
    // Explosion particles (doubled to 160)
    for (let i = 0; i < 160; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 35;
      this.particles.push({
        x: wx, y: wy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6,
        life: 1, maxLife: 1.0 + Math.random() * 1.0,
        size: 2 + Math.random() * 5,
        type: 'explosion',
        hue: Math.random() < 0.5 ? 20 + Math.random() * 20 : 40 + Math.random() * 20,
      });
    }
    // Debris
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 10 + Math.random() * 20;
      this.particles.push({
        x: wx, y: wy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1, maxLife: 1.0 + Math.random() * 0.5,
        size: 1 + Math.random() * 2,
        type: 'debris', hue: 0,
      });
    }
    // Smoke particles
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: wx + (Math.random() - 0.5) * 6,
        y: wy + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 3,
        vy: 1 + Math.random() * 3,  // positive = world up
        life: 1, maxLife: 2.0 + Math.random() * 2.0,
        size: 3 + Math.random() * 5,
        type: 'smoke', hue: 0,
      });
    }
  }

  emitSmoke(wx, wy) {
    // Ongoing crash smoke
    if (Math.random() < 0.4) {
      this.particles.push({
        x: wx + (Math.random() - 0.5) * 8,
        y: wy + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 2,
        vy: 0.5 + Math.random() * 2,
        life: 1, maxLife: 1.5 + Math.random() * 1.5,
        size: 2 + Math.random() * 4,
        type: 'smoke', hue: 0,
      });
    }
  }

  emitDust(wx, wy, windX) {
    if (Math.random() < 0.4) {
      this.particles.push({
        x: wx + (Math.random() - 0.5) * 40,
        y: wy + Math.random() * 5,
        vx: windX * 0.3 + (Math.random() - 0.5) * 2,
        vy: 0.5 + Math.random() * 1.5,
        life: 1, maxLife: 1.5 + Math.random() * 1,
        size: 1.5 + Math.random() * 3,
        type: 'dust', hue: 20,
      });
    }
  }

  update(dt, gravity) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt / p.maxLife;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'smoke') {
        // smoke rises (vy positive = world up), slight deceleration
        p.vy = Math.max(0, p.vy - 0.3 * dt);
        p.vx *= (1 - 0.5 * dt);
      } else {
        p.vy -= gravity * dt * 0.3;  // slight gravity on particles
      }
      if (p.type === 'thrust' || p.type === 'retro') {
        p.vx *= (1 - 2 * dt);
        p.vy *= (1 - 2 * dt);
      }
      if (p.type === 'dust') { p.vy = Math.max(p.vy, 0.2); }
    }
  }

  draw(ctx, camX, camY, scale, W, H) {
    const toSX = wx => (wx - camX) * scale + W / 2;
    const toSY = wy => H / 2 - (wy - camY) * scale;

    for (const p of this.particles) {
      const alpha = p.life;
      const sx = toSX(p.x), sy = toSY(p.y);
      if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;

      if (p.type === 'smoke') {
        ctx.globalAlpha = Math.max(0, alpha * 0.6);
        ctx.fillStyle = `rgba(80,80,80,1)`;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1, p.size * scale * 0.15 * (2 - p.life)), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = Math.max(0, alpha);
        if (p.type === 'thrust') {
          ctx.fillStyle = `hsl(${p.hue},100%,${40 + 40 * p.life}%)`;
        } else if (p.type === 'retro') {
          ctx.fillStyle = `hsl(180,80%,${50 + 30 * p.life}%)`;
        } else if (p.type === 'explosion') {
          ctx.fillStyle = `hsl(${p.hue},100%,${30 + 50 * p.life}%)`;
        } else if (p.type === 'debris') {
          ctx.fillStyle = `hsl(30,40%,${40 * p.life}%)`;
        } else if (p.type === 'dust') {
          ctx.fillStyle = `hsl(25,60%,${40 + 20 * p.life}%)`;
        }
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.5, p.size * scale * 0.1 * p.life), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

export { ParticleSystem };
