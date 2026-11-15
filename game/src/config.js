// Starfall Vale — every tuning number lives here, so the whole game can be
// retuned from one file. All speeds are pixels per second, all times seconds.
export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;
export const BEST_KEY = 'starfall-vale-best';
export const MUTE_KEY = 'starfall-vale-muted';

export const WAVES = 10;
export const WAVE_SECONDS = 40;
export const WAVE10_SECONDS = 45;

export const PLAYER = {
  radius: 14,
  speed: 262,
  accel: 2600,
  friction: 2200,
  dashSpeed: 580,
  dashTime: 0.16,
  dashCooldown: 2.5,
  dashInvuln: 0.4,
  hitInvuln: 1.3,
  magnet: 52,
  maxHearts: 3,
};

export const SCORE = {
  shard: 10,
  moon: 50,
  wraith: 25,
  waveClear: 100,
  win: 1000,
};

export const COMBO = {
  perShard: 1,
  cap: 30,
  step: 8, // every 8 combo adds +1 multiplier
  maxMult: 5,
  decayAfter: 3, // seconds without a pickup before the combo starts falling
  decayRate: 6, // combo points lost per second while decaying
};

export const NOVA = {
  radius: 175,
  chargePerShard: 9,
  chargePerMoon: 30,
  max: 100,
};

// Wraith kinds, unlocked by wave. hp 1 dies to a nova or a dash; hp 2 (brute)
// takes two nova hits and can never be dashed through.
export const WRAITH = {
  mote: { radius: 10, speed: 118, hp: 1, score: 25, color: '#b78cff', core: '#e9dcff' },
  drifter: { radius: 14, speed: 74, hp: 1, score: 25, color: '#8f7bff', core: '#cfc4ff' },
  spitter: { radius: 16, speed: 58, hp: 1, score: 40, color: '#ff7ad9', core: '#ffd2f2' },
  brute: { radius: 23, speed: 104, hp: 2, score: 60, color: '#ff5d73', core: '#ffc2cb' },
};

// Which kinds may appear on each wave (index 0 = wave 1). Weights pick the kind.
export const WAVE_TABLE = [
  [{ kind: 'mote', w: 1 }],
  [{ kind: 'mote', w: 3 }, { kind: 'drifter', w: 1 }],
  [{ kind: 'mote', w: 2 }, { kind: 'drifter', w: 2 }],
  [{ kind: 'mote', w: 2 }, { kind: 'drifter', w: 2 }, { kind: 'spitter', w: 1 }],
  [{ kind: 'mote', w: 2 }, { kind: 'drifter', w: 2 }, { kind: 'spitter', w: 2 }],
  [{ kind: 'mote', w: 2 }, { kind: 'drifter', w: 1 }, { kind: 'spitter', w: 2 }, { kind: 'brute', w: 1 }],
  [{ kind: 'mote', w: 2 }, { kind: 'drifter', w: 1 }, { kind: 'spitter', w: 2 }, { kind: 'brute', w: 2 }],
  [{ kind: 'mote', w: 1 }, { kind: 'drifter', w: 1 }, { kind: 'spitter', w: 2 }, { kind: 'brute', w: 2 }],
  [{ kind: 'mote', w: 1 }, { kind: 'spitter', w: 2 }, { kind: 'brute', w: 3 }],
  [{ kind: 'mote', w: 1 }, { kind: 'drifter', w: 1 }, { kind: 'spitter', w: 2 }, { kind: 'brute', w: 3 }],
];

export function waveDuration(wave) {
  return wave >= WAVES ? WAVE10_SECONDS : WAVE_SECONDS;
}
// Wraiths arrive faster as the waves climb: 2.3 s apart on wave 1, 0.9 s on 10.
export function wraithInterval(wave) {
  return Math.max(0.9, 2.3 - (wave - 1) * 0.16);
}
export function wraithCap(wave) {
  return 5 + wave;
}
export function shardInterval(wave) {
  return Math.max(0.34, 0.55 - (wave - 1) * 0.02);
}

// The draft: three boons offered between waves. `max` is how many times one
// run may take the same boon; `apply` mutates the player's permanent stats.
export const UPGRADES = [
  { id: 'swift', name: 'Swift Current', max: 4,
    desc: '+12% move speed', apply: (p) => { p.speed *= 1.12; } },
  { id: 'dash', name: 'Long Dash', max: 3,
    desc: 'Dash recharges 20% faster and reaches 25% further',
    apply: (p) => { p.dashCooldownMax *= 0.8; p.dashTime *= 1.25; } },
  { id: 'nova', name: 'Nova Bloom', max: 3,
    desc: 'Nova blast radius +35%', apply: (p) => { p.novaRadius *= 1.35; } },
  { id: 'magnet', name: 'Magnet Heart', max: 3,
    desc: 'Starlight is pulled in from 50% further away',
    apply: (p) => { p.magnet *= 1.5; } },
  { id: 'heart', name: 'Second Wind', max: 2,
    desc: '+1 heart right now (up to 5)', apply: (p, s) => { s.maxHearts = Math.min(5, s.maxHearts + 1); s.hearts = Math.min(s.maxHearts, s.hearts + 1); } },
  { id: 'greed', name: 'Shard Greed', max: 3,
    desc: 'Every shard is worth 25% more', apply: (p) => { p.shardValue *= 1.25; } },
  { id: 'guard', name: 'Combo Guard', max: 2,
    desc: 'Your combo fades half as fast', apply: (p) => { p.comboDecay *= 0.5; } },
  { id: 'twin', name: 'Twin Nova', max: 2,
    desc: 'Nova charges twice as fast', apply: (p) => { p.novaRate *= 2; } },
  { id: 'mist', name: 'Thick Mist', max: 2,
    desc: 'Stay untouchable 0.5 s longer after a hit',
    apply: (p) => { p.hitInvuln += 0.5; } },
];
// When every boon is maxed out, the draft offers starlight instead.
export const CACHE_BOON = { id: 'cache', name: 'Starlight Cache', max: 99, desc: '+250 score, no strings attached', apply: (p, s) => { s.score += 250; } };
