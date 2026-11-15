// Short-lived sparks, rings and floating score texts. Pure visual feedback:
// nothing here touches the rules, and the world owns the one instance.
export function createParticles() {
  const sparks = [];
  const rings = [];
  const texts = [];

  return {
    burst(x, y, color, count, speed) {
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.35 + Math.random() * 0.65);
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.35, max: 0.85, size: 2 + Math.random() * 3, color });
      }
    },
    ring(x, y, color, maxRadius) {
      rings.push({ x, y, radius: 8, maxRadius, life: 0.45, max: 0.45, color });
    },
    text(x, y, str, color) {
      texts.push({ x, y, str, color, life: 0.9, max: 0.9 });
    },
    update(dt) {
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.vx *= 0.94; s.vy *= 0.94;
        s.life -= dt;
        if (s.life <= 0) sparks.splice(i, 1);
      }
      for (let i = rings.length - 1; i >= 0; i -= 1) {
        const r = rings[i];
        r.life -= dt;
        r.radius = r.maxRadius * (1 - r.life / r.max);
        if (r.life <= 0) rings.splice(i, 1);
      }
      for (let i = texts.length - 1; i >= 0; i -= 1) {
        const t = texts[i];
        t.y -= 34 * dt;
        t.life -= dt;
        if (t.life <= 0) texts.splice(i, 1);
      }
    },
    draw(ctx) {
      for (const s of sparks) {
        ctx.globalAlpha = Math.max(0, s.life / s.max);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const r of rings) {
        ctx.globalAlpha = Math.max(0, r.life / r.max) * 0.8;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px system-ui, sans-serif';
      for (const t of texts) {
        ctx.globalAlpha = Math.max(0, t.life / t.max);
        ctx.fillStyle = t.color;
        ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      sparks.length = 0;
      rings.length = 0;
      texts.length = 0;
    },
  };
}
