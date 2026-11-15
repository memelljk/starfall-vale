// Starfall Vale — the whole simulation: the wisp, the wraiths, the falling
// starlight, the waves and the draft. No drawing and no DOM here; render.js
// paints whatever this state holds. The world steps in fixed 1/60 s slices.
import {
  BEST_KEY, COMBO, FIELD, NOVA, PLAYER, SCORE, STEP, WAVES, WRAITH,
  WAVE_TABLE, CACHE_BOON, UPGRADES, waveDuration, wraithCap, wraithInterval,
  shardInterval,
} from './config.js';
import { createParticles } from './particles.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WAVE = 4;
export const EVENT_WIN = 8;
export const EVENT_DRAFT = 16;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage off */ }
}

function baseStats() {
  return {
    speed: PLAYER.speed,
    dashCooldownMax: PLAYER.dashCooldown,
    dashTime: PLAYER.dashTime,
    novaRadius: NOVA.radius,
    magnet: PLAYER.magnet,
    shardValue: 1,
    novaRate: 1,
    comboDecay: COMBO.decayRate,
    hitInvuln: PLAYER.hitInvuln,
  };
}

export function createWorld(random, sfx) {
  const particles = createParticles();
  const state = {
    particles,
    screen: SCREEN_TITLE,
    time: 0,
    wave: 1,
    waveTime: 0,
    waveDur: waveDuration(1),
    score: 0,
    best: readBest(),
    combo: 0,
    comboTimer: 0,
    shardsCollected: 0,
    kills: 0,
    hearts: PLAYER.maxHearts,
    maxHearts: PLAYER.maxHearts,
    taken: {},
    draft: null,
    banner: null,
    shake: 0,
    flash: 0,
    stats: { timePlayed: 0 },
    overReason: '',
    player: null,
    wraiths: [],
    shards: [],
    orbs: [],
    spawnT: { shard: 0, moon: 8, wraith: 1.2 },
    p: baseStats(),
  };

  function freshPlayer() {
    return {
      x: FIELD.width / 2, y: FIELD.height - 90, vx: 0, vy: 0, angle: -Math.PI / 2,
      dashT: 0, dashCd: 0, dashDirX: 0, dashDirY: -1, invuln: 0, nova: 0,
    };
  }

  function reset(best) {
    state.screen = SCREEN_TITLE;
    state.time = 0;
    state.wave = 1;
    state.waveTime = 0;
    state.waveDur = waveDuration(1);
    state.score = 0;
    state.best = best ?? readBest();
    state.combo = 0;
    state.comboTimer = 0;
    state.shardsCollected = 0;
    state.kills = 0;
    state.hearts = PLAYER.maxHearts;
    state.maxHearts = PLAYER.maxHearts;
    state.taken = {};
    state.draft = null;
    state.banner = { text: 'STARFALL VALE', sub: 'gather the light · survive the night', t: 0, dur: 3 };
    state.shake = 0;
    state.flash = 0;
    state.stats = { timePlayed: 0 };
    state.overReason = '';
    state.player = freshPlayer();
    state.wraiths = [];
    state.shards = [];
    state.orbs = [];
    state.spawnT = { shard: 0.2, moon: 9, wraith: 1.6 };
    state.p = baseStats();
    particles.clear();
  }

  function startGame() {
    reset(state.best);
    state.screen = SCREEN_PLAY;
    state.banner = { text: 'WAVE 1', sub: 'the vale wakes — gather starlight', t: 0, dur: 2.4 };
  }

  function mult() {
    return Math.min(COMBO.maxMult, 1 + Math.floor(state.combo / COMBO.step));
  }

  function spawnShard(moon) {
    state.shards.push({
      x: random.range(24, FIELD.width - 24),
      y: -14,
      vy: moon ? 30 : random.range(42, 68),
      phase: random.range(0, Math.PI * 2),
      sway: moon ? 12 : random.range(14, 30),
      moon,
      r: moon ? 12 : 8,
      t: 0,
    });
  }

  function pickKind() {
    const table = WAVE_TABLE[Math.min(state.wave, WAVES) - 1];
    let total = 0;
    for (const e of table) total += e.w;
    let roll = random.next() * total;
    for (const e of table) {
      roll -= e.w;
      if (roll <= 0) return e.kind;
    }
    return table[0].kind;
  }

  function spawnWraith() {
    const kind = pickKind();
    const def = WRAITH[kind];
    let x;
    let y;
    const edge = random.next();
    if (kind === 'spitter') {
      // Spitters keep their distance: appear away from the wisp.
      for (let tries = 0; tries < 12; tries += 1) {
        x = random.range(40, FIELD.width - 40);
        y = random.range(40, FIELD.height - 120);
        if (Math.hypot(x - state.player.x, y - state.player.y) > 260) break;
      }
    } else if (edge < 0.45) {
      x = random.range(20, FIELD.width - 20); y = -20;
    } else if (edge < 0.72) {
      x = -20; y = random.range(20, FIELD.height - 60);
    } else {
      x = FIELD.width + 20; y = random.range(20, FIELD.height - 60);
    }
    state.wraiths.push({
      kind, x, y, vx: 0, vy: 0, hp: def.hp, r: def.radius,
      angle: random.range(0, Math.PI * 2), wanderT: random.range(0, 2),
      shootT: random.range(2, 3.5), t: 0, hitT: 0,
    });
  }

  function spawnOrb(from) {
    const dx = state.player.x - from.x;
    const dy = state.player.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    state.orbs.push({ x: from.x, y: from.y, vx: (dx / d) * 145, vy: (dy / d) * 145, r: 6, life: 4.5 });
  }

  function collectShard(shard, index) {
    const value = Math.round((shard.moon ? SCORE.moon : SCORE.shard) * state.p.shardValue * mult());
    state.score += value;
    state.combo = Math.min(COMBO.cap, state.combo + COMBO.perShard);
    state.comboTimer = COMBO.decayAfter;
    state.shardsCollected += 1;
    state.player.nova = Math.min(NOVA.max, state.player.nova + (shard.moon ? NOVA.chargePerMoon : NOVA.chargePerShard) * state.p.novaRate);
    particles.burst(shard.x, shard.y, shard.moon ? '#ffe9a3' : '#ffd76a', shard.moon ? 14 : 7, 130);
    particles.text(shard.x, shard.y - 12, '+' + value, '#ffe9a3');
    if (shard.moon) sfx.moon(); else sfx.pickup(state.combo);
    state.shards.splice(index, 1);
  }

  function destroyWraith(index, byNova) {
    const w = state.wraiths[index];
    const value = WRAITH[w.kind].score;
    state.score += value;
    state.kills += 1;
    particles.burst(w.x, w.y, WRAITH[w.kind].color, 12, 170);
    particles.text(w.x, w.y - 10, '+' + value, '#d9c8ff');
    sfx.wraithDown();
    state.wraiths.splice(index, 1);
  }

  function novaBlast() {
    const p = state.player;
    p.nova = 0;
    sfx.nova();
    particles.ring(p.x, p.y, '#bfe9ff', state.p.novaRadius);
    particles.burst(p.x, p.y, '#bfe9ff', 26, 320);
    state.shake = Math.max(state.shake, 8);
    for (let i = state.wraiths.length - 1; i >= 0; i -= 1) {
      const w = state.wraiths[i];
      if (Math.hypot(w.x - p.x, w.y - p.y) <= state.p.novaRadius + w.r) {
        w.hp -= 1;
        w.hitT = 0.2;
        if (w.hp <= 0) destroyWraith(i, true);
      }
    }
    for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
      const o = state.orbs[i];
      if (Math.hypot(o.x - p.x, o.y - p.y) <= state.p.novaRadius) {
        particles.burst(o.x, o.y, '#ff9ecf', 5, 90);
        state.orbs.splice(i, 1);
      }
    }
  }

  function hurtPlayer() {
    const p = state.player;
    state.hearts -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    p.invuln = state.p.hitInvuln;
    state.shake = 14;
    state.flash = 0.55;
    particles.burst(p.x, p.y, '#ff5d73', 18, 220);
    sfx.hit();
    if (state.hearts <= 0) {
      state.screen = SCREEN_OVER;
      state.overReason = 'The wraiths took the last of your light.';
      if (state.score > state.best) { state.best = state.score; saveBest(state.best); }
      sfx.lose();
      return EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function rollDraft() {
    const available = UPGRADES.filter((u) => (state.taken[u.id] ?? 0) < u.max);
    const picks = [];
    const pool = [...available];
    while (picks.length < 3 && pool.length > 0) {
      const i = Math.floor(random.next() * pool.length);
      picks.push(pool.splice(i, 1)[0]);
    }
    while (picks.length < 3) picks.push(CACHE_BOON);
    state.draft = picks;
    state.screen = SCREEN_DRAFT;
    return EVENT_DRAFT;
  }

  function applyDraft(index) {
    const pick = state.draft?.[index];
    if (!pick) return;
    state.taken[pick.id] = (state.taken[pick.id] ?? 0) + 1;
    pick.apply(state.p, state);
    state.draft = null;
    state.wave += 1;
    state.waveTime = 0;
    state.waveDur = waveDuration(state.wave);
    state.wraiths = [];
    state.orbs = [];
    state.spawnT = { shard: 0.2, moon: 9, wraith: 1.4 };
    state.screen = SCREEN_PLAY;
    const unlock = state.wave === 4 ? 'spitters join the hunt' : state.wave === 6 ? 'brutes stir in the dark' : state.wave === 10 ? 'the last wave — hold until dawn' : 'the night deepens';
    state.banner = { text: 'WAVE ' + state.wave, sub: unlock, t: 0, dur: 2.4 };
    sfx.click();
  }

  function waveClear() {
    const bonus = SCORE.waveClear * state.wave;
    state.score += bonus;
    sfx.waveClear();
    if (state.wave >= WAVES) {
      state.score += SCORE.win;
      state.screen = SCREEN_WIN;
      if (state.score > state.best) { state.best = state.score; saveBest(state.best); }
      sfx.win();
      return EVENT_WIN;
    }
    state.banner = { text: 'WAVE CLEAR', sub: '+' + bonus + ' — choose a boon', t: 0, dur: 1.6 };
    return rollDraft() | EVENT_WAVE;
  }

  function stepPlayer(dt, input) {
    const p = state.player;
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    if (input.dash && p.dashCd <= 0 && p.dashT <= 0) {
      const dx = input.mx !== 0 || input.my !== 0 ? input.mx : Math.cos(p.angle);
      const dy = input.mx !== 0 || input.my !== 0 ? input.my : Math.sin(p.angle);
      const len = Math.hypot(dx, dy) || 1;
      p.dashDirX = dx / len;
      p.dashDirY = dy / len;
      p.dashT = state.p.dashTime;
      p.dashCd = state.p.dashCooldownMax;
      p.invuln = Math.max(p.invuln, state.p.dashInvuln);
      sfx.dash();
      particles.burst(p.x, p.y, '#bfe9ff', 8, 120);
    }
    if (input.nova && p.nova >= NOVA.max) novaBlast();
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.vx = p.dashDirX * PLAYER.dashSpeed;
      p.vy = p.dashDirY * PLAYER.dashSpeed;
    } else {
      const tx = input.mx * state.p.speed;
      const ty = input.my * state.p.speed;
      const k = 1 - Math.exp(-PLAYER.accel / state.p.speed * dt * 3.2);
      p.vx += (tx - p.vx) * Math.min(1, k * 6);
      p.vy += (ty - p.vy) * Math.min(1, k * 6);
      if (input.mx === 0 && input.my === 0) {
        const f = Math.exp(-PLAYER.friction / state.p.speed * dt * 2.4);
        p.vx *= f;
        p.vy *= f;
      }
    }
    p.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, p.x + p.vx * dt));
    p.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, p.y + p.vy * dt));
    if (Math.hypot(p.vx, p.vy) > 20) p.angle = Math.atan2(p.vy, p.vx);
  }

  function stepWraiths(dt) {
    const p = state.player;
    for (const w of state.wraiths) {
      w.t += dt;
      w.hitT = Math.max(0, w.hitT - dt);
      const dx = p.x - w.x;
      const dy = p.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      const def = WRAITH[w.kind];
      let wantX = 0;
      let wantY = 0;
      if (w.kind === 'mote' || w.kind === 'brute') {
        wantX = (dx / d) * def.speed;
        wantY = (dy / d) * def.speed;
      } else if (w.kind === 'drifter') {
        w.wanderT -= dt;
        if (w.wanderT <= 0) {
          w.wanderT = random.range(0.8, 2.2);
          w.angle = random.range(0, Math.PI * 2);
        }
        wantX = Math.cos(w.angle) * def.speed + (dx / d) * 26;
        wantY = Math.sin(w.angle) * def.speed + (dy / d) * 26;
      } else if (w.kind === 'spitter') {
        if (d > 250) { wantX = (dx / d) * def.speed; wantY = (dy / d) * def.speed; }
        else if (d < 170) { wantX = (-dx / d) * def.speed; wantY = (-dy / d) * def.speed; }
        else { wantX = (-dy / d) * def.speed * 0.6; wantY = (dx / d) * def.speed * 0.6; }
        w.shootT -= dt;
        if (w.shootT <= 0 && d < 460) {
          spawnOrb(w);
          w.shootT = random.range(3, 4);
        }
      }
      const k = 1 - Math.exp(-3.2 * dt);
      w.vx += (wantX - w.vx) * k;
      w.vy += (wantY - w.vy) * k;
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      w.x = Math.max(-30, Math.min(FIELD.width + 30, w.x));
      w.y = Math.max(-30, Math.min(FIELD.height + 30, w.y));
    }
    // Gentle separation so wraiths do not stack on one point.
    for (let i = 0; i < state.wraiths.length; i += 1) {
      for (let j = i + 1; j < state.wraiths.length; j += 1) {
        const a = state.wraiths[i];
        const b = state.wraiths[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.r + b.r - 2;
        if (d > 0 && d < min) {
          const push = (min - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
        }
      }
    }
  }

  function step(dt, input) {
    if (state.screen !== SCREEN_PLAY) return 0;
    let events = 0;
    state.time += dt;
    state.waveTime += dt;
    state.stats.timePlayed += dt;
    if (state.banner) {
      state.banner.t += dt;
      if (state.banner.t > state.banner.dur) state.banner = null;
    }
    state.shake = Math.max(0, state.shake - 30 * dt);
    state.flash = Math.max(0, state.flash - 1.6 * dt);

    // Spawning.
    state.spawnT.shard -= dt;
    if (state.spawnT.shard <= 0) {
      spawnShard(false);
      state.spawnT.shard = shardInterval(state.wave);
    }
    state.spawnT.moon -= dt;
    if (state.spawnT.moon <= 0) {
      spawnShard(true);
      state.spawnT.moon = random.range(11, 15);
    }
    state.spawnT.wraith -= dt;
    if (state.spawnT.wraith <= 0 && state.wraiths.length < wraithCap(state.wave)) {
      spawnWraith();
      state.spawnT.wraith = wraithInterval(state.wave) * random.range(0.8, 1.25);
    }

    stepPlayer(dt, input);

    // Shards fall, sway, and drift toward the wisp inside its magnet radius.
    const p = state.player;
    for (let i = state.shards.length - 1; i >= 0; i -= 1) {
      const s = state.shards[i];
      s.t += dt;
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d < state.p.magnet && d > 1) {
        const pull = 340 * (1 - d / state.p.magnet);
        s.x += (dx / d) * pull * dt;
        s.y += (dy / d) * pull * dt;
      } else {
        s.x += Math.sin(s.t * 2.1 + s.phase) * s.sway * dt;
      }
      s.y += s.vy * dt;
      if (d < PLAYER.radius + s.r + 4) { collectShard(s, i); continue; }
      if (s.y > FIELD.height + 16) state.shards.splice(i, 1);
    }

    stepWraiths(dt);

    // Enemy orbs fly straight and fade.
    for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
      const o = state.orbs[i];
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life -= dt;
      if (o.life <= 0 || o.x < -20 || o.x > FIELD.width + 20 || o.y < -20 || o.y > FIELD.height + 20) {
        state.orbs.splice(i, 1);
      }
    }

    // Contact: dashing through motes and drifters shatters them; anything else
    // touching the wisp while it can be hurt costs a heart.
    for (let i = state.wraiths.length - 1; i >= 0; i -= 1) {
      const w = state.wraiths[i];
      const d = Math.hypot(w.x - p.x, w.y - p.y);
      if (d > w.r + PLAYER.radius) continue;
      if (p.dashT > 0 && (w.kind === 'mote' || w.kind === 'drifter')) {
        destroyWraith(i, false);
        continue;
      }
      if (p.invuln <= 0) {
        events |= hurtPlayer();
        if (state.screen !== SCREEN_PLAY) break;
      }
    }
    if (state.screen === SCREEN_PLAY) {
      for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
        const o = state.orbs[i];
        if (Math.hypot(o.x - p.x, o.y - p.y) < o.r + PLAYER.radius && p.invuln <= 0) {
          state.orbs.splice(i, 1);
          events |= hurtPlayer();
          if (state.screen !== SCREEN_PLAY) break;
        }
      }
    }

    // Combo fades when the wisp stops gathering.
    if (state.combo > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = Math.max(0, state.combo - state.p.comboDecay * dt);
      }
    }

    particles.update(dt);

    if (state.screen === SCREEN_PLAY && state.waveTime >= state.waveDur) {
      events |= waveClear();
    }
    return events;
  }

  // The title screen's living backdrop: starlight drifts down, nothing hunts.
  function stepAmbient(dt) {
    state.time += dt;
    state.spawnT.shard -= dt;
    if (state.spawnT.shard <= 0) {
      spawnShard(false);
      state.spawnT.shard = 0.7;
    }
    for (let i = state.shards.length - 1; i >= 0; i -= 1) {
      const s = state.shards[i];
      s.t += dt;
      s.x += Math.sin(s.t * 2.1 + s.phase) * s.sway * dt;
      s.y += s.vy * dt;
      if (s.y > FIELD.height + 16) state.shards.splice(i, 1);
    }
    particles.update(dt);
  }

  reset(state.best);
  return {
    state,
    particles,
    reset,
    startGame,
    step,
    stepAmbient,
    applyDraft,
    mult,
  };
}
