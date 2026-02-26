// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { UIElement } from '../../core/ui-element.ts';
import { DropZoneController } from '../drop-zone-controller.ts';
import { define } from '../../core/define.ts';

class DropTestEl extends UIElement {
  disabled = false;
  #ctrl: DropZoneController | null = null;

  _pendingAccept = '*';
  _pendingMultiple = true;
  _pendingDisabled = false;

  get dropAccept(): string { return this.#ctrl?.accept ?? this._pendingAccept; }
  set dropAccept(v: string) { if (this.#ctrl) this.#ctrl.accept = v; else this._pendingAccept = v; }

  get dropMultiple(): boolean { return this.#ctrl?.multiple ?? this._pendingMultiple; }
  set dropMultiple(v: boolean) { if (this.#ctrl) this.#ctrl.multiple = v; else this._pendingMultiple = v; }

  get dropDisabled(): boolean { return this.#ctrl?.disabled ?? this._pendingDisabled; }
  set dropDisabled(v: boolean) { if (this.#ctrl) this.#ctrl.disabled = v; else this._pendingDisabled = v; }

  setup() {
    super.setup();
    this.#ctrl = new DropZoneController(this, {
      accept: this._pendingAccept,
      multiple: this._pendingMultiple,
      disabled: this._pendingDisabled,
    });
  }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }
}

if (!customElements.get('drop-test')) {
  define('drop-test', DropTestEl);
}

function create(): DropTestEl {
  const el = document.createElement('drop-test') as DropTestEl;
  document.body.appendChild(el);
  return el;
}

function makeDragEvent(type: string, opts: { files?: File[]; text?: string; mime?: string } = {}): DragEvent {
  const items: DataTransferItem[] = [];
  if (opts.mime) {
    items.push({ type: opts.mime } as DataTransferItem);
  } else if (opts.text) {
    items.push({ type: 'text/plain' } as DataTransferItem);
  } else if (opts.files && opts.files.length > 0) {
    for (const f of opts.files) {
      items.push({ type: f.type } as DataTransferItem);
    }
  }

  const dt = {
    files: opts.files ?? [],
    items,
    dropEffect: 'none' as string,
    getData: vi.fn((type: string) => {
      if (type === 'text/plain' && opts.text) return opts.text;
      return '';
    }),
  } as unknown as DataTransfer;

  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', { value: dt });
  return event;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Droppable — dragenter/dragleave', () => {
  it('sets drop-active on dragenter with matching mime', () => {
    const el = create();
    el.dispatchEvent(makeDragEvent('dragenter', { text: 'hello' }));
    expect(el.hasAttribute('drop-active')).toBe(true);
    expect(el.hasAttribute('drop-invalid')).toBe(false);
  });

  it('sets drop-invalid when mime does not match dropAccept', () => {
    const el = create();
    el.dropAccept = 'image/*';
    el.dispatchEvent(makeDragEvent('dragenter', { mime: 'text/plain' }));
    expect(el.hasAttribute('drop-invalid')).toBe(true);
    expect(el.hasAttribute('drop-active')).toBe(false);
  });

  it('removes attributes on dragleave', () => {
    const el = create();
    el.dispatchEvent(makeDragEvent('dragenter', { text: 'hello' }));
    expect(el.hasAttribute('drop-active')).toBe(true);
    el.dispatchEvent(makeDragEvent('dragleave'));
    expect(el.hasAttribute('drop-active')).toBe(false);
  });

  it('handles nested enter/leave via counter', () => {
    const el = create();
    // Two enters (e.g., entering child element)
    el.dispatchEvent(makeDragEvent('dragenter', { text: 'hello' }));
    el.dispatchEvent(makeDragEvent('dragenter', { text: 'hello' }));
    expect(el.hasAttribute('drop-active')).toBe(true);
    // First leave — counter still > 0
    el.dispatchEvent(makeDragEvent('dragleave'));
    expect(el.hasAttribute('drop-active')).toBe(true);
    // Second leave — counter reaches 0
    el.dispatchEvent(makeDragEvent('dragleave'));
    expect(el.hasAttribute('drop-active')).toBe(false);
  });

  it('does nothing on dragenter when disabled', () => {
    const el = create();
    el.dropDisabled = true;
    el.dispatchEvent(makeDragEvent('dragenter', { text: 'hello' }));
    expect(el.hasAttribute('drop-active')).toBe(false);
  });
});

describe('Droppable — dragover', () => {
  it('prevents default and sets dropEffect to copy', () => {
    const el = create();
    const event = makeDragEvent('dragover');
    el.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect((event.dataTransfer as DataTransfer).dropEffect).toBe('copy');
  });

  it('does nothing when disabled', () => {
    const el = create();
    el.dropDisabled = true;
    const event = makeDragEvent('dragover');
    el.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('Droppable — drop', () => {
  it('dispatches ui-file-drop for file drops', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-file-drop', handler);
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    el.dispatchEvent(makeDragEvent('drop', { files: [file] }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.files).toHaveLength(1);
    expect(handler.mock.calls[0][0].detail.files[0]).toBe(file);
  });

  it('limits to 1 file when dropMultiple is false', () => {
    const el = create();
    el.dropMultiple = false;
    const handler = vi.fn();
    el.addEventListener('ui-file-drop', handler);
    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' });
    const f2 = new File(['b'], 'b.txt', { type: 'text/plain' });
    el.dispatchEvent(makeDragEvent('drop', { files: [f1, f2] }));
    expect(handler.mock.calls[0][0].detail.files).toHaveLength(1);
  });

  it('dispatches ui-text-drop for text drops', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-text-drop', handler);
    el.dispatchEvent(makeDragEvent('drop', { text: 'hello world' }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.text).toBe('hello world');
  });

  it('clears attributes on drop', () => {
    const el = create();
    el.dispatchEvent(makeDragEvent('dragenter', { text: 'hello' }));
    expect(el.hasAttribute('drop-active')).toBe(true);
    el.dispatchEvent(makeDragEvent('drop', { text: 'hello' }));
    expect(el.hasAttribute('drop-active')).toBe(false);
  });

  it('does not dispatch events when disabled', () => {
    const el = create();
    el.dropDisabled = true;
    const handler = vi.fn();
    el.addEventListener('ui-text-drop', handler);
    el.dispatchEvent(makeDragEvent('drop', { text: 'hello' }));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('Droppable — teardown', () => {
  it('clears attributes and counter on teardown', () => {
    const el = create();
    el.dispatchEvent(makeDragEvent('dragenter', { text: 'hello' }));
    expect(el.hasAttribute('drop-active')).toBe(true);
    el.teardown();
    expect(el.hasAttribute('drop-active')).toBe(false);
    expect(el.hasAttribute('drop-invalid')).toBe(false);
  });

  it('stops responding to events after teardown', () => {
    const el = create();
    el.teardown();
    const handler = vi.fn();
    el.addEventListener('ui-file-drop', handler);
    el.dispatchEvent(makeDragEvent('drop', { files: [new File(['x'], 'x.txt')] }));
    expect(handler).not.toHaveBeenCalled();
  });
});
