import { signal } from '../../reactivity/signal.ts';
import { NativeElement } from '../../core/native-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';

/**
 * Pagination dot indicator for slideshows, onboarding flows, and step wizards.
 * @attr {number} count - Number of dots to render
 * @attr {number} active - Zero-based index of the active dot
 * @attr {boolean} disabled - Disables all dots
 * @attr {number} max-dots - Maximum visible dots before windowing (default 7)
 * @attr {boolean} paddles - Show prev/next navigation buttons
 * @attr {string} variant - Visual variant: (default) | "plain"
 * @fires native:change - Fired when a dot is clicked with `{ index }` detail
 */
export class NPaginationDots extends NativeElement {
  static observedAttributes = ['count', 'active', 'disabled', 'max-dots'];

  #internals: ElementInternals;
  #count = signal(0);
  #active = signal(0);
  #disabled = signal(false);
  #maxDots = signal(7);

  #dotsEl: HTMLElement | null = null;
  #indicator: HTMLDivElement | null = null;
  #prevBtn: HTMLElement | null = null;
  #nextBtn: HTMLElement | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'tablist';
  }

  // ── Properties ──

  get count(): number { return this.#count.value; }
  set count(val: number) {
    const n = Math.max(0, val);
    this.#count.value = n;
    this.setAttribute('count', String(n));
  }

  get active(): number { return this.#active.value; }
  set active(val: number) {
    const clamped = Math.max(0, Math.min(val, this.#count.value - 1));
    this.#active.value = clamped;
    this.setAttribute('active', String(clamped));
  }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  get maxDots(): number { return this.#maxDots.value; }
  set maxDots(val: number) {
    const n = Math.max(1, val);
    this.#maxDots.value = n;
    this.setAttribute('max-dots', String(n));
  }

  // ── Attributes ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    const num = parseInt(val ?? '', 10);
    switch (name) {
      case 'count':
        this.#count.value = Math.max(0, isNaN(num) ? 0 : num);
        break;
      case 'active':
        this.#active.value = Math.max(0, Math.min(
          isNaN(num) ? 0 : num,
          this.#count.value - 1,
        ));
        break;
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
      case 'max-dots':
        this.#maxDots.value = Math.max(1, isNaN(num) ? 7 : num);
        break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Slide indicators');
    }

    this.setAttribute('aria-orientation',
      this.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal');


    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));
    this.addEffect(() => this.#render());
    this.addEffect(() => this.#syncDots());

    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeydown);
  }

  teardown(): void {
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('keydown', this.#onKeydown);
    this.#dotsEl = null;
    this.#indicator = null;
    this.#prevBtn = null;
    this.#nextBtn = null;
    this.textContent = '';
    super.teardown();
  }

  // ── Public methods ──

  prev(): void { this.#goTo(this.#active.value - 1); }
  next(): void { this.#goTo(this.#active.value + 1); }

  // ── Private ──

  #goTo(index: number): void {
    if (this.#disabled.value) return;
    const count = this.#count.value;
    if (count === 0) return;
    const clamped = Math.max(0, Math.min(index, count - 1));
    if (clamped === this.#active.value) return;
    this.active = clamped;
    this.dispatchEvent(new CustomEvent('native:change', {
      bubbles: true,
      composed: true,
      detail: { index: clamped },
    }));
  }

  #getVisibleRange(): { start: number; end: number } {
    const count = this.#count.value;
    const maxDots = this.#maxDots.value;
    if (count <= maxDots) return { start: 0, end: count - 1 };

    const active = this.#active.value;
    const half = Math.floor(maxDots / 2);
    let start = active - half;
    let end = start + maxDots - 1;

    if (start < 0) { start = 0; end = maxDots - 1; }
    if (end >= count) { end = count - 1; start = end - maxDots + 1; }

    return { start, end };
  }

  #createPaddle(iconName: string, label: string, part: string): HTMLElement {
    const btn = document.createElement('n-button');
    btn.setAttribute('variant', 'ghost');
    btn.setAttribute('aria-label', label);
    btn.setAttribute('part', part);
    const icon = document.createElement('n-icon');
    icon.setAttribute('name', iconName);
    btn.appendChild(icon);
    btn.addEventListener('native:press', () => {
      if (part === 'prev') this.prev();
      else this.next();
    });
    return btn;
  }

  #render(): void {
    const count = this.#count.value;
    const maxDots = this.#maxDots.value;
    const visibleCount = Math.min(count, maxDots);

    this.textContent = '';

    // Prev paddle
    this.#prevBtn = this.#createPaddle('caret-left', 'Previous', 'prev');
    this.appendChild(this.#prevBtn);

    // Dots wrapper (inline flow — not flex)
    this.#dotsEl = document.createElement('span');
    this.#dotsEl.setAttribute('part', 'dots');

    // WHY: Floating indicator (real DOM element, not ::before) so JS can set
    // --n-dot-index for CSS translateX(). Prepended so it sits behind dot buttons.
    this.#indicator = document.createElement('div');
    this.#indicator.className = 'n-dot-indicator';
    this.#dotsEl.appendChild(this.#indicator);

    for (let i = 0; i < visibleCount; i++) {
      const btn = document.createElement('button');
      btn.setAttribute('type', 'button');
      btn.setAttribute('role', 'tab');
      const span = document.createElement('span');
      btn.appendChild(span);
      this.#dotsEl.appendChild(btn);
    }

    this.appendChild(this.#dotsEl);

    // Next paddle
    this.#nextBtn = this.#createPaddle('caret-right', 'Next', 'next');
    this.appendChild(this.#nextBtn);
  }

  #syncDots(): void {
    const count = this.#count.value;
    const active = this.#active.value;
    const disabled = this.#disabled.value;
    const { start, end } = this.#getVisibleRange();

    const dots = this.#dotsEl?.querySelectorAll<HTMLButtonElement>('button[role="tab"]');
    if (!dots) return;

    dots.forEach((btn, i) => {
      const realIndex = start + i;
      btn.setAttribute('data-index', String(realIndex));
      btn.setAttribute('aria-label', `Go to slide ${realIndex + 1}`);
      btn.setAttribute('aria-selected', realIndex === active ? 'true' : 'false');
      btn.setAttribute('tabindex', realIndex === active ? '0' : '-1');

      // Edge dots: first/last visible when more dots exist beyond
      const isEdge = (i === 0 && start > 0) || (i === dots.length - 1 && end < count - 1);
      btn.toggleAttribute('data-edge', isEdge);
    });

    // Position floating indicator
    const visualIndex = active - start;
    if (visualIndex >= 0 && this.#dotsEl) {
      this.#dotsEl.style.setProperty('--n-dot-index', String(visualIndex));
      this.#internals.states.add('ready');
    } else {
      this.#internals.states.delete('ready');
    }

    // Paddle disabled state
    if (this.#prevBtn) {
      this.#prevBtn.toggleAttribute('disabled', disabled || active <= 0);
    }
    if (this.#nextBtn) {
      this.#nextBtn.toggleAttribute('disabled', disabled || active >= count - 1);
    }
  }

  #onClick = (e: Event): void => {
    const btn = (e.target as HTMLElement).closest('[data-index]') as HTMLElement | null;
    if (!btn) return;
    const idx = parseInt(btn.dataset.index ?? '', 10);
    if (!isNaN(idx)) this.#goTo(idx);
  };

  #onKeydown = (e: KeyboardEvent): void => {
    if (this.#disabled.value) return;
    const count = this.#count.value;
    if (count === 0) return;
    const current = this.#active.value;
    let next: number | null = null;

    const vertical = this.getAttribute('orientation') === 'vertical';
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft';

    switch (e.key) {
      case nextKey:
        e.preventDefault();
        next = (current + 1) % count;
        break;
      case prevKey:
        e.preventDefault();
        next = (current - 1 + count) % count;
        break;
      case 'Home':
        e.preventDefault();
        next = 0;
        break;
      case 'End':
        e.preventDefault();
        next = count - 1;
        break;
    }

    if (next !== null && next !== current) {
      this.#goTo(next);
      const target = this.querySelector<HTMLButtonElement>(`button[data-index="${next}"]`);
      target?.focus();
    }
  };
}
