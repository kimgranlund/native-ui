// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NativeElement } from '../../core/native-element.ts';
import { EditController } from './edit-controller.ts';
import { define } from '../../core/define.ts';

// ── Trait tests ──

class EditTestEl extends NativeElement {
  disabled = false;
  #ctrl: EditController | null = null;

  _pendingTrigger: 'click' | 'dblclick' = 'dblclick';
  _pendingDisabled = false;

  get editTrigger(): 'click' | 'dblclick' { return this.#ctrl?.trigger ?? this._pendingTrigger; }
  set editTrigger(v: 'click' | 'dblclick') { if (this.#ctrl) this.#ctrl.trigger = v; else this._pendingTrigger = v; }

  get isEditing(): boolean { return this.#ctrl?.isEditing ?? false; }

  get editableDisabled(): boolean { return this.#ctrl?.disabled ?? this._pendingDisabled; }
  set editableDisabled(v: boolean) { if (this.#ctrl) this.#ctrl.disabled = v; else this._pendingDisabled = v; }

  setup() {
    super.setup();
    this.#ctrl = new EditController(this, {
      trigger: this._pendingTrigger,
      disabled: this._pendingDisabled,
    });
  }

  startEdit() { this.#ctrl?.startEdit(); }
  commitEdit(): string { return this.#ctrl?.commitEdit() ?? ''; }
  cancelEdit() { this.#ctrl?.cancelEdit(); }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }
}

if (!customElements.get('edit-test')) {
  define('edit-test', EditTestEl);
}

function create(text = 'Hello World'): EditTestEl {
  const el = document.createElement('edit-test') as EditTestEl;
  el.textContent = text;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Editable', () => {
  it('defaults editTrigger to dblclick', () => {
    const el = create();
    expect(el.editTrigger).toBe('dblclick');
  });

  it('starts not editing', () => {
    const el = create();
    expect(el.isEditing).toBe(false);
  });

  it('startEdit enters editing mode', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:edit-start', handler);
    el.startEdit();
    expect(el.isEditing).toBe(true);
    expect(el.hasAttribute('editing')).toBe(true);
    expect(el.getAttribute('contenteditable')).toBe('plaintext-only');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('Hello World');
  });

  it('commitEdit exits editing and dispatches event', () => {
    const el = create();
    el.startEdit();
    const handler = vi.fn();
    el.addEventListener('native:edit-commit', handler);
    const value = el.commitEdit();
    expect(el.isEditing).toBe(false);
    expect(el.hasAttribute('editing')).toBe(false);
    expect(el.hasAttribute('contenteditable')).toBe(false);
    expect(value).toBe('Hello World');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.previousValue).toBe('Hello World');
  });

  it('cancelEdit restores original text', () => {
    const el = create();
    el.startEdit();
    el.textContent = 'Modified';
    const handler = vi.fn();
    el.addEventListener('native:edit-cancel', handler);
    el.cancelEdit();
    expect(el.textContent).toBe('Hello World');
    expect(el.isEditing).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does nothing when editableDisabled', () => {
    const el = create();
    el.editableDisabled = true;
    el.startEdit();
    expect(el.isEditing).toBe(false);
  });

  it('teardown cancels active edit', () => {
    const el = create();
    el.startEdit();
    el.textContent = 'Modified';
    el.teardown();
    expect(el.textContent).toBe('Hello World');
  });
});

// ── EditController standalone tests ──

function createHost(text = 'Edit Me'): HTMLElement {
  const el = document.createElement('div');
  el.textContent = text;
  document.body.appendChild(el);
  return el;
}

describe('EditController', () => {
  it('starts editing on dblclick (default trigger)', () => {
    const host = createHost();
    const ctrl = new EditController(host, { trigger: 'dblclick' });
    const handler = vi.fn();
    host.addEventListener('native:edit-start', handler);
    host.dispatchEvent(new Event('dblclick', { bubbles: true }));
    expect(ctrl.isEditing).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    ctrl.destroy();
  });

  it('starts editing on click when trigger is click', () => {
    const host = createHost();
    const ctrl = new EditController(host, { trigger: 'click' });
    host.dispatchEvent(new Event('click', { bubbles: true }));
    expect(ctrl.isEditing).toBe(true);
    ctrl.destroy();
  });

  it('Enter commits edit', () => {
    const host = createHost();
    const ctrl = new EditController(host);
    ctrl.startEdit();
    const handler = vi.fn();
    host.addEventListener('native:edit-commit', handler);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(ctrl.isEditing).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    ctrl.destroy();
  });

  it('Shift+Enter does not commit', () => {
    const host = createHost();
    const ctrl = new EditController(host);
    ctrl.startEdit();
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    expect(ctrl.isEditing).toBe(true);
    ctrl.destroy();
  });

  it('Escape cancels edit and restores original', () => {
    const host = createHost();
    const ctrl = new EditController(host);
    ctrl.startEdit();
    host.textContent = 'Changed';
    const handler = vi.fn();
    host.addEventListener('native:edit-cancel', handler);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(ctrl.isEditing).toBe(false);
    expect(host.textContent).toBe('Edit Me');
    expect(handler).toHaveBeenCalledTimes(1);
    ctrl.destroy();
  });

  it('blur commits edit', () => {
    const host = createHost();
    const ctrl = new EditController(host);
    ctrl.startEdit();
    const handler = vi.fn();
    host.addEventListener('native:edit-commit', handler);
    host.dispatchEvent(new Event('blur'));
    expect(ctrl.isEditing).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    ctrl.destroy();
  });

  it('sets contenteditable and editing attribute', () => {
    const host = createHost();
    const ctrl = new EditController(host);
    ctrl.startEdit();
    expect(host.getAttribute('contenteditable')).toBe('plaintext-only');
    expect(host.hasAttribute('editing')).toBe(true);
    ctrl.commitEdit();
    expect(host.hasAttribute('contenteditable')).toBe(false);
    expect(host.hasAttribute('editing')).toBe(false);
    ctrl.destroy();
  });

  it('originalValue and currentValue getters', () => {
    const host = createHost();
    const ctrl = new EditController(host);
    ctrl.startEdit();
    expect(ctrl.originalValue).toBe('Edit Me');
    host.textContent = 'New Value';
    expect(ctrl.currentValue).toBe('New Value');
    ctrl.destroy();
  });

  it('commitEdit returns current text', () => {
    const host = createHost();
    const ctrl = new EditController(host);
    ctrl.startEdit();
    host.textContent = 'Updated';
    const value = ctrl.commitEdit();
    expect(value).toBe('Updated');
    ctrl.destroy();
  });

  it('ignores startEdit when disabled', () => {
    const host = createHost();
    const ctrl = new EditController(host, { disabled: true });
    ctrl.startEdit();
    expect(ctrl.isEditing).toBe(false);
    ctrl.destroy();
  });

  it('ignores startEdit when already editing', () => {
    const host = createHost();
    const ctrl = new EditController(host);
    ctrl.startEdit();
    const handler = vi.fn();
    host.addEventListener('native:edit-start', handler);
    ctrl.startEdit(); // second call — should be ignored
    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('detach removes all listeners', () => {
    const host = createHost();
    const ctrl = new EditController(host);
    ctrl.detach();
    host.dispatchEvent(new Event('dblclick', { bubbles: true }));
    expect(ctrl.isEditing).toBe(false);
    ctrl.destroy();
  });

  it('destroy cancels active edit first', () => {
    const host = createHost();
    const ctrl = new EditController(host);
    ctrl.startEdit();
    host.textContent = 'Changed';
    ctrl.destroy();
    expect(host.textContent).toBe('Edit Me');
  });

  it('keydown does nothing when not editing', () => {
    const host = createHost();
    const ctrl = new EditController(host);
    const handler = vi.fn();
    host.addEventListener('native:edit-commit', handler);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    ctrl.destroy();
  });
});
