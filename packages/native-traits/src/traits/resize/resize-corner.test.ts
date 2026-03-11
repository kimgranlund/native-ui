// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ResizeController } from './resize-controller.ts';
import type { HandlePosition } from './resize-controller.ts';

function createHost(mode: 'edge' | 'corner' = 'corner'): HTMLElement {
  const el = document.createElement('div');
  if (mode === 'corner') {
    el.innerHTML = `
      <div class="handle" data-handle="top-left"></div>
      <div class="handle" data-handle="top-right"></div>
      <div class="handle" data-handle="bottom-left"></div>
      <div class="handle" data-handle="bottom-right"></div>
    `;
  } else {
    el.innerHTML = '<div class="handle"></div>';
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ResizeController corner mode', () => {
  it('dispatches native:resize-start with handle in detail', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      handleMode: 'corner',
    });

    const handler = vi.fn();
    host.addEventListener('native:resize-start', handler);

    const handle = host.querySelector('[data-handle="bottom-right"]')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.handle).toBe('bottom-right');

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('bottom-right handle: positive dx/dy increases width/height', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      handleMode: 'corner',
    });

    const moveHandler = vi.fn();
    host.addEventListener('native:resize-move', moveHandler);

    const handle = host.querySelector('[data-handle="bottom-right"]')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    // Move right and down — should increase width and height
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 150, clientY: 130,
    }));

    expect(moveHandler).toHaveBeenCalledTimes(1);
    // In happy-dom getBoundingClientRect returns zeros, so check style was set
    expect(host.style.width).toBe('50px');  // 0 (startWidth) + 50 (dx * +1)
    expect(host.style.height).toBe('30px'); // 0 (startHeight) + 30 (dy * +1)

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('top-left handle: negative dx/dy increases width/height', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      handleMode: 'corner',
    });

    const handle = host.querySelector('[data-handle="top-left"]')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    // Move left and up — should increase width and height (signs flip)
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 60, clientY: 70,
    }));

    // dx = -40, sign.sx = -1 => effective = +40
    // dy = -30, sign.sy = -1 => effective = +30
    expect(host.style.width).toBe('40px');
    expect(host.style.height).toBe('30px');

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('top-right handle: positive dx increases width, negative dy increases height', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      handleMode: 'corner',
    });

    const handle = host.querySelector('[data-handle="top-right"]')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    // Move right (+dx) and up (-dy)
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 120, clientY: 80,
    }));

    // dx = +20, sign.sx = +1 => width += 20
    // dy = -20, sign.sy = -1 => height += 20
    expect(host.style.width).toBe('20px');
    expect(host.style.height).toBe('20px');

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('bottom-left handle: negative dx increases width, positive dy increases height', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      handleMode: 'corner',
    });

    const handle = host.querySelector('[data-handle="bottom-left"]')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    // Move left (-dx) and down (+dy)
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 75, clientY: 140,
    }));

    // dx = -25, sign.sx = -1 => width += 25
    // dy = +40, sign.sy = +1 => height += 40
    expect(host.style.width).toBe('25px');
    expect(host.style.height).toBe('40px');

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('respects minWidth/maxWidth constraints', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      handleMode: 'corner',
      minWidth: 50,
      maxWidth: 200,
    });

    const handle = host.querySelector('[data-handle="bottom-right"]')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    // Move right by 300 — should be clamped to maxWidth 200
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 400, clientY: 100,
    }));

    expect(host.style.width).toBe('200px');

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    // Test min clamping — try to shrink below minWidth
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    // Moving left with bottom-right handle makes width smaller
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 10, clientY: 100,
    }));

    // dx = -90, startWidth = 0 (happy-dom), clamped to minWidth 50
    expect(host.style.width).toBe('50px');

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('respects minHeight/maxHeight constraints', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      handleMode: 'corner',
      minHeight: 30,
      maxHeight: 150,
    });

    const handle = host.querySelector('[data-handle="bottom-right"]')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    // Move down by 200 — should be clamped to maxHeight 150
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 100, clientY: 300,
    }));

    expect(host.style.height).toBe('150px');

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    // Test min clamping
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 100, clientY: 20,
    }));

    // dy = -80, startHeight = 0 (happy-dom), clamped to minHeight 30
    expect(host.style.height).toBe('30px');

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('falls back to min/max when minWidth/maxWidth not set', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      handleMode: 'corner',
      min: 20,
      max: 100,
    });

    const handle = host.querySelector('[data-handle="bottom-right"]')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    // Move right by 200 — should clamp to max 100
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 300, clientY: 300,
    }));

    expect(host.style.width).toBe('100px');
    expect(host.style.height).toBe('100px');

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('native:resize-move includes handle in detail', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      handleMode: 'corner',
    });

    const moveHandler = vi.fn();
    host.addEventListener('native:resize-move', moveHandler);

    const handle = host.querySelector('[data-handle="top-right"]')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 120, clientY: 80,
    }));

    const detail = (moveHandler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.handle).toBe('top-right');

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('native:resize-end includes handle in detail', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      handleMode: 'corner',
    });

    const endHandler = vi.fn();
    host.addEventListener('native:resize-end', endHandler);

    const handle = host.querySelector('[data-handle="bottom-left"]')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    const detail = (endHandler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.handle).toBe('bottom-left');

    ctrl.destroy();
  });

  it('ignores handle not in the handles list', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      handleMode: 'corner',
      handles: ['bottom-right', 'bottom-left'],
    });

    const handler = vi.fn();
    host.addEventListener('native:resize-start', handler);

    // Click top-left — not in the handles list
    const topLeft = host.querySelector('[data-handle="top-left"]')!;
    topLeft.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(handler).not.toHaveBeenCalled();

    // Click bottom-right — in the handles list
    const bottomRight = host.querySelector('[data-handle="bottom-right"]')!;
    bottomRight.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(handler).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('reverts on Escape', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      handleMode: 'corner',
    });

    const handle = host.querySelector('[data-handle="bottom-right"]')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 200, clientY: 200,
    }));

    expect(host.style.width).toBe('100px');
    expect(host.style.height).toBe('100px');

    // Press Escape — should revert to start dimensions
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    // startWidth and startHeight were 0 (happy-dom getBoundingClientRect)
    expect(host.style.width).toBe('0px');
    expect(host.style.height).toBe('0px');
    expect(host.hasAttribute('resizing')).toBe(false);

    ctrl.destroy();
  });

  it('reverts both axes on pointercancel in corner mode', () => {
    const host = createHost();
    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      handleMode: 'corner',
    });

    const handle = host.querySelector('[data-handle="top-left"]')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 60, clientY: 70,
    }));

    document.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));

    expect(host.style.width).toBe('0px');
    expect(host.style.height).toBe('0px');
    expect(host.hasAttribute('resizing')).toBe(false);

    ctrl.destroy();
  });
});

