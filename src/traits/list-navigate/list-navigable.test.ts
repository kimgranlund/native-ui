// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { NativeElement } from '../../core/native-element.ts';
import { ListNavigateController } from './list-navigate-controller.ts';
import { define } from '../../core/define.ts';
import { signal } from '../../reactivity/signal.ts';
import type { Signal } from '../../reactivity/types.ts';

// ── Test element using ListNavigateController ──

class NavTestEl extends NativeElement {
  #disabled = signal(false);
  #nav: ListNavigateController | null = null;

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) { this.#disabled.value = val; }

  get listValue(): Signal<string | null> { return this.#nav!.listValue; }
  get rovingSelector(): string { return this.#nav!.rovingFocus.selector; }

  setup(): void {
    super.setup();
    this.#nav = new ListNavigateController(this, {
      itemSelector: ':scope > [role="option"]',
      orientation: 'vertical',
      addEffect: (fn) => this.addEffect(fn),
      deferChildren: (fn) => this.deferChildren(fn),
    });
  }

  teardown() { this.#nav?.destroy(); this.#nav = null; super.teardown(); }
}

if (!customElements.get('nav-test')) {
  define('nav-test', NavTestEl);
}

// ── Test element with aria-checked ──

class CheckedTestEl extends NativeElement {
  #nav: ListNavigateController | null = null;

  get listValue(): Signal<string | null> { return this.#nav!.listValue; }

  setup(): void {
    super.setup();
    this.#nav = new ListNavigateController(this, {
      itemSelector: ':scope > [role="radio"]',
      ariaAttr: 'aria-checked',
      addEffect: (fn) => this.addEffect(fn),
      deferChildren: (fn) => this.deferChildren(fn),
    });
  }

  teardown() { this.#nav?.destroy(); this.#nav = null; super.teardown(); }
}

if (!customElements.get('checked-test')) {
  define('checked-test', CheckedTestEl);
}

// ── Test element with autoSync = false ──

class NoSyncTestEl extends NativeElement {
  #nav: ListNavigateController | null = null;

  get listValue(): Signal<string | null> { return this.#nav!.listValue; }

  setup(): void {
    super.setup();
    this.#nav = new ListNavigateController(this, {
      itemSelector: ':scope > [role="option"]',
      autoSync: false,
    });
  }

  teardown() { this.#nav?.destroy(); this.#nav = null; super.teardown(); }
}

if (!customElements.get('nosync-test')) {
  define('nosync-test', NoSyncTestEl);
}

// ── Test element with onChildSelect override ──

class OverrideTestEl extends NativeElement {
  lastDetail: { value: string; label: string } | null = null;
  #nav: ListNavigateController | null = null;

  get listValue(): Signal<string | null> { return this.#nav!.listValue; }

  setup(): void {
    super.setup();
    this.#nav = new ListNavigateController(this, {
      itemSelector: ':scope > [role="option"]',
      onChildSelect: (detail) => {
        this.lastDetail = detail;
        // Don't call default — custom behavior only
      },
    });
  }

  teardown() { this.#nav?.destroy(); this.#nav = null; super.teardown(); }
}

if (!customElements.get('override-test')) {
  define('override-test', OverrideTestEl);
}

// ── Helpers ──

function createNav(count: number): NavTestEl {
  const el = document.createElement('nav-test') as NavTestEl;
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.setAttribute('role', 'option');
    (item as unknown as { value: string }).value = `item-${i}`;
    item.textContent = `Item ${i}`;
    el.appendChild(item);
  }
  document.body.appendChild(el);
  return el;
}

