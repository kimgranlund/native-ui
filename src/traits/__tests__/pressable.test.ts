// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { UIElement } from '../../core/ui-element.ts';
import { PressController } from '../press-controller.ts';
import { define } from '../../core/define.ts';

class PressTestEl extends UIElement {
  disabled = false;
  #press: PressController | null = null;
  setup() { super.setup(); this.#press = new PressController(this); }
  teardown() { this.#press?.destroy(); this.#press = null; super.teardown(); }
}

if (!customElements.get('press-test')) {
  define('press-test', PressTestEl);
}

function create(): PressTestEl {
  const el = document.createElement('press-test') as PressTestEl;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Pressable — pointer', () => {
  it('sets pressed attribute on pointerdown', () => {
    const el = create();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(el.hasAttribute('pressed')).toBe(true);
  });

  it('removes pressed and dispatches ui-press on pointerup', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-press', handler);
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(el.hasAttribute('pressed')).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.pointerType).toBe('');
  });

  it('ignores non-primary button', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-press', handler);
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2 }));
    expect(el.hasAttribute('pressed')).toBe(false);
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const el = create();
    el.disabled = true;
    const handler = vi.fn();
    el.addEventListener('ui-press', handler);
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(el.hasAttribute('pressed')).toBe(false);
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('clears pressed on pointercancel', () => {
    const el = create();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(el.hasAttribute('pressed')).toBe(true);
    el.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
    expect(el.hasAttribute('pressed')).toBe(false);
  });

  it('clears pressed on lostpointercapture', () => {
    const el = create();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(el.hasAttribute('pressed')).toBe(true);
    el.dispatchEvent(new Event('lostpointercapture'));
    expect(el.hasAttribute('pressed')).toBe(false);
  });

  it('does not dispatch ui-press without prior pointerdown', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-press', handler);
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('Pressable — keyboard', () => {
  it('sets pressed on Enter keydown and dispatches ui-press on keyup', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-press', handler);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(el.hasAttribute('pressed')).toBe(true);
    el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    expect(el.hasAttribute('pressed')).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.pointerType).toBe('keyboard');
  });

  it('sets pressed on Space keydown and dispatches ui-press on keyup', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-press', handler);
    const keydown = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    el.dispatchEvent(keydown);
    expect(el.hasAttribute('pressed')).toBe(true);
    expect(keydown.defaultPrevented).toBe(true);
    el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores repeated keydown', () => {
    const el = create();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, repeat: true }));
    // Still pressed from the first one — no extra action
    expect(el.hasAttribute('pressed')).toBe(true);
  });

  it('ignores irrelevant keys', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-press', handler);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(el.hasAttribute('pressed')).toBe(false);
    el.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not set pressed when disabled on keydown', () => {
    const el = create();
    el.disabled = true;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(el.hasAttribute('pressed')).toBe(false);
  });
});

describe('Pressable — teardown', () => {
  it('removes pressed attribute on teardown', () => {
    const el = create();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(el.hasAttribute('pressed')).toBe(true);
    el.teardown();
    expect(el.hasAttribute('pressed')).toBe(false);
  });

  it('stops responding to events after teardown', () => {
    const el = create();
    el.teardown();
    const handler = vi.fn();
    el.addEventListener('ui-press', handler);
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });
});