describe('ResizeController edge mode regression', () => {
  it('edge mode still works when no handleMode is set', () => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="handle"></div>';
    document.body.appendChild(host);

    const ctrl = new ResizeController(host, { handleSelector: '.handle' });

    const handler = vi.fn();
    host.addEventListener('native:resize-start', handler);

    const handle = host.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(host.hasAttribute('resizing')).toBe(true);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('activeHandle is null in edge mode event details', () => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="handle"></div>';
    document.body.appendChild(host);

    const ctrl = new ResizeController(host, { handleSelector: '.handle' });

    const startHandler = vi.fn();
    const endHandler = vi.fn();
    host.addEventListener('native:resize-start', startHandler);
    host.addEventListener('native:resize-end', endHandler);

    const handle = host.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));

    const startDetail = (startHandler.mock.calls[0][0] as CustomEvent).detail;
    expect(startDetail.handle).toBeNull();

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    const endDetail = (endHandler.mock.calls[0][0] as CustomEvent).detail;
    expect(endDetail.handle).toBeNull();

    ctrl.destroy();
  });

  it('edge mode respects axis and reverse options', () => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="handle"></div>';
    document.body.appendChild(host);

    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      axis: 'horizontal',
      reverse: true,
    });

    const handle = host.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    // Move left (reverse: true means leftward drag increases width)
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 60, clientY: 100,
    }));

    // dx = -40, reverse sign = -1 => effective = +40
    expect(host.style.width).toBe('40px');
    // Height should NOT be set (horizontal axis only)
    expect(host.style.height).toBe('');

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });

  it('edge mode with axis both sets both dimensions', () => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="handle"></div>';
    document.body.appendChild(host);

    const ctrl = new ResizeController(host, {
      handleSelector: '.handle',
      axis: 'both',
    });

    const handle = host.querySelector('.handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, clientX: 100, clientY: 100,
    }));

    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: 150, clientY: 130,
    }));

    expect(host.style.width).toBe('50px');
    expect(host.style.height).toBe('30px');

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    ctrl.destroy();
  });
});
