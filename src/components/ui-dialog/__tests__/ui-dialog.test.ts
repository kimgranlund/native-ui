// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-dialog.ts';

function mockDialogMethods(dialog: HTMLDialogElement): void {
  // happy-dom may not implement showModal/close on <dialog>.
  // Define them if missing so tests can drive state.
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

function create(attrs: Record<string, string> = {}, content = 'Dialog content'): HTMLElement {
  const el = document.createElement('ui-dialog');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  el.textContent = content;
  document.body.appendChild(el);

  // After setup(), the <dialog> element has been created.
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

describe('ui-dialog', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-dialog')).toBeDefined();
  });

  it('creates a <dialog> element on setup and moves children into it', () => {
    const el = create({}, 'Hello world');
    const dialog = el.querySelector('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toBe('Hello world');
    // The direct child of ui-dialog should be the <dialog>, not the text node
    expect(el.firstElementChild!.tagName.toLowerCase()).toBe('dialog');
    // ARIA: native <dialog> element provides implicit dialog role
    expect(dialog!.tagName.toLowerCase()).toBe('dialog');
  });

  it('open getter returns false initially', () => {
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

  it('showModal() does nothing when already open', () => {
    const el = create();
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    (el as any).showModal();
    expect(dialog.showModal).toHaveBeenCalledTimes(1);

    (el as any).showModal();
    // Called only once — second call bails early because already open
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
  });

  it('close() closes the dialog and dispatches a close event', () => {
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

  it('close() does nothing when already closed', () => {
    const el = create();
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    const closeFired = vi.fn();
    el.addEventListener('close', closeFired);

    // Never opened — dialog.open is false
    (el as any).close();

    expect(dialog.close).not.toHaveBeenCalled();
    expect(closeFired).not.toHaveBeenCalled();
  });

  it('native cancel event (Escape) closes the dialog by default', () => {
    const el = create();
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    (el as any).showModal();
    expect((el as any).open).toBe(true);

    const closeFired = vi.fn();
    el.addEventListener('close', closeFired);

    const cancelEvent = new Event('cancel', { bubbles: false, cancelable: true });
    dialog.dispatchEvent(cancelEvent);

    // preventDefault should have been called
    expect(cancelEvent.defaultPrevented).toBe(true);
    expect((el as any).open).toBe(false);
    expect(closeFired).toHaveBeenCalledTimes(1);
  });

  it('native cancel event (Escape) does NOT close when no-close-on-escape is present', () => {
    const el = create({ 'no-close-on-escape': '' });
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    (el as any).showModal();
    expect((el as any).open).toBe(true);

    const closeFired = vi.fn();
    el.addEventListener('close', closeFired);

    const cancelEvent = new Event('cancel', { bubbles: false, cancelable: true });
    dialog.dispatchEvent(cancelEvent);

    // preventDefault still called (always), but close() not triggered
    expect(cancelEvent.defaultPrevented).toBe(true);
    expect((el as any).open).toBe(true);
    expect(closeFired).not.toHaveBeenCalled();
  });

  it('clicking the backdrop (dialog element itself) closes the dialog', () => {
    const el = create();
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    (el as any).showModal();
    expect((el as any).open).toBe(true);

    const closeFired = vi.fn();
    el.addEventListener('close', closeFired);

    // Simulate a click where e.target === dialog (backdrop click)
    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: dialog, configurable: true });
    dialog.dispatchEvent(clickEvent);

    expect((el as any).open).toBe(false);
    expect(closeFired).toHaveBeenCalledTimes(1);
  });

  it('clicking backdrop does NOT close when no-close-on-backdrop is present', () => {
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

  it('clicking a child inside dialog does NOT trigger backdrop close', () => {
    const el = create();
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    (el as any).showModal();

    const closeFired = vi.fn();
    el.addEventListener('close', closeFired);

    // The click target is a child element, not the dialog itself
    const inner = document.createElement('div');
    dialog.appendChild(inner);
    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: inner, configurable: true });
    dialog.dispatchEvent(clickEvent);

    expect((el as any).open).toBe(true);
    expect(closeFired).not.toHaveBeenCalled();
  });

  it('ui-dismiss event closes the dialog', () => {
    const el = create();

    (el as any).showModal();
    expect((el as any).open).toBe(true);

    const closeFired = vi.fn();
    el.addEventListener('close', closeFired);

    el.dispatchEvent(new Event('ui-dismiss', { bubbles: true }));

    expect((el as any).open).toBe(false);
    expect(closeFired).toHaveBeenCalledTimes(1);
  });

  it('ui-dismiss does NOT close when no-close-on-escape is present', () => {
    const el = create({ 'no-close-on-escape': '' });

    (el as any).showModal();
    expect((el as any).open).toBe(true);

    const closeFired = vi.fn();
    el.addEventListener('close', closeFired);

    el.dispatchEvent(new Event('ui-dismiss', { bubbles: true }));

    expect((el as any).open).toBe(true);
    expect(closeFired).not.toHaveBeenCalled();
  });

  it('showModal toggles open attribute on the host element', () => {
    const el = create();
    expect(el.hasAttribute('open')).toBe(false);

    (el as any).showModal();
    expect(el.hasAttribute('open')).toBe(true);
    // ARIA: inner dialog should also be open
    const dialog = el.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(true);

    (el as any).close();
    expect(el.hasAttribute('open')).toBe(false);
    // ARIA: inner dialog should be closed
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('dialog element persists in DOM after close', () => {
    const el = create();
    (el as any).showModal();
    (el as any).close();

    const dialog = el.querySelector('dialog');
    expect(dialog).not.toBeNull();
  });

  it('opt-out attributes are read at event time (not in observedAttributes)', () => {
    // no-close-on-escape and no-close-on-backdrop are read via hasAttribute() when events fire,
    // not reactively — they don't need to be in observedAttributes.
    const Ctor = customElements.get('ui-dialog')!;
    const observed = (Ctor as any).observedAttributes;
    expect(observed ?? []).not.toContain('no-close-on-escape');
    expect(observed ?? []).not.toContain('no-close-on-backdrop');
  });

  it('close event does not bubble', () => {
    const el = create();
    (el as any).showModal();

    const parentHandler = vi.fn();
    document.body.addEventListener('close', parentHandler);

    (el as any).close();
    // close event from host should not bubble (default Event behavior)
    expect(parentHandler).not.toHaveBeenCalled();

    document.body.removeEventListener('close', parentHandler);
  });
});
