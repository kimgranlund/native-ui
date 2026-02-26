export interface ClipboardOptions {
  selector: string;
  disabled?: boolean;
}

/** Handles keyboard-driven cut/copy/paste operations on selected items, dispatching `ui-clip`. */
export class ClipboardController {
  readonly host: HTMLElement;
  selector: string;
  disabled: boolean;

  #cutItems = new Set<HTMLElement>();
  #attached = false;

  constructor(host: HTMLElement, options: ClipboardOptions) {
    this.host = host;
    this.selector = options.selector;
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener('keydown', this.#onKeyDown);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('keydown', this.#onKeyDown);
  }

  destroy(): void {
    this.cancelCut();
    this.detach();
  }

  // ── Serialization (override in consumers) ──

  serialize(items: HTMLElement[]): string {
    return items.map(el => el.textContent ?? '').join('\n');
  }

  deserialize(data: string): string[] {
    return data.split('\n');
  }

  // ── Operations ──

  async copy(items: HTMLElement[]): Promise<string> {
    if (this.disabled) return '';
    const data = this.serialize(items);
    await navigator.clipboard.writeText(data);
    this.host.dispatchEvent(new CustomEvent('ui-clip-copy', {
      bubbles: true, composed: true,
      detail: { items, data },
    }));
    return data;
  }

  async cut(items: HTMLElement[]): Promise<string> {
    if (this.disabled) return '';
    const data = this.serialize(items);
    await navigator.clipboard.writeText(data);
    this.cancelCut();
    for (const item of items) {
      this.#cutItems.add(item);
      item.setAttribute('clip-cut', '');
    }
    this.host.dispatchEvent(new CustomEvent('ui-clip-cut', {
      bubbles: true, composed: true,
      detail: { items, data },
    }));
    return data;
  }

  async paste(): Promise<string> {
    if (this.disabled) return '';
    const data = await navigator.clipboard.readText();
    this.cancelCut();
    this.host.dispatchEvent(new CustomEvent('ui-clip-paste', {
      bubbles: true, composed: true,
      detail: { data },
    }));
    return data;
  }

  cancelCut(): void {
    for (const item of this.#cutItems) {
      item.removeAttribute('clip-cut');
    }
    this.#cutItems.clear();
  }

  get hasCutPending(): boolean { return this.#cutItems.size > 0; }
  get cutItems(): Set<HTMLElement> { return this.#cutItems; }

  #onKeyDown = (e: KeyboardEvent): void => {
    if (this.disabled) return;
    if (!(e.ctrlKey || e.metaKey)) return;

    // Get selected items (look for [selected] within selector scope)
    const selected = [...this.host.querySelectorAll<HTMLElement>(`${this.selector}[selected]`)];
    if (selected.length === 0) return;

    switch (e.key) {
      case 'c':
        e.preventDefault();
        this.copy(selected);
        break;
      case 'x':
        e.preventDefault();
        this.cut(selected);
        break;
      case 'v':
        e.preventDefault();
        this.paste();
        break;
    }
  };
}
