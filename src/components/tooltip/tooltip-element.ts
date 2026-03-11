import { signal } from '@nonoun/native-core';
import { NativeElement } from '@nonoun/native-core';
import { createDisabledEffect } from '@nonoun/native-core';
import { uid } from '@nonoun/native-core';

/**
 * Tooltip popover anchored to its parent element with delay and placement control.
 * @attr {string} placement - Position relative to anchor: "top" | "bottom" | "left" | "right"
 * @attr {number} delay - Show delay in milliseconds (default 500)
 * @attr {boolean} disabled - Prevents tooltip from showing
 */
export class NTooltip extends NativeElement {
  static observedAttributes = ['placement', 'delay', 'disabled'];

  #internals: ElementInternals;
  #open = signal(false);
  #disabled = signal(false);
  #timer: ReturnType<typeof setTimeout> | null = null;
  #anchor: HTMLElement | null = null;
  #anchorName = '';

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  get placement(): string {
    return this.getAttribute('placement') ?? 'top';
  }

  set placement(val: string) {
    this.setAttribute('placement', val);
  }

  get delay(): number {
    return Number(this.getAttribute('delay') ?? 500);
  }

  set delay(val: number) {
    this.setAttribute('delay', String(val));
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'disabled') this.#disabled.value = val !== null;
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();

    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));

    // WHY: Tooltip must be a child of its trigger element
    this.#anchor = this.parentElement;
    if (!this.#anchor) return;

    // Wire anchor positioning
    this.#anchorName = uid('tip');
    this.#anchor.style.setProperty('anchor-name', `--${this.#anchorName}`);
    this.style.setProperty('position-anchor', `--${this.#anchorName}`);

    // Set popover attribute for top-layer promotion
    if (!this.hasAttribute('popover')) {
      this.setAttribute('popover', 'manual');
    }

    // ARIA: tooltip is described-by
    if (!this.id) this.id = uid('tooltip');
    this.#anchor.setAttribute('aria-describedby', this.id);

    // Trigger listeners on anchor
    this.#anchor.addEventListener('mouseenter', this.#onShow);
    this.#anchor.addEventListener('mouseleave', this.#onHide);
    this.#anchor.addEventListener('focusin', this.#onShow);
    this.#anchor.addEventListener('focusout', this.#onHide);

    // Escape closes tooltip
    this.#anchor.addEventListener('keydown', this.#onKeyDown);

    // WHY: Close tooltip when disabled while open
    this.addEffect(() => {
      if (this.#disabled.value && this.#open.value) {
        this.#clearTimer();
        this.#open.value = false;
      }
    });

    // Sync visibility
    this.addEffect(() => {
      const open = this.#open.value;
      if (open) {
        try { this.showPopover(); } catch { /* already open */ }
      } else {
        try { this.hidePopover(); } catch { /* already hidden */ }
      }
    });
  }

  teardown(): void {
    this.#clearTimer();
    if (this.#anchor) {
      this.#anchor.removeEventListener('mouseenter', this.#onShow);
      this.#anchor.removeEventListener('mouseleave', this.#onHide);
      this.#anchor.removeEventListener('focusin', this.#onShow);
      this.#anchor.removeEventListener('focusout', this.#onHide);
      this.#anchor.removeEventListener('keydown', this.#onKeyDown);
      this.#anchor.removeAttribute('aria-describedby');
      this.#anchor.style.removeProperty('anchor-name');
      this.#anchor = null;
    }
    super.teardown();
  }

  #onShow = (): void => {
    if (this.#disabled.value) return;
    this.#clearTimer();
    this.#timer = setTimeout(() => {
      this.#open.value = true;
    }, this.delay);
  };

  #onHide = (): void => {
    this.#clearTimer();
    this.#open.value = false;
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.#open.value) {
      this.#open.value = false;
    }
  };

  #clearTimer(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
}
