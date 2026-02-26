// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { UIElement } from '../../core/ui-element.ts';
import { ToastController } from '../toast-controller.ts';
import { define } from '../../core/define.ts';

class ToastTestEl extends UIElement {
  disabled = false;
  #ctrl: ToastController | null = null;

  setup() {
    super.setup();
    this.#ctrl = new ToastController(this);
  }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }

  toast(options: Parameters<ToastController['toast']>[0]): number {
    return this.#ctrl!.toast(options);
  }

  dismissToast(id: number): void {
    this.#ctrl!.dismissToast(id);
  }

  dismissAllToasts(): void {
    this.#ctrl!.dismissAllToasts();
  }
}

if (!customElements.get('toast-test')) {
  define('toast-test', ToastTestEl);
}

function create(): ToastTestEl {
  const el = document.createElement('toast-test') as ToastTestEl;
  document.body.appendChild(el);
  testEl = el;
  return el;
}

// WHY: Singleton ToastManager persists across tests — must dismiss all to reset #toasts array
let testEl: ToastTestEl | null = null;

afterEach(() => {
  // WHY: dismissAllToasts clears the singleton's internal #toasts array
  testEl?.dismissAllToasts();
  testEl = null;
  const containers = document.querySelectorAll('.ui-toast-container');
  for (const c of containers) c.remove();
  document.body.innerHTML = '';
});

describe('Toastable', () => {
  it('creates a toast element in the DOM', () => {
    const el = create();
    el.toast({ message: 'Hello' });
    const container = document.querySelector('.ui-toast-container');
    expect(container).not.toBeNull();
    const toast = container!.querySelector('.ui-toast');
    expect(toast).not.toBeNull();
    expect(toast!.querySelector('.ui-toast-message')!.textContent).toBe('Hello');
  });

  it('returns a numeric toast ID', () => {
    const el = create();
    const id = el.toast({ message: 'Test' });
    expect(typeof id).toBe('number');
  });

  it('sets the intent attribute', () => {
    const el = create();
    el.toast({ message: 'Danger!', intent: 'danger' });
    const toast = document.querySelector('.ui-toast');
    expect(toast!.getAttribute('intent')).toBe('danger');
  });

  it('defaults to info intent', () => {
    const el = create();
    el.toast({ message: 'Default' });
    const toast = document.querySelector('.ui-toast');
    expect(toast!.getAttribute('intent')).toBe('info');
  });

  it('includes a dismiss button by default', () => {
    const el = create();
    el.toast({ message: 'Dismissible' });
    const close = document.querySelector('.ui-toast-close');
    expect(close).not.toBeNull();
  });

  it('omits dismiss button when dismissible is false', () => {
    const el = create();
    el.toast({ message: 'No close', dismissible: false });
    const close = document.querySelector('.ui-toast-close');
    expect(close).toBeNull();
  });

  it('dismissToast removes the toast from DOM', () => {
    const el = create();
    const id = el.toast({ message: 'Remove me', duration: 0 });
    expect(document.querySelectorAll('.ui-toast').length).toBe(1);
    el.dismissToast(id);
    expect(document.querySelectorAll('.ui-toast').length).toBe(0);
  });

  it('dismissAllToasts clears all toasts', () => {
    const el = create();
    el.toast({ message: 'A', duration: 0 });
    el.toast({ message: 'B', duration: 0 });
    el.toast({ message: 'C', duration: 0 });
    expect(document.querySelectorAll('.ui-toast').length).toBe(3);
    el.dismissAllToasts();
    expect(document.querySelectorAll('.ui-toast').length).toBe(0);
  });

  it('dispatches ui-toast event', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-toast', handler);
    el.toast({ message: 'Event test', intent: 'success' });
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.message).toBe('Event test');
    expect(detail.intent).toBe('success');
  });

  it('auto-dismisses after duration', () => {
    vi.useFakeTimers();
    const el = create();
    el.toast({ message: 'Auto', duration: 2000 });
    expect(document.querySelectorAll('.ui-toast').length).toBe(1);
    vi.advanceTimersByTime(2000);
    expect(document.querySelectorAll('.ui-toast').length).toBe(0);
    vi.useRealTimers();
  });

  it('container is removed when all toasts dismissed', () => {
    const el = create();
    const id = el.toast({ message: 'Only one', duration: 0 });
    expect(document.querySelector('.ui-toast-container')).not.toBeNull();
    el.dismissToast(id);
    expect(document.querySelector('.ui-toast-container')).toBeNull();
  });

  it('container is recreated after full dismissal', () => {
    const el = create();
    const id = el.toast({ message: 'First', duration: 0 });
    el.dismissToast(id);
    expect(document.querySelector('.ui-toast-container')).toBeNull();

    el.toast({ message: 'Second', duration: 0 });
    expect(document.querySelector('.ui-toast-container')).not.toBeNull();
  });

  it('dismissToast with invalid ID is a no-op', () => {
    const el = create();
    el.toast({ message: 'Real', duration: 0 });
    expect(() => el.dismissToast(999)).not.toThrow();
    expect(document.querySelectorAll('.ui-toast').length).toBe(1);
  });

  it('toast container has ARIA live region attributes', () => {
    const el = create();
    el.toast({ message: 'Accessible' });
    const container = document.querySelector('.ui-toast-container')!;
    expect(container.getAttribute('role')).toBe('status');
    expect(container.getAttribute('aria-live')).toBe('polite');
  });

  it('dismiss button click removes the toast', () => {
    const el = create();
    el.toast({ message: 'Click to close', duration: 0 });
    const close = document.querySelector('.ui-toast-close') as HTMLElement;
    expect(close).not.toBeNull();
    close.click();
    expect(document.querySelectorAll('.ui-toast').length).toBe(0);
  });
});
