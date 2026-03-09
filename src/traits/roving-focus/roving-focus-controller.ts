export interface RovingFocusOptions {
  selector?: string;
  orientation?: 'horizontal' | 'vertical' | 'both';
  wrap?: boolean;
  disabled?: boolean;
}

/** Manages arrow-key roving tabindex focus across a set of child items. */
export class RovingFocusController {
  readonly host: HTMLElement;
  selector: string;
  orientation: 'horizontal' | 'vertical' | 'both';
  wrap: boolean;
  disabled: boolean;

  #activeIndex = 0;
  #attached = false;

  constructor(host: HTMLElement, options: RovingFocusOptions = {}) {
    this.host = host;
    this.selector = options.selector ?? ':scope > [role]';
    this.orientation = options.orientation ?? 'vertical';
    this.wrap = options.wrap ?? true;
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  attach(): void {
    if (this.#attached || this.disabled) return;
    this.#attached = true;
    this.host.addEventListener('keydown', this.#onKeyDown);
    this.host.addEventListener('focusin', this.#onFocusIn);

    const items = this.#getItems();
    for (let i = 0; i < items.length; i++) {
      items[i].setAttribute('tabindex', i === 0 ? '0' : '-1');
    }
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('keydown', this.#onKeyDown);
    this.host.removeEventListener('focusin', this.#onFocusIn);
  }

  destroy(): void {
    this.detach();
  }

  #getItems(): HTMLElement[] {
    return [...this.host.querySelectorAll<HTMLElement>(this.selector)]
      .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true');
  }

  #onKeyDown = (e: KeyboardEvent): void => {
    const items = this.#getItems();
    if (items.length === 0) return;

    let delta = 0;
    const vert = this.orientation === 'vertical' || this.orientation === 'both';
    const horiz = this.orientation === 'horizontal' || this.orientation === 'both';

    if (e.key === 'ArrowDown' && vert) delta = 1;
    else if (e.key === 'ArrowUp' && vert) delta = -1;
    else if (e.key === 'ArrowRight' && horiz) delta = 1;
    else if (e.key === 'ArrowLeft' && horiz) delta = -1;
    else if (e.key === 'Home') { this.#moveTo(items, 0); e.preventDefault(); return; }
    else if (e.key === 'End') { this.#moveTo(items, items.length - 1); e.preventDefault(); return; }
    else return;

    e.preventDefault();
    let next = this.#activeIndex + delta;
    if (this.wrap) {
      next = (next + items.length) % items.length;
    } else {
      next = Math.max(0, Math.min(items.length - 1, next));
    }
    this.#moveTo(items, next);
  };

  #onFocusIn = (e: FocusEvent): void => {
    // WHY: When container itself receives focus, redirect to active item
    if (e.target === this.host) {
      const items = this.#getItems();
      items[this.#activeIndex]?.focus();
    }
  };

  #moveTo(items: HTMLElement[], index: number): void {
    const prev = items[this.#activeIndex];
    if (prev) prev.setAttribute('tabindex', '-1');
    this.#activeIndex = index;
    const next = items[index];
    if (next) {
      next.setAttribute('tabindex', '0');
      next.focus();
    }
  }
}
