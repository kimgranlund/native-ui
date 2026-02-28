export interface SelectionOptions {
  selector: string;
  mode?: 'single' | 'multiple';
  disabled?: boolean;
}

/** Manages single or multi-select item state with Ctrl/Shift modifiers, dispatching `ui-selection-change`. */
export class SelectionController {
  readonly host: HTMLElement;
  selector: string;
  mode: 'single' | 'multiple';
  disabled: boolean;

  #selected = new Set<HTMLElement>();
  #anchor: HTMLElement | null = null;
  #attached = false;

  constructor(host: HTMLElement, options: SelectionOptions) {
    this.host = host;
    this.selector = options.selector;
    this.mode = options.mode ?? 'multiple';
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener('click', this.#onClick);
    this.host.addEventListener('keydown', this.#onKeyDown);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('click', this.#onClick);
    this.host.removeEventListener('keydown', this.#onKeyDown);
  }

  destroy(): void {
    this.clear();
    this.detach();
  }

  // ── Core operations ──

  select(item: HTMLElement): void {
    if (this.disabled) return;
    this.#clearAttributes();
    this.#selected.clear();
    this.#selected.add(item);
    this.#anchor = item;
    item.setAttribute('selected', '');
    item.setAttribute('selection-anchor', '');
    this.#dispatch();
  }

  toggle(item: HTMLElement): void {
    if (this.disabled) return;
    if (this.#selected.has(item)) {
      this.#selected.delete(item);
      item.removeAttribute('selected');
    } else {
      this.#selected.add(item);
      item.setAttribute('selected', '');
    }
    // Update anchor
    for (const el of this.#getItems()) el.removeAttribute('selection-anchor');
    this.#anchor = item;
    item.setAttribute('selection-anchor', '');
    this.#dispatch();
  }

  rangeTo(item: HTMLElement): void {
    if (this.disabled || !this.#anchor) return;
    const items = this.#getItems();
    const anchorIdx = items.indexOf(this.#anchor);
    const targetIdx = items.indexOf(item);
    if (anchorIdx === -1 || targetIdx === -1) return;

    const start = Math.min(anchorIdx, targetIdx);
    const end = Math.max(anchorIdx, targetIdx);

    this.#clearAttributes();
    this.#selected.clear();
    for (let i = start; i <= end; i++) {
      this.#selected.add(items[i]);
      items[i].setAttribute('selected', '');
    }
    if (this.#anchor) this.#anchor.setAttribute('selection-anchor', '');
    this.#dispatch();
  }

  selectAll(): void {
    if (this.disabled || this.mode === 'single') return;
    this.#clearAttributes();
    this.#selected.clear();
    for (const item of this.#getItems()) {
      this.#selected.add(item);
      item.setAttribute('selected', '');
    }
    this.#dispatch();
  }

  clear(): void {
    // WHY: Skip dispatch if already empty to avoid spurious events (e.g. on destroy())
    const wasEmpty = this.#selected.size === 0;
    this.#clearAttributes();
    this.#selected.clear();
    this.#anchor = null;
    if (!wasEmpty) this.#dispatch();
  }

  getSelection(): HTMLElement[] {
    return [...this.#selected];
  }

  handleClick(item: HTMLElement, modifiers: { shift: boolean; ctrl: boolean }): void {
    if (this.disabled) return;
    if (this.mode === 'single') {
      this.select(item);
    } else if (modifiers.shift && this.#anchor) {
      this.rangeTo(item);
    } else if (modifiers.ctrl) {
      this.toggle(item);
    } else {
      this.select(item);
    }
  }

  // ── Helpers ──

  #getItems(): HTMLElement[] {
    return [...this.host.querySelectorAll<HTMLElement>(this.selector)];
  }

  #clearAttributes(): void {
    for (const item of this.#getItems()) {
      item.removeAttribute('selected');
      item.removeAttribute('selection-anchor');
    }
  }

  #dispatch(): void {
    this.host.dispatchEvent(new CustomEvent('ui-selection-change', {
      bubbles: true,
      composed: true,
      detail: { selected: [...this.#selected], count: this.#selected.size },
    }));
  }

  #onClick = (e: MouseEvent): void => {
    if (this.disabled) return;
    const item = (e.target as HTMLElement).closest(this.selector) as HTMLElement | null;
    if (!item || !this.host.contains(item)) return;
    this.handleClick(item, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey });
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (this.disabled) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      this.selectAll();
    }
  };
}
