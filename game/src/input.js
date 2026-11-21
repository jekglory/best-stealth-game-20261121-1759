// Input: keyboard state plus mouse clicks, translated into the key set the
// world reads. Space starts the game and sprints while held; P pauses.
export function makeKeys() {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    sneak: false,
    sprint: false,
  };
}

const KEY_MAP = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  ShiftLeft: 'sneak',
  ShiftRight: 'sneak',
  Space: 'sprint',
};

// Attach keyboard listeners. onAction fires for one-off keys: 'start',
// 'pause', 'pickup', 'mute' and 'next'. Releasing the window clears held
// keys, so a thief never keeps walking after the tab loses focus.
export function bindKeyboard(keys, onAction) {
  const clear = () => {
    for (const k of Object.keys(keys)) keys[k] = false;
  };
  window.addEventListener('blur', clear);
  const down = (e) => {
    // Space does double duty: it starts the game from a menu and sprints
    // while held during play, so it is handled before the key map.
    if (e.code === 'Space') {
      keys.sprint = true;
      onAction('start');
      e.preventDefault();
      return;
    }
    const field = KEY_MAP[e.code];
    if (field) {
      keys[field] = true;
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyP') {
      onAction('pause');
    } else if (e.code === 'KeyE') {
      onAction('pickup');
    } else if (e.code === 'KeyM') {
      onAction('mute');
    } else if (e.code === 'Enter') {
      onAction('start');
    }
  };
  const up = (e) => {
    const field = KEY_MAP[e.code];
    if (field) keys[field] = false;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', clear);
  };
}

// Attach a mouse listener: a click on the canvas tosses a pebble at that tile.
// Returns the tile coordinates of a click, in game tiles.
export function bindMouse(canvas, onClick) {
  const handler = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    onClick({ x: Math.floor(px / 32), y: Math.floor(py / 32) });
  };
  canvas.addEventListener('click', handler);
  return () => canvas.removeEventListener('click', handler);
}
