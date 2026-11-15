// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between six screens: title,
// play, draft, paused, game over and win.
//
// ?seed=N fixes the falling pattern. ?shot=start|play|draft|over (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, SCREEN_DRAFT, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';
import { createRenderer } from './render.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const world = createWorld(createRandom(seed), audio);
const renderer = createRenderer(canvas);
const input = createInput(canvas, onAction);

function describe() {
  const s = world.state;
  if (s.screen === SCREEN_TITLE) return 'Starfall Vale. Press Enter to begin.';
  if (s.screen === SCREEN_PLAY) return 'Wave ' + s.wave + ' of 10. Score ' + s.score + '. ' + s.hearts + ' hearts.';
  if (s.screen === SCREEN_DRAFT) return 'Wave clear. Choose a boon: press 1, 2 or 3.';
  if (s.screen === SCREEN_PAUSED) return 'Paused.';
  if (s.screen === SCREEN_OVER) return 'Game over. Score ' + s.score + '. Press R to play again.';
  if (s.screen === SCREEN_WIN) return 'You survived the vale. Score ' + s.score + '. Press R to play again.';
  return '';
}

function onAction(action) {
  const s = world.state;
  audio.unlock();
  if (action === ACTION_MUTE) {
    audio.toggleMute();
    return;
  }
  if (action === ACTION_CONFIRM) {
    if (s.screen === SCREEN_TITLE) { audio.click(); world.startGame(); }
    else if (s.screen === SCREEN_OVER || s.screen === SCREEN_WIN) { audio.click(); world.startGame(); }
    return;
  }
  if (action === ACTION_RESTART) {
    if (s.screen !== SCREEN_TITLE) { audio.click(); world.startGame(); }
    return;
  }
  if (action === ACTION_PAUSE) {
    if (s.screen === SCREEN_PLAY) s.screen = SCREEN_PAUSED;
    else if (s.screen === SCREEN_PAUSED) s.screen = SCREEN_PLAY;
    return;
  }
  if (action.startsWith('draft:')) {
    if (s.screen === SCREEN_DRAFT) {
      world.applyDraft(Number(action.slice(6)) - 1);
    }
  }
}

canvas.addEventListener('pointerdown', (event) => {
  const s = world.state;
  audio.unlock();
  if (s.screen === SCREEN_TITLE) { world.startGame(); return; }
  if (s.screen === SCREEN_OVER || s.screen === SCREEN_WIN) { world.startGame(); return; }
  if (s.screen === SCREEN_DRAFT) {
    const f = renderer.toField(event.clientX, event.clientY);
    for (const c of renderer.draftCards(s)) {
      if (f.x >= c.x && f.x <= c.x + c.w && f.y >= c.y && f.y <= c.y + c.h) {
        world.applyDraft(c.index);
        return;
      }
    }
  }
});

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, audio.muted);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  status.textContent = describe();
  requestAnimationFrame(paint);
}

if (shot) {
  runShot(shot);
} else {
  let last = performance.now();
  let acc = 0;
  let lastScreen = world.state.screen;
  status.textContent = describe();
  function frame(now) {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    acc += dt;
    const s = world.state;
    while (acc >= STEP) {
      acc -= STEP;
      if (s.screen === SCREEN_TITLE) world.stepAmbient(STEP);
      else if (s.screen === SCREEN_PLAY) {
        const rect = canvas.getBoundingClientRect();
        const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
        const ox = (rect.width - FIELD.width * scale) / 2;
        const oy = (rect.height - FIELD.height * scale) / 2;
        input.setPlayer(s.player.x, s.player.y);
        world.step(STEP, input.read(scale, ox, oy));
      } else {
        // Frozen screens (draft, pause, over, win): let the hit flash and
        // the shake settle instead of freezing mid-flash.
        s.flash = Math.max(0, s.flash - 1.6 * STEP);
        s.shake = Math.max(0, s.shake - 30 * STEP);
      }
    }
    renderer.draw(s, audio.muted);
    if (s.screen !== lastScreen) {
      lastScreen = s.screen;
      status.textContent = describe();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
