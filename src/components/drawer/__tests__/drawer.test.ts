// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../drawer.ts';

function mockDialogMethods(dialog: HTMLDialogElement): void {
  if (!dialog.showModal) {
    dialog.showModal = vi.fn(() => {
      dialog.setAttribute('open', '');
      Object.defineProperty(dialog, 'open', {
        value: true,
        writable: true,
        configurable: true,
      });
    });
  } else {
    vi.spyOn(dialog, 'showModal').mockImplementation(() => {
      dialog.setAttribute('open', '');
      Object.defineProperty(dialog, 'open', {
        value: true,
        writable: true,
        configurable: true,
      });
    });
  }

  if (!dialog.close) {
    dialog.close = vi.fn(() => {
      dialog.removeAttribute('open');
      Object.defineProperty(dialog, 'open', {
        value: false,
        writable: true,
        configurable: true,
      });
    });
  } else {
    vi.spyOn(dialog, 'close').mockImplementation(() => {
      dialog.removeAttribute('open');
      Object.defineProperty(dialog, 'open', {
        value: false,
        writable: true,
        configurable: true,
      });
    });
  }
}

function create(attrs: Record<string, string> = {}, content = 'Drawer content'): HTMLElement {
  const el = document.createElement('n-drawer');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  el.textContent = content;
  document.body.appendChild(el);

  const dialog = el.querySelector('dialog');
  if (dialog) {
    mockDialogMethods(dialog as HTMLDialogElement);
  }

  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('n-drawer', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-drawer')).toBeDefined();
  });

  it('creates dialog and panel in setup', () => {
    const el = create();
    const dialog = el.querySelector('dialog');
    const panel = el.querySelector('n-drawer-panel');
    expect(dialog).not.toBeNull();
    expect(panel).not.toBeNull();
  });

  it('moves children into panel', () => {
    const el = create({}, 'Hello drawer');
    const panel = el.querySelector('n-drawer-panel');
    expect(panel!.textContent).toBe('Hello drawer');
    // Direct child of n-drawer should be the dialog
    expect(el.firstElementChild!.tagName.toLowerCase()).toBe('dialog');
  });

  it('open property is false initially', () => {
    const el = create();
    expect((el as any).open).toBe(false);
  });

  it('showModal() opens the dialog', () => {
    const el = create();
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    expect((el as any).open).toBe(false);
    (el as any).showModal();
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    expect((el as any).open).toBe(true);
  });

  it('close() closes and dispatches close event', () => {
    const el = create();
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    (el as any).showModal();
    expect((el as any).open).toBe(true);

    const closeFired = vi.fn();
    el.addEventListener('close', closeFired);

    (el as any).close();

    expect(dialog.close).toHaveBeenCalledTimes(1);
    expect((el as any).open).toBe(false);
    expect(closeFired).toHaveBeenCalledTimes(1);
  });

  it('no-close-on-escape attribute prevents close on cancel event', () => {
    const el = create({ 'no-close-on-escape': '' });
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    (el as any).showModal();
    expect((el as any).open).toBe(true);

    const closeFired = vi.fn();
    el.addEventListener('close', closeFired);

    const cancelEvent = new Event('cancel', { bubbles: false, cancelable: true });
    dialog.dispatchEvent(cancelEvent);

    expect(cancelEvent.defaultPrevented).toBe(true);
    expect((el as any).open).toBe(true);
    expect(closeFired).not.toHaveBeenCalled();
  });

  it('cancel event closes the dialog by default', () => {
    const el = create();
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    (el as any).showModal();
    expect((el as any).open).toBe(true);

    const closeFired = vi.fn();
    el.addEventListener('close', closeFired);

    const cancelEvent = new Event('cancel', { bubbles: false, cancelable: true });
    dialog.dispatchEvent(cancelEvent);

    expect(cancelEvent.defaultPrevented).toBe(true);
    expect((el as any).open).toBe(false);
    expect(closeFired).toHaveBeenCalledTimes(1);
  });

  it('no-close-on-backdrop attribute prevents close on backdrop click', () => {
    const el = create({ 'no-close-on-backdrop': '' });
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    (el as any).showModal();
    expect((el as any).open).toBe(true);

    const closeFired = vi.fn();
    el.addEventListener('close', closeFired);

    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: dialog, configurable: true });
    dialog.dispatchEvent(clickEvent);

    expect((el as any).open).toBe(true);
    expect(closeFired).not.toHaveBeenCalled();
  });

  it('backdrop click closes the dialog by default', () => {
    const el = create();
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    (el as any).showModal();
    expect((el as any).open).toBe(true);

    const closeFired = vi.fn();
    el.addEventListener('close', closeFired);

    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: dialog, configurable: true });
    dialog.dispatchEvent(clickEvent);

    expect((el as any).open).toBe(false);
    expect(closeFired).toHaveBeenCalledTimes(1);
  });

  it('close when already closed does nothing', () => {
    const el = create();
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    const closeFired = vi.fn();
    el.addEventListener('close', closeFired);

    (el as any).close();

    expect(dialog.close).not.toHaveBeenCalled();
    expect(closeFired).not.toHaveBeenCalled();
  });

  it('showModal when already open does nothing', () => {
    const el = create();
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    (el as any).showModal();
    expect(dialog.showModal).toHaveBeenCalledTimes(1);

    (el as any).showModal();
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
  });
});
