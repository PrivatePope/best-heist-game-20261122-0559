// Keyboard and mouse: WASD or arrows to move, Shift to sneak, Space for a smoke pellet,
// click to throw a noise dart where the mouse points, Enter to confirm, P or Escape to pause.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let dart = null;
  let smokeQueued = false;

  function toWorld(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 800 / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.key.toLowerCase());
    if (event.key === 'Enter' || event.key === ' ') actions |= ACTION_CONFIRM;
    if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') actions |= ACTION_PAUSE;
    if (event.key === ' ') smokeQueued = true;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousedown', (event) => {
    dart = toWorld(event);
    if (event.button === 0) actions |= ACTION_CONFIRM;
  });

  return {
    direction() {
      let dx = 0;
      let dy = 0;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      return { dx, dy, sneak: keys.has('shift'), smoke: smokeQueued, dart: null };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeDart() {
      const taken = dart;
      dart = null;
      return taken;
    },
    clearSmoke() {
      smokeQueued = false;
    },
  };
}
