// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NativeElement } from '../../core/native-element.ts';
import { ToastController } from '../toast-controller.ts';
import { define } from '../../core/define.ts';

class ToastTestEl extends NativeElement {
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
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Toastable', () => {
  it('creates an n-toast element in the DOM', () => {
    const el = create();
    el.toast({ message: 'Hello' });
    const container = el.querySelector('.n-toast-container');
    expect(container).not.toBeNull();
    const toast = container!.querySelector('n-toast');
    expect(toast).not.toBeNull();
    expect(toast!.querySelector('.n-toast-message')!.textContent).toBe('Hello');
  });

  it('returns a numeric toast ID', () => {
    const el = create();
    const id = el.toast({ message: 'Test' });
    expect(typeof id).toBe('number');
  });

  it('sets the intent attribute', () => {
    const el = create();
    el.toast({ message: 'Danger!', intent: 'danger' });
    const toast = el.querySelector('n-toast');
    expect(toast!.getAttribute('intent')).toBe('danger');
  });

  it('defaults to info intent', () => {
    const el = create();
    el.toast({ message: 'Default' });
    const toast = el.querySelector('n-toast');
    expect(toast!.getAttribute('intent')).toBe('info');
  });

  it('includes a dismiss button by default', () => {
    const el = create();
    el.toast({ message: 'Dismissible' });
    const close = el.querySelector('n-toast .n-toast-close');
    expect(close).not.toBeNull();
  });

  it('omits dismiss button when dismissible is false', () => {
    const el = create();
    el.toast({ message: 'No close', dismissible: false });
    const close = el.querySelector('n-toast .n-toast-close');
    expect(close).toBeNull();
  });

  it('dismissToast removes the toast from DOM', () => {
    const el = create();
    const id = el.toast({ message: 'Remove me', duration: 0 });
    expect(el.querySelectorAll('n-toast').length).toBe(1);
    el.dismissToast(id);
    expect(el.querySelectorAll('n-toast').length).toBe(0);
  });

  it('dismissAllToasts clears all toasts', () => {
    const el = create();
    el.toast({ message: 'A', duration: 0 });
    el.toast({ message: 'B', duration: 0 });
    el.toast({ message: 'C', duration: 0 });
    expect(el.querySelectorAll('n-toast').length).toBe(3);
    el.dismissAllToasts();
    expect(el.querySelectorAll('n-toast').length).toBe(0);
  });

  it('dispatches native:toast event', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:toast', handler);
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
    expect(el.querySelectorAll('n-toast').length).toBe(1);
    vi.advanceTimersByTime(2000);
    expect(el.querySelectorAll('n-toast').length).toBe(0);
    vi.useRealTimers();
  });

  it('container is removed when all toasts dismissed', () => {
    const el = create();
    const id = el.toast({ message: 'Only one', duration: 0 });
    expect(el.querySelector('.n-toast-container')).not.toBeNull();
    el.dismissToast(id);
    expect(el.querySelector('.n-toast-container')).toBeNull();
  });

  it('container is recreated after full dismissal', () => {
    const el = create();
    const id = el.toast({ message: 'First', duration: 0 });
    el.dismissToast(id);
    expect(el.querySelector('.n-toast-container')).toBeNull();

    el.toast({ message: 'Second', duration: 0 });
    expect(el.querySelector('.n-toast-container')).not.toBeNull();
  });

  it('dismissToast with invalid ID is a no-op', () => {
    const el = create();
    el.toast({ message: 'Real', duration: 0 });
    expect(() => el.dismissToast(999)).not.toThrow();
    expect(el.querySelectorAll('n-toast').length).toBe(1);
  });

  it('toast container has ARIA live region attributes', () => {
    const el = create();
    el.toast({ message: 'Accessible' });
    const container = el.querySelector('.n-toast-container')!;
    expect(container.getAttribute('role')).toBe('status');
    expect(container.getAttribute('aria-live')).toBe('polite');
  });

  it('toast is an n-toast custom element', () => {
    const el = create();
    el.toast({ message: 'Custom' });
    const toast = el.querySelector('n-toast')!;
    expect(toast.tagName.toLowerCase()).toBe('n-toast');
    expect(toast.getAttribute('message')).toBe('Custom');
  });

  it('dismiss button click removes the toast', () => {
    const el = create();
    el.toast({ message: 'Click to close', duration: 0 });
    const close = el.querySelector('n-toast .n-toast-close') as HTMLElement;
    expect(close).not.toBeNull();
    close.click();
    expect(el.querySelectorAll('n-toast').length).toBe(0);
  });

  it('container lives inside the host element', () => {
    const el = create();
    el.toast({ message: 'Scoped' });
    expect(el.querySelector('.n-toast-container')).not.toBeNull();
    expect(document.body.querySelector(':scope > .n-toast-container')).toBeNull();
  });

  it('destroy() dismisses all toasts and removes container', () => {
    const el = create();
    el.toast({ message: 'A', duration: 0 });
    el.toast({ message: 'B', duration: 0 });
    expect(el.querySelectorAll('n-toast').length).toBe(2);
    el.remove();
    expect(el.querySelector('.n-toast-container')).toBeNull();
  });

  it('separate controllers have independent containers', () => {
    const el1 = create();
    const el2 = document.createElement('toast-test') as ToastTestEl;
    document.body.appendChild(el2);

    el1.toast({ message: 'From el1', duration: 0 });
    el2.toast({ message: 'From el2', duration: 0 });

    expect(el1.querySelectorAll('n-toast').length).toBe(1);
    expect(el2.querySelectorAll('n-toast').length).toBe(1);

    el1.dismissAllToasts();
    expect(el1.querySelectorAll('n-toast').length).toBe(0);
    expect(el2.querySelectorAll('n-toast').length).toBe(1);
  });
});
