export interface EditOptions {
  trigger?: 'click' | 'dblclick';
  disabled?: boolean;
}

/** Enables inline text editing on the host element, dispatching `native:edit-start`, `native:edit-commit`, and `native:edit-cancel`. */
export class EditController {
  readonly host: HTMLElement;
  trigger: 'click' | 'dblclick';
  disabled: boolean;

  #originalValue = '';
  #isEditing = false;
  #attached = false;

  constructor(host: HTMLElement, options: EditOptions = {}) {
    this.host = host;
    this.trigger = options.trigger ?? 'dblclick';
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  get isEditing(): boolean { return this.#isEditing; }
  get originalValue(): string { return this.#originalValue; }
  get currentValue(): string { return this.host.textContent ?? ''; }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener(this.trigger, this.#onActivate);
    this.host.addEventListener('keydown', this.#onKeyDown);
    this.host.addEventListener('blur', this.#onBlur);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener(this.trigger, this.#onActivate);
    this.host.removeEventListener('keydown', this.#onKeyDown);
    this.host.removeEventListener('blur', this.#onBlur);
  }

  destroy(): void {
    if (this.#isEditing) this.cancelEdit();
    this.detach();
  }

  startEdit(): void {
    if (this.disabled || this.#isEditing) return;
    this.#originalValue = this.host.textContent ?? '';
    this.#isEditing = true;
    this.host.setAttribute('contenteditable', 'plaintext-only');
    this.host.setAttribute('editing', '');
    this.host.focus();
    // Select all text
    const sel = window.getSelection();
    if (sel) {
      sel.selectAllChildren(this.host);
      sel.collapseToEnd();
    }
    this.host.dispatchEvent(new CustomEvent('native:edit-start', {
      bubbles: true, composed: true,
      detail: { value: this.#originalValue },
    }));
  }

  commitEdit(): string {
    if (!this.#isEditing) return this.#originalValue;
    const value = this.host.textContent ?? '';
    this.#isEditing = false;
    this.host.removeAttribute('contenteditable');
    this.host.removeAttribute('editing');
    this.host.dispatchEvent(new CustomEvent('native:edit-commit', {
      bubbles: true, composed: true,
      detail: { value, previousValue: this.#originalValue },
    }));
    return value;
  }

  cancelEdit(): void {
    if (!this.#isEditing) return;
    this.host.textContent = this.#originalValue;
    this.#isEditing = false;
    this.host.removeAttribute('contenteditable');
    this.host.removeAttribute('editing');
    this.host.dispatchEvent(new CustomEvent('native:edit-cancel', {
      bubbles: true, composed: true,
      detail: { value: this.#originalValue },
    }));
  }

  #onActivate = (): void => {
    this.startEdit();
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (!this.#isEditing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.cancelEdit();
    }
  };

  #onBlur = (): void => {
    if (this.#isEditing) this.commitEdit();
  };
}
