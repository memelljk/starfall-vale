// Keyboard + mouse + touch, reduced to one shape the world understands:
// a move vector (mx, my) and the two action flags (dash, nova).
// Keys: WASD / arrows to move, Space or Shift to dash, E to nova,
// Enter to confirm, P or Esc to pause, M to mute, R to restart, 1-3 to draft.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';

const MOVE_KEYS = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
};

export function createInput(canvas, onAction) {
  const keys = new Set();
  const pointer = { x: 0, y: 0, down: false, active: false };
  let dashQueued = false;
  let novaQueued = false;

  function keyDown(event) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') dashQueued = true;
    if (event.code === 'KeyE') novaQueued = true;
    if (event.code === 'Enter') onAction(ACTION_CONFIRM);
    if (event.code === 'KeyP' || event.code === 'Escape') onAction(ACTION_PAUSE);
    if (event.code === 'KeyM') onAction(ACTION_MUTE);
    if (event.code === 'KeyR') onAction(ACTION_RESTART);
    if (event.code === 'Digit1' || event.code === 'Digit2' || event.code === 'Digit3') {
      onAction('draft:' + event.code.slice(-1));
    }
  }
  function keyUp(event) {
    keys.delete(event.code);
  }
  function toGame(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function pointerDown(event) {
    const p = toGame(event);
    pointer.x = p.x; pointer.y = p.y; pointer.down = true; pointer.active = true;
  }
  function pointerMove(event) {
    const p = toGame(event);
    pointer.x = p.x; pointer.y = p.y;
    if (pointer.down) pointer.active = true;
  }
  function pointerUp() {
    pointer.down = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointerdown', pointerDown);
  window.addEventListener('pointermove', pointerMove);
  window.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  // The move vector for this frame. Keyboard wins; otherwise a held pointer
  // steers the wisp toward it (mouse and touch alike).
  function read(scale, offsetX, offsetY) {
    let mx = 0;
    let my = 0;
    for (const code of keys) {
      const d = MOVE_KEYS[code];
      if (d) { mx += d[0]; my += d[1]; }
    }
    if (mx === 0 && my === 0 && pointer.active) {
      const gx = (pointer.x - offsetX) / scale;
      const gy = (pointer.y - offsetY) / scale;
      const dx = gx - this.playerX;
      const dy = gy - this.playerY;
      const dist = Math.hypot(dx, dy);
      if (dist > 14) { mx = dx / dist; my = dy / dist; }
    }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    const out = { mx, my, dash: dashQueued, nova: novaQueued, pointer };
    dashQueued = false;
    novaQueued = false;
    return out;
  }

  return {
    read,
    // main.js tells input where the wisp is, so pointer steering can aim at it.
    setPlayer(x, y) { this.playerX = x; this.playerY = y; },
    playerX: 0,
    playerY: 0,
  };
}
