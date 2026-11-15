// All sound is synthesized with WebAudio — no audio files, no network.
// Each effect is a short oscillator or filtered-noise gesture. The context is
// created on the first user gesture (browsers forbid it before then).
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  try {
    muted = window.localStorage.getItem('starfall-vale-muted') === '1';
  } catch { /* storage off: sound stays on */ }

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.22;
    master.connect(ctx.destination);
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, cutoff) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      try { window.localStorage.setItem('starfall-vale-muted', muted ? '1' : '0'); } catch { /* ignore */ }
      if (master) master.gain.value = muted ? 0 : 0.22;
      return muted;
    },
    // The pickup blip climbs with the combo, so a hot streak sounds hot.
    pickup(combo) {
      const step = Math.min(combo, 24);
      tone(520 + step * 22, 0.09, 'sine', 0.5, 780 + step * 22);
    },
    moon() {
      tone(660, 0.16, 'sine', 0.5, 1320);
      tone(990, 0.22, 'sine', 0.3, 1480);
    },
    dash() { noise(0.16, 0.35, 2400); },
    nova() {
      tone(220, 0.4, 'sawtooth', 0.25, 880);
      noise(0.35, 0.3, 1200);
    },
    hit() {
      tone(140, 0.25, 'square', 0.4, 60);
      noise(0.2, 0.4, 900);
    },
    wraithDown() { tone(300, 0.12, 'triangle', 0.35, 90); },
    waveClear() {
      [523, 659, 784, 1047].forEach((f, i) => {
        window.setTimeout(() => tone(f, 0.18, 'sine', 0.4), i * 90);
      });
    },
    win() {
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => {
        window.setTimeout(() => tone(f, 0.3, 'sine', 0.4), i * 110);
      });
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => {
        window.setTimeout(() => tone(f, 0.28, 'triangle', 0.35), i * 140);
      });
    },
    click() { tone(700, 0.06, 'sine', 0.35, 900); },
  };
}
