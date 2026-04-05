// src/input.js

export const keys = { up: false, left: false, right: false, space: false };

export function setupInput() {
  document.addEventListener('keydown', e => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { keys.up = true; e.preventDefault(); }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.left = true; e.preventDefault(); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = true; e.preventDefault(); }
    if (e.code === 'Space') { keys.space = true; e.preventDefault(); }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'Space') keys.space = false;
  });

  // Touch controls
  const TC_MAP = { 'tc-left': 'left', 'tc-right': 'right', 'tc-thrust': 'up', 'tc-retro': 'space' };
  for (const [btnId, key] of Object.entries(TC_MAP)) {
    const el = document.getElementById(btnId);
    if (!el) continue;
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); keys[key] = true; el.classList.add('active');
    }, { passive: false });
    el.addEventListener('pointerup', e => {
      e.preventDefault(); keys[key] = false; el.classList.remove('active');
    });
    el.addEventListener('pointercancel', () => { keys[key] = false; el.classList.remove('active'); });
    el.addEventListener('pointerleave', () => { keys[key] = false; el.classList.remove('active'); });
  }
}

export const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
