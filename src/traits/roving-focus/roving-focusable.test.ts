// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { NativeElement } from '../../core/native-element.ts';
import { RovingFocusController } from './roving-focus-controller.ts';
import { define } from '../../core/define.ts';

class RovingTestEl extends NativeElement {
  #roving: RovingFocusController | null = null;
  setup(): void {
    super.setup();
    this.#roving = new RovingFocusController(this, {
      selector: ':scope > [role="option"]',
      orientation: 'vertical',
      wrap: true,
    });
  }
  teardown() { this.#roving?.destroy(); this.#roving = null; super.teardown(); }
}

if (!customElements.get('roving-test')) {
  define('roving-test', RovingTestEl);
}

function createList(count: number, disabled: number[] = []): HTMLElement {
  const el = document.createElement('roving-test') as HTMLElement;
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.setAttribute('role', 'option');
    item.textContent = `Item ${i}`;
    if (disabled.includes(i)) item.setAttribute('disabled', '');
    el.appendChild(item);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('RovingFocusable', () => {
  it('sets tabindex=0 on first item, -1 on rest', () => {
    const el = createList(3);
    const items = el.querySelectorAll('[role="option"]');
    expect(items[0].getAttribute('tabindex')).toBe('0');
    expect(items[1].getAttribute('tabindex')).toBe('-1');
    expect(items[2].getAttribute('tabindex')).toBe('-1');
  });

  it('moves focus down on ArrowDown', () => {
    const el = createList(3);
    const items = el.querySelectorAll('[role="option"]');

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(items[0].getAttribute('tabindex')).toBe('-1');
    expect(items[1].getAttribute('tabindex')).toBe('0');
  });

  it('wraps around at the end', () => {
    const el = createList(3);
    const items = el.querySelectorAll('[role="option"]');

    // Move to last item
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(items[2].getAttribute('tabindex')).toBe('0');

    // Wrap to first
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(items[0].getAttribute('tabindex')).toBe('0');
  });

  it('wraps backwards on ArrowUp from first', () => {
    const el = createList(3);
    const items = el.querySelectorAll('[role="option"]');

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(items[2].getAttribute('tabindex')).toBe('0');
  });

  it('Home moves to first item', () => {
    const el = createList(3);
    const items = el.querySelectorAll('[role="option"]');

    // Move to last
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(items[2].getAttribute('tabindex')).toBe('0');

    // Home
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(items[0].getAttribute('tabindex')).toBe('0');
  });

  it('End moves to last item', () => {
    const el = createList(3);
    const items = el.querySelectorAll('[role="option"]');

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(items[2].getAttribute('tabindex')).toBe('0');
  });

  it('skips disabled items', () => {
    // Item 1 is disabled
    const el = createList(3, [1]);
    const items = el.querySelectorAll('[role="option"]:not([disabled])');
    // Should have 2 non-disabled items
    expect(items.length).toBe(2);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    // Should skip disabled item 1, land on item 2
    expect(items[1].getAttribute('tabindex')).toBe('0');
  });

  it('ignores irrelevant keys', () => {
    const el = createList(3);
    const items = el.querySelectorAll('[role="option"]');

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(items[0].getAttribute('tabindex')).toBe('0');
  });
});

describe('RovingFocusable — horizontal orientation', () => {
  class HorizTestEl extends NativeElement {
    #roving: RovingFocusController | null = null;
    setup(): void {
      super.setup();
      this.#roving = new RovingFocusController(this, {
        selector: ':scope > [role="option"]',
        orientation: 'horizontal',
        wrap: true,
      });
    }
    teardown() { this.#roving?.destroy(); this.#roving = null; super.teardown(); }
  }

  if (!customElements.get('roving-horiz-test')) {
    define('roving-horiz-test', HorizTestEl);
  }

  function createHoriz(count: number): HTMLElement {
    const el = document.createElement('roving-horiz-test') as HTMLElement;
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.setAttribute('role', 'option');
      item.textContent = `Item ${i}`;
      el.appendChild(item);
    }
    document.body.appendChild(el);
    return el;
  }

  it('ArrowRight moves forward', () => {
    const el = createHoriz(3);
    const items = el.querySelectorAll('[role="option"]');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(items[1].getAttribute('tabindex')).toBe('0');
  });

  it('ArrowLeft wraps to last', () => {
    const el = createHoriz(3);
    const items = el.querySelectorAll('[role="option"]');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(items[2].getAttribute('tabindex')).toBe('0');
  });

  it('ArrowDown is ignored in horizontal mode', () => {
    const el = createHoriz(3);
    const items = el.querySelectorAll('[role="option"]');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(items[0].getAttribute('tabindex')).toBe('0');
  });
});

describe('RovingFocusable — no-wrap', () => {
  class NoWrapTestEl extends NativeElement {
    #roving: RovingFocusController | null = null;
    setup(): void {
      super.setup();
      this.#roving = new RovingFocusController(this, {
        selector: ':scope > [role="option"]',
        orientation: 'vertical',
        wrap: false,
      });
    }
    teardown() { this.#roving?.destroy(); this.#roving = null; super.teardown(); }
  }

  if (!customElements.get('roving-nowrap-test')) {
    define('roving-nowrap-test', NoWrapTestEl);
  }

  function createNoWrap(count: number): HTMLElement {
    const el = document.createElement('roving-nowrap-test') as HTMLElement;
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.setAttribute('role', 'option');
      item.textContent = `Item ${i}`;
      el.appendChild(item);
    }
    document.body.appendChild(el);
    return el;
  }

  it('clamps at last item instead of wrapping', () => {
    const el = createNoWrap(3);
    const items = el.querySelectorAll('[role="option"]');

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(items[2].getAttribute('tabindex')).toBe('0');

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(items[2].getAttribute('tabindex')).toBe('0');
  });

  it('clamps at first item on ArrowUp', () => {
    const el = createNoWrap(3);
    const items = el.querySelectorAll('[role="option"]');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(items[0].getAttribute('tabindex')).toBe('0');
  });
});
