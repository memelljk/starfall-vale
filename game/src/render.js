// Starfall Vale — everything the eye sees. One canvas, one logical field of
// 960x600, letterboxed to the window. The palette is a night vale: deep
// indigo, aurora ribbons, gold starlight, violet wraiths.
import { FIELD, NOVA, PLAYER, SCORE, WRAITH } from './config.js';
import { SCREEN_DRAFT, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';
import { createRandom } from './random.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const GOLD = '#ffd76a';
const MOON = '#ffe9a3';
const INK = '#0b1026';
const PANEL = 'rgba(11, 16, 38, 0.82)';
const CARD_W = 220;
const CARD_H = 200;
const CARD_Y = 205;

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.2, y, x - s * 0.6, y - s * 0.9, x, y - s * 0.25);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 0.9, x + s * 1.2, y, x, y + s * 0.9);
  ctx.closePath();
}

function star4(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 4; i += 1) {
    const a = rot + (i * Math.PI) / 2;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    const b = a + Math.PI / 4;
    ctx.lineTo(x + Math.cos(b) * r * 0.32, y + Math.sin(b) * r * 0.32);
  }
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const starRng = createRandom(12345);
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({
      x: starRng.range(0, FIELD.width), y: starRng.range(0, FIELD.height),
      r: starRng.range(0.6, 2), phase: starRng.range(0, Math.PI * 2),
      speed: starRng.range(0.6, 2.2),
    });
  }
  const trail = [];
  let view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0 };

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const scale = Math.min(w / FIELD.width, h / FIELD.height);
    view = {
      scale: scale * dpr,
      ox: (w * dpr - FIELD.width * scale * dpr) / 2,
      oy: (h * dpr - FIELD.height * scale * dpr) / 2,
      w: w * dpr, h: h * dpr,
    };
  }
  window.addEventListener('resize', resize);
  resize();

  function drawBackground(state) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, '#0b1026');
    g.addColorStop(0.55, '#171238');
    g.addColorStop(1, '#241a4d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const s of stars) {
      const a = 0.35 + 0.4 * Math.abs(Math.sin(state.time * s.speed + s.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#cfe4ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Three slow aurora ribbons, drawn additively.
    ctx.globalCompositeOperation = 'lighter';
    const ribbons = [
      { color: 'rgba(45, 212, 191, 0.10)', base: 120, amp: 26, speed: 0.21, phase: 0 },
      { color: 'rgba(139, 92, 246, 0.12)', base: 200, amp: 34, speed: 0.16, phase: 2.1 },
      { color: 'rgba(74, 222, 128, 0.08)', base: 300, amp: 22, speed: 0.27, phase: 4.4 },
    ];
    for (const r of ribbons) {
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.moveTo(0, FIELD.height);
      for (let x = 0; x <= FIELD.width; x += 24) {
        const y = r.base + Math.sin(x * 0.006 + state.time * r.speed + r.phase) * r.amp;
        ctx.lineTo(x, y);
      }
      for (let x = FIELD.width; x >= 0; x -= 24) {
        const y = r.base + 46 + Math.sin(x * 0.006 + state.time * r.speed + r.phase) * r.amp;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Soft mist along the bottom.
    const mist = ctx.createLinearGradient(0, FIELD.height - 90, 0, FIELD.height);
    mist.addColorStop(0, 'rgba(139, 92, 246, 0)');
    mist.addColorStop(1, 'rgba(139, 92, 246, 0.16)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, FIELD.height - 90, FIELD.width, 90);
  }

  function drawShards(state) {
    for (const s of state.shards) {
      const pulse = 0.75 + 0.25 * Math.sin(s.t * 5);
      ctx.save();
      ctx.shadowColor = s.moon ? MOON : GOLD;
      ctx.shadowBlur = s.moon ? 18 : 10;
      ctx.fillStyle = s.moon ? MOON : GOLD;
      ctx.globalAlpha = pulse;
      star4(ctx, s.x, s.y, s.r * (s.moon ? 1.5 : 1), s.t * 1.5);
      ctx.fill();
      if (s.moon) {
        ctx.globalAlpha = 0.5 * pulse;
        ctx.strokeStyle = MOON;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawWraiths(state) {
    for (const w of state.wraiths) {
      const def = WRAITH[w.kind];
      const pulse = w.kind === 'brute' ? 1 + 0.12 * Math.sin(w.t * 6) : 1;
      const r = w.r * pulse;
      ctx.save();
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = def.color;
      ctx.globalAlpha = w.hitT > 0 ? 1 : 0.92;
      ctx.beginPath();
      ctx.arc(w.x, w.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = def.core;
      ctx.beginPath();
      ctx.arc(w.x, w.y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      if (w.hitT > 0) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(w.x, w.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Eyes track the wisp.
      const ang = Math.atan2(state.player.y - w.y, state.player.x - w.x);
      const ex = Math.cos(ang) * r * 0.32;
      const ey = Math.sin(ang) * r * 0.32;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(w.x - r * 0.3 + ex, w.y - r * 0.18 + ey, r * 0.2, 0, Math.PI * 2);
      ctx.arc(w.x + r * 0.3 + ex, w.y - r * 0.18 + ey, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(w.x - r * 0.3 + ex * 1.4, w.y - r * 0.18 + ey * 1.4, r * 0.1, 0, Math.PI * 2);
      ctx.arc(w.x + r * 0.3 + ex * 1.4, w.y - r * 0.18 + ey * 1.4, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      if (w.kind === 'brute') {
        ctx.fillStyle = '#ffb3bd';
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.arc(w.x + i * r * 0.55, w.y - r * 0.95, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (w.hp === 2) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText('II', w.x, w.y + r + 12);
      }
      ctx.restore();
    }
    // Enemy orbs.
    for (const o of state.orbs) {
      ctx.save();
      ctx.shadowColor = '#ff7ad9';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff7ad9';
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    trail.push({ x: p.x, y: p.y, life: 1 });
    if (trail.length > 12) trail.shift();
    for (let i = 0; i < trail.length; i += 1) {
      const t = trail[i];
      t.life -= 0.08;
      ctx.globalAlpha = Math.max(0, t.life * 0.22 * (p.dashT > 0 ? 2 : 1));
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(t.x, t.y, PLAYER.radius * (0.4 + 0.5 * (i / trail.length)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const blink = p.invuln > 0 && p.dashT <= 0 ? (Math.sin(state.time * 28) > 0 ? 0.45 : 1) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 22;
    const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, PLAYER.radius + 8);
    grad.addColorStop(0, '#fffbe8');
    grad.addColorStop(0.55, '#ffe9a3');
    grad.addColorStop(1, 'rgba(255, 215, 106, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff7d6';
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius * 0.62, 0, Math.PI * 2);
    ctx.fill();
    // Eyes look where the wisp flies.
    const ex = Math.cos(p.angle) * 3;
    const ey = Math.sin(p.angle) * 3;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(p.x - 4 + ex, p.y - 2 + ey, 2.2, 0, Math.PI * 2);
    ctx.arc(p.x + 4 + ex, p.y - 2 + ey, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Nova charge halo when the blast is ready.
    if (p.nova >= NOVA.max) {
      const pulse = 0.5 + 0.3 * Math.sin(state.time * 7);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#bfe9ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER.radius + 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function bar(x, y, w, h, frac, fill, back) {
    ctx.fillStyle = back;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
  }

  function drawHud(state, muted) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e9e4ff';
    ctx.font = '600 12px ' + FONT;
    ctx.fillText('SCORE', 24, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px ' + FONT;
    ctx.fillText(String(state.score), 24, 64);
    ctx.fillStyle = '#b9b0e8';
    ctx.font = '600 13px ' + FONT;
    ctx.fillText('BEST  ' + Math.max(state.best, state.score), 24, 86);
    if (state.combo >= 4) {
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 20px ' + FONT;
      ctx.fillText('COMBO x' + Math.min(5, 1 + Math.floor(state.combo / 8)), 24, 112);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e9e4ff';
    ctx.font = 'bold 18px ' + FONT;
    ctx.fillText('WAVE ' + state.wave + ' / 10', FIELD.width / 2, 30);
    bar(FIELD.width / 2 - 110, 40, 220, 7, state.waveTime / state.waveDur, '#8b5cf6', 'rgba(255,255,255,0.16)');

    // Hearts, top right.
    for (let i = 0; i < state.maxHearts; i += 1) {
      const x = FIELD.width - 30 - i * 30;
      ctx.fillStyle = i < state.hearts ? '#ff5d73' : 'rgba(255,255,255,0.18)';
      ctx.save();
      ctx.shadowColor = i < state.hearts ? '#ff5d73' : 'transparent';
      ctx.shadowBlur = i < state.hearts ? 8 : 0;
      heartPath(ctx, x, 26, 11);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#b9b0e8';
    ctx.font = '600 12px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText(muted ? 'MUTED  [M]' : 'SOUND ON  [M]', FIELD.width - 24, 58);

    // Dash + nova, bottom left.
    const p = state.player;
    const dashFrac = 1 - p.dashCd / state.p.dashCooldownMax;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#b9b0e8';
    ctx.font = '600 11px ' + FONT;
    ctx.fillText('DASH  [SPACE]', 24, FIELD.height - 42);
    bar(24, FIELD.height - 36, 110, 9, dashFrac, dashFrac >= 1 ? '#7ef0d4' : '#4d6b8a', 'rgba(255,255,255,0.16)');
    ctx.fillText('NOVA  [E]', 150, FIELD.height - 42);
    bar(150, FIELD.height - 36, 110, 9, p.nova / NOVA.max, p.nova >= NOVA.max ? '#bfe9ff' : '#5b8fd6', 'rgba(255,255,255,0.16)');
    if (p.nova >= NOVA.max) {
      ctx.fillStyle = '#bfe9ff';
      ctx.font = 'bold 12px ' + FONT;
      ctx.fillText('READY!', 268, FIELD.height - 27);
    }
    ctx.fillStyle = '#b9b0e8';
    ctx.font = '600 11px ' + FONT;
    ctx.fillText('SHARDS ' + state.shardsCollected + '   ·   WRAITHS DOWN ' + state.kills, 24, FIELD.height - 12);
  }

  function drawBanner(state) {
    const b = state.banner;
    if (!b) return;
    const a = b.t < 0.25 ? b.t / 0.25 : b.t > b.dur - 0.5 ? Math.max(0, (b.dur - b.t) / 0.5) : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px ' + FONT;
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 24;
    ctx.fillText(b.text, FIELD.width / 2, 210);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#d9c8ff';
    ctx.font = '600 16px ' + FONT;
    ctx.fillText(b.sub, FIELD.width / 2, 240);
    ctx.restore();
  }

  function dim(alpha) {
    ctx.fillStyle = 'rgba(8, 10, 28, ' + alpha + ')';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function panelBox(x, y, w, h) {
    ctx.fillStyle = PANEL;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawTitle(state) {
    dim(0.45);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 66px ' + FONT;
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 30;
    ctx.fillText('STARFALL VALE', FIELD.width / 2, 168);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#d9c8ff';
    ctx.font = '600 19px ' + FONT;
    ctx.fillText('A lone wisp. A haunted vale. Ten waves of night.', FIELD.width / 2, 204);
    panelBox(FIELD.width / 2 - 250, 238, 500, 138);
    ctx.fillStyle = '#e9e4ff';
    ctx.font = '600 16px ' + FONT;
    ctx.fillText('Gather falling starlight — each shard feeds your combo', FIELD.width / 2, 272);
    ctx.fillText('Dodge the wraiths — dash through motes, nova the swarm', FIELD.width / 2, 300);
    ctx.fillText('Draft a boon between waves — survive all ten, see the dawn', FIELD.width / 2, 328);
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText('MOVE  WASD / ARROWS / MOUSE      DASH  SPACE      NOVA  E      PAUSE  P', FIELD.width / 2, 358);
    ctx.fillStyle = '#b9b0e8';
    ctx.font = '600 15px ' + FONT;
    ctx.fillText('BEST SCORE  ' + state.best, FIELD.width / 2, 412);
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3.4);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px ' + FONT;
    ctx.fillText('PRESS ENTER OR CLICK TO BEGIN', FIELD.width / 2, 462);
    ctx.globalAlpha = 1;
  }

  function draftCards(state) {
    const cards = [];
    const total = state.draft.length * (CARD_W + 20) - 20;
    const x0 = (FIELD.width - total) / 2;
    state.draft.forEach((u, i) => {
      cards.push({ x: x0 + i * (CARD_W + 20), y: CARD_Y, w: CARD_W, h: CARD_H, upgrade: u, index: i });
    });
    return cards;
  }

  function drawDraft(state) {
    dim(0.55);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px ' + FONT;
    ctx.fillText('CHOOSE A BOON', FIELD.width / 2, 128);
    ctx.fillStyle = '#d9c8ff';
    ctx.font = '600 16px ' + FONT;
    ctx.fillText('Wave ' + (state.wave + 1) + ' is coming — pick one, then fight on', FIELD.width / 2, 158);
    for (const c of draftCards(state)) {
      panelBox(c.x, c.y, c.w, c.h);
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 13px ' + FONT;
      ctx.fillText('PRESS ' + (c.index + 1), c.x + c.w / 2, c.y + 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 19px ' + FONT;
      const name = c.upgrade.name;
      ctx.fillText(name.length > 14 ? name.slice(0, 14) : name, c.x + c.w / 2, c.y + 62);
      ctx.fillStyle = '#d9c8ff';
      ctx.font = '600 14px ' + FONT;
      const words = c.upgrade.desc.split(' ');
      let line = '';
      let ly = c.y + 96;
      for (const word of words) {
        if ((line + ' ' + word).trim().length > 22) {
          ctx.fillText(line.trim(), c.x + c.w / 2, ly);
          ly += 20;
          line = word;
        } else {
          line += ' ' + word;
        }
      }
      ctx.fillText(line.trim(), c.x + c.w / 2, ly);
      const taken = state.taken[c.upgrade.id] ?? 0;
      if (taken > 0) {
        ctx.fillStyle = '#8b93b8';
        ctx.font = '600 12px ' + FONT;
        ctx.fillText('owned x' + taken, c.x + c.w / 2, c.y + c.h - 18);
      }
    }
  }

  function drawPaused() {
    dim(0.6);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px ' + FONT;
    ctx.fillText('PAUSED', FIELD.width / 2, 260);
    ctx.fillStyle = '#d9c8ff';
    ctx.font = '600 16px ' + FONT;
    ctx.fillText('P or Esc to keep playing   ·   R to restart the run', FIELD.width / 2, 300);
  }

  function drawEnd(state, won) {
    dim(0.6);
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? MOON : '#ff8fa0';
    ctx.font = 'bold 52px ' + FONT;
    ctx.shadowColor = won ? GOLD : '#ff5d73';
    ctx.shadowBlur = 26;
    ctx.fillText(won ? 'DAWN BREAKS' : 'THE VALE FADES', FIELD.width / 2, 168);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e9e4ff';
    ctx.font = '600 18px ' + FONT;
    ctx.fillText(won ? 'Ten waves survived — the wisp sees the morning.' : state.overReason, FIELD.width / 2, 204);
    panelBox(FIELD.width / 2 - 210, 232, 420, 168);
    const rows = [
      ['SCORE', String(state.score)],
      ['BEST', String(Math.max(state.best, state.score))],
      ['WAVE REACHED', String(state.wave) + ' / 10'],
      ['SHARDS GATHERED', String(state.shardsCollected)],
      ['WRAITHS DOWN', String(state.kills)],
      ['TIME', Math.floor(state.stats.timePlayed / 60) + ':' + String(Math.floor(state.stats.timePlayed % 60)).padStart(2, '0')],
    ];
    ctx.font = '600 16px ' + FONT;
    rows.forEach((row, i) => {
      const y = 262 + i * 24;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#b9b0e8';
      ctx.fillText(row[0], FIELD.width / 2 - 180, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(row[1], FIELD.width / 2 + 180, y);
    });
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3.4);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', FIELD.width / 2, 448);
    ctx.globalAlpha = 1;
  }

  function draw(state, muted) {
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    // Letterbox bars.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    ctx.save();
    if (state.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground(state);
    if (state.screen !== SCREEN_TITLE) {
      drawShards(state);
      drawWraiths(state);
      drawPlayer(state);
      state.particles.draw(ctx);
    } else {
      drawShards(state);
      state.particles.draw(ctx);
    }
    if (state.screen === SCREEN_PLAY || state.screen === SCREEN_DRAFT || state.screen === SCREEN_PAUSED) {
      drawHud(state, muted);
    }
    drawBanner(state);
    if (state.screen === SCREEN_TITLE) drawTitle(state);
    if (state.screen === SCREEN_DRAFT) drawDraft(state);
    if (state.screen === SCREEN_PAUSED) drawPaused();
    if (state.screen === SCREEN_OVER) drawEnd(state, false);
    if (state.screen === SCREEN_WIN) drawEnd(state, true);
    if (state.flash > 0) {
      ctx.fillStyle = 'rgba(255, 93, 115, ' + (state.flash * 0.4) + ')';
      ctx.fillRect(-20, -20, FIELD.width + 40, FIELD.height + 40);
    }
    ctx.restore();
  }

  return {
    draw,
    draftCards,
    get view() { return view; },
    // Map a CSS-pixel click to field coordinates for the draft cards.
    toField(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
      const ox = (rect.width - FIELD.width * scale) / 2;
      const oy = (rect.height - FIELD.height * scale) / 2;
      return { x: (clientX - rect.left - ox) / scale, y: (clientY - rect.top - oy) / scale };
    },
  };
}
