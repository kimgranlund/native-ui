// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NativeElement } from '../../core/native-element.ts';
import { DismissController } from './dismiss-controller.ts';
import { define } from '../../core/define.ts';

class DismissTestEl extends NativeElement {
  #dismiss: DismissController | null = null;
  setup() { super.setup(); this.#dismiss = new DismissController(this); }
  teardown() { this.#dismiss?.destroy(); this.#dismiss = null; super.teardown(); }

  show(): void {
    this.#dismiss?.enable();
  }

  hide(): void {
    this.#dismiss?.disable();
  }
}

// Only define once
if (!customElements.get('dismiss-test')) {
  define('dismiss-test', DismissTestEl);
}

function create(): DismissTestEl {
  const el = document.createElement('dismiss-test') as DismissTestEl;
  document.body.appendChild(el);
  return el;
}

// WHY: enableDismiss uses rAF, so we need to flush it
function flushRAF(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Dismissable', () => {
  it('dispatches native:dismiss on Escape key', async () => {
    const el = create();
    el.show();
    await flushRAF();

    const handler = vi.fn();
    el.addEventListener('native:dismiss', handler);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dispatches native:dismiss on click outside', async () => {
    const el = create();
    el.show();
    await flushRAF();

    const handler = vi.fn();
    el.addEventListener('native:dismiss', handler);

    // Click on document body (outside the element)
    document.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
    }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does NOT dispatch on click inside', async () => {
    const el = create();
    const child = document.createElement('div');
    el.appendChild(child);
    el.show();
    await flushRAF();

    const handler = vi.fn();
    el.addEventListener('native:dismiss', handler);

    // Click on the child (inside the element)
    child.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
    }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('stops dismissing after disableDismiss', async () => {
    const el = create();
    el.show();
    await flushRAF();
    el.hide();

    const handler = vi.fn();
    el.addEventListener('native:dismiss', handler);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('only topmost layer gets dismiss events (stack)', async () => {
    const el1 = create();
    const el2 = create();

    el1.show();
    await flushRAF();
    el2.show();
    await flushRAF();

    const handler1 = vi.fn();
    const handler2 = vi.fn();
    el1.addEventListener('native:dismiss', handler1);
    el2.addEventListener('native:dismiss', handler2);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('after top layer removed, next layer gets dismiss', async () => {
    const el1 = create();
    const el2 = create();

    el1.show();
    await flushRAF();
    el2.show();
    await flushRAF();
    el2.hide(); // remove top layer

    const handler1 = vi.fn();
    el1.addEventListener('native:dismiss', handler1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler1).toHaveBeenCalledTimes(1);
  });

  it('ignores non-Escape keys', async () => {
    const el = create();
    el.show();
    await flushRAF();

    const handler = vi.fn();
    el.addEventListener('native:dismiss', handler);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('native:dismiss event has bubbles and composed', async () => {
    const el = create();
    el.show();
    await flushRAF();

    let event: Event | null = null;
    el.addEventListener('native:dismiss', (e) => { event = e; });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(event).not.toBeNull();
    expect(event!.bubbles).toBe(true);
    expect(event!.composed).toBe(true);
  });

  it('disable during rAF prevents layer from being added', async () => {
    const el = create();
    el.show();
    el.hide(); // disable before rAF fires
    await flushRAF();

    const handler = vi.fn();
    el.addEventListener('native:dismiss', handler);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('re-enable moves element to top of stack', async () => {
    const el1 = create();
    const el2 = create();

    el1.show();
    await flushRAF();
    el2.show();
    await flushRAF();

    // Re-enable el1 — should move it to top
    el1.show();
    await flushRAF();

    const handler1 = vi.fn();
    const handler2 = vi.fn();
    el1.addEventListener('native:dismiss', handler1);
    el2.addEventListener('native:dismiss', handler2);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
  });
});

describe('DismissController', () => {
  it('destroy cancels pending rAF', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const ctrl = new DismissController(el);
    ctrl.enable();
    ctrl.destroy(); // should cancel the rAF
    await flushRAF();

    const handler = vi.fn();
    el.addEventListener('native:dismiss', handler);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('disable after enable removes from stack', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const ctrl = new DismissController(el);
    ctrl.enable();
    await flushRAF();
    ctrl.disable();

    const handler = vi.fn();
    el.addEventListener('native:dismiss', handler);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('prunes disconnected elements from dismiss stack', async () => {
    // el1 is pushed to the stack then disconnected (simulates View Transition)
    const el1 = create();
    el1.show();
    await flushRAF();

    // Disconnect el1 without disabling (simulates abrupt View Transition removal)
    el1.remove();

    // el2 is the new top layer
    const el2 = create();
    el2.show();
    await flushRAF();

    const handler2 = vi.fn();
    el2.addEventListener('native:dismiss', handler2);

    // Escape should dismiss el2, not the disconnected el1
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});
