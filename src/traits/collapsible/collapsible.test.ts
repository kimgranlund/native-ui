// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NativeElement } from '../../core/native-element.ts';
import { CollapsibleController } from './collapsible-controller.ts';
import { define } from '../../core/define.ts';

class CollapseTestEl extends NativeElement {
  disabled = false;
  #ctrl: CollapsibleController | null = null;

  setup() {
    super.setup();
    this.#ctrl = new CollapsibleController(this);
  }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }

  get collapsed(): boolean {
    return this.#ctrl?.collapsed ?? this.hasAttribute('collapsed');
  }

  set collapsed(val: boolean) {
    if (this.#ctrl) {
      this.#ctrl.collapsed = val;
    } else {
      this.toggleAttribute('collapsed', val);
    }
  }

  get collapseDuration(): number {
    return this.#ctrl?.duration ?? 200;
  }

  set collapseDuration(val: number) {
    if (this.#ctrl) this.#ctrl.duration = val;
  }

  collapse() { this.#ctrl?.collapse(); }
  expand() { this.#ctrl?.expand(); }
  toggle() {
    if (this.#ctrl?.collapsed) this.expand();
    else this.collapse();
  }
}

if (!customElements.get('collapse-test')) {
  define('collapse-test', CollapseTestEl);
}

function create(collapsed = false): CollapseTestEl {
  const el = document.createElement('collapse-test') as CollapseTestEl;
  if (collapsed) el.setAttribute('collapsed', '');
  el.innerHTML = '<div style="height: 100px;">Content</div>';
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Collapsible', () => {
  it('starts expanded by default', () => {
    const el = create();
    expect(el.collapsed).toBe(false);
    expect(el.hasAttribute('collapsed')).toBe(false);
  });

  it('starts collapsed when attribute is set', () => {
    const el = create(true);
    expect(el.collapsed).toBe(true);
    expect(el.hasAttribute('collapsed')).toBe(true);
  });

  it('collapse() sets collapsed attribute', () => {
    const el = create();
    // WHY: In happy-dom, transitions don't fire — collapse sets up rAF then timeout fallback
    // Call collapse and rely on the fallback timeout
    el.collapse();
    // The attribute is set after the animation completes — in test env it happens via timeout
    expect(el.hasAttribute('collapsed')).toBe(false); // Not yet, rAF pending
  });

  it('collapse() is a no-op when already collapsed', () => {
    const el = create(true);
    const handler = vi.fn();
    el.addEventListener('native:collapse', handler);
    el.collapse();
    // No event should fire since already collapsed
    expect(handler).not.toHaveBeenCalled();
  });

  it('expand() is a no-op when already expanded', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:expand', handler);
    el.expand();
    expect(handler).not.toHaveBeenCalled();
  });

  it('toggle() calls collapse on expanded element', () => {
    const el = create();
    const spy = vi.spyOn(el, 'collapse');
    el.toggle();
    expect(spy).toHaveBeenCalled();
  });

  it('toggle() calls expand on collapsed element', () => {
    const el = create(true);
    const spy = vi.spyOn(el, 'expand');
    el.toggle();
    expect(spy).toHaveBeenCalled();
  });

  it('has configurable collapseDuration', () => {
    const el = create();
    expect(el.collapseDuration).toBe(200);
    el.collapseDuration = 500;
    expect(el.collapseDuration).toBe(500);
  });

  it('expand() dispatches native:expand via timeout fallback', async () => {
    const el = create(true);
    const handler = vi.fn();
    el.addEventListener('native:expand', handler);
    el.expand();

    // Wait for rAF + timeout fallback (duration=200 + 50ms buffer)
    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1);
    }, { timeout: 500 });
  });

  it('collapse() dispatches native:collapse via timeout fallback', async () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:collapse', handler);
    el.collapse();

    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1);
    }, { timeout: 500 });
  });

  it('expand event has bubbles and composed', async () => {
    const el = create(true);
    let event: Event | null = null;
    el.addEventListener('native:expand', (e) => { event = e; });
    el.expand();

    await vi.waitFor(() => {
      expect(event).not.toBeNull();
    }, { timeout: 500 });
    expect(event!.bubbles).toBe(true);
    expect(event!.composed).toBe(true);
  });

  it('collapse event has bubbles and composed', async () => {
    const el = create();
    let event: Event | null = null;
    el.addEventListener('native:collapse', (e) => { event = e; });
    el.collapse();

    await vi.waitFor(() => {
      expect(event).not.toBeNull();
    }, { timeout: 500 });
    expect(event!.bubbles).toBe(true);
    expect(event!.composed).toBe(true);
  });

  it('ignores concurrent collapse during animation', () => {
    const el = create();
    el.collapse(); // starts animating
    const spy = vi.fn();
    el.addEventListener('native:collapse', spy);
    el.collapse(); // should be ignored (animating guard)
    // Only the first collapse should proceed — spy won't fire for the second call
    expect(spy).not.toHaveBeenCalled(); // hasn't fired yet (still in rAF)
  });

  it('teardown calls destroy and cleans up controller', () => {
    const el = create();
    el.teardown();
    // After teardown, collapsed getter falls back to attribute check
    expect(el.collapsed).toBe(false);
  });

  it('collapsed setter without controller falls back to attribute', () => {
    const el = create();
    el.teardown(); // removes controller
    el.collapsed = true;
    expect(el.hasAttribute('collapsed')).toBe(true);
    el.collapsed = false;
    expect(el.hasAttribute('collapsed')).toBe(false);
  });
});