function fireSelect(target: HTMLElement, value: string, label: string): void {
  target.dispatchEvent(new CustomEvent('native:select', {
    bubbles: true,
    composed: true,
    detail: { value, label },
  }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ListNavigable', () => {
  // ── Value tracking ──

  it('updates listValue on native:select event', () => {
    const el = createNav(3);
    const item = el.querySelector('[role="option"]') as HTMLElement;
    fireSelect(item, 'item-0', 'Item 0');
    expect(el.listValue.value).toBe('item-0');
  });

  it('dispatches native:change on native:select', () => {
    const el = createNav(3);
    let received: { value: string; label: string } | null = null;
    el.addEventListener('native:change', ((e: CustomEvent) => {
      received = e.detail;
    }) as EventListener);

    const item = el.querySelector('[role="option"]') as HTMLElement;
    fireSelect(item, 'item-1', 'Item 1');

    expect(received).toEqual({ value: 'item-1', label: 'Item 1' });
  });

  it('native:change event is cancelable', () => {
    const el = createNav(3);
    let cancelable = false;
    el.addEventListener('native:change', ((e: CustomEvent) => {
      cancelable = e.cancelable;
    }) as EventListener);

    const item = el.querySelector('[role="option"]') as HTMLElement;
    fireSelect(item, 'item-0', 'Item 0');
    expect(cancelable).toBe(true);
  });

  // ── Disabled guard ──

  it('ignores n-select when disabled', () => {
    const el = createNav(3);
    el.disabled = true;

    const item = el.querySelector('[role="option"]') as HTMLElement;
    fireSelect(item, 'item-0', 'Item 0');
    expect(el.listValue.value).toBeNull();
  });

  // ── ARIA sync ──

  it('syncs aria-selected on children', async () => {
    const el = createNav(3);
    const items = el.querySelectorAll('[role="option"]');

    fireSelect(items[1] as HTMLElement, 'item-1', 'Item 1');
    await Promise.resolve(); // deferChildren microtask

    expect(items[0].getAttribute('aria-selected')).toBe('false');
    expect(items[1].getAttribute('aria-selected')).toBe('true');
    expect(items[2].getAttribute('aria-selected')).toBe('false');
  });

  it('updates ARIA when selection changes', async () => {
    const el = createNav(3);
    const items = el.querySelectorAll('[role="option"]');

    fireSelect(items[0] as HTMLElement, 'item-0', 'Item 0');
    await Promise.resolve();
    expect(items[0].getAttribute('aria-selected')).toBe('true');

    fireSelect(items[2] as HTMLElement, 'item-2', 'Item 2');
    await Promise.resolve();
    expect(items[0].getAttribute('aria-selected')).toBe('false');
    expect(items[2].getAttribute('aria-selected')).toBe('true');
  });

  // ── aria-checked variant ──

  it('syncs aria-checked when listAriaAttr is set', async () => {
    const el = document.createElement('checked-test') as CheckedTestEl;
    for (let i = 0; i < 3; i++) {
      const item = document.createElement('div');
      item.setAttribute('role', 'radio');
      (item as unknown as { value: string }).value = `r-${i}`;
      el.appendChild(item);
    }
    document.body.appendChild(el);
    const items = el.querySelectorAll('[role="radio"]');

    fireSelect(items[1] as HTMLElement, 'r-1', 'Radio 1');
    await Promise.resolve();

    expect(items[0].getAttribute('aria-checked')).toBe('false');
    expect(items[1].getAttribute('aria-checked')).toBe('true');
    expect(items[2].getAttribute('aria-checked')).toBe('false');
  });

  // ── listAutoSync = false ──

  it('does not sync ARIA when listAutoSync is false', async () => {
    const el = document.createElement('nosync-test') as NoSyncTestEl;
    for (let i = 0; i < 2; i++) {
      const item = document.createElement('div');
      item.setAttribute('role', 'option');
      (item as unknown as { value: string }).value = `opt-${i}`;
      el.appendChild(item);
    }
    document.body.appendChild(el);
    const items = el.querySelectorAll('[role="option"]');

    fireSelect(items[0] as HTMLElement, 'opt-0', 'Opt 0');
    await Promise.resolve();

    // No ARIA sync — attributes should not be set by the trait
    expect(items[0].getAttribute('aria-selected')).toBeNull();
    expect(items[1].getAttribute('aria-selected')).toBeNull();
    // But value should still update
    expect(el.listValue.value).toBe('opt-0');
  });

  // ── onChildSelect override ──

  it('calls overridden onChildSelect', () => {
    const el = document.createElement('override-test') as OverrideTestEl;
    const item = document.createElement('div');
    item.setAttribute('role', 'option');
    (item as unknown as { value: string }).value = 'x';
    el.appendChild(item);
    document.body.appendChild(el);

    fireSelect(item, 'x', 'X Label');

    expect(el.lastDetail).toEqual({ value: 'x', label: 'X Label' });
    // Default behavior suppressed — listValue should not be set
    expect(el.listValue.value).toBeNull();
  });

  it('does not dispatch native:change when onChildSelect is overridden without super', () => {
    const el = document.createElement('override-test') as OverrideTestEl;
    const item = document.createElement('div');
    item.setAttribute('role', 'option');
    (item as unknown as { value: string }).value = 'x';
    el.appendChild(item);
    document.body.appendChild(el);

    let received = false;
    el.addEventListener('native:change', () => { received = true; });
    fireSelect(item, 'x', 'X');

    expect(received).toBe(false);
  });

  // ── Roving focus integration ──

  it('inherits roving focus from RovingFocusable', () => {
    const el = createNav(3);
    const items = el.querySelectorAll('[role="option"]');

    // RovingFocusable should set tabindex
    expect(items[0].getAttribute('tabindex')).toBe('0');
    expect(items[1].getAttribute('tabindex')).toBe('-1');
    expect(items[2].getAttribute('tabindex')).toBe('-1');
  });

  it('bridges listItemSelector to rovingSelector', () => {
    const el = createNav(3);
    expect(el.rovingSelector).toBe(':scope > [role="option"]');
  });

  // ── Cleanup ──

  it('removes listener on teardown', () => {
    const el = createNav(3);
    document.body.removeChild(el);

    // After teardown, n-select should not update value
    // Re-attach so we can fire events
    document.body.appendChild(el);
    const item = el.querySelector('[role="option"]') as HTMLElement;
    fireSelect(item, 'item-0', 'Item 0');

    // Element was re-attached, setup runs again — value should update
    expect(el.listValue.value).toBe('item-0');
  });
});
