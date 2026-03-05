import { signal } from '../../reactivity/signal.ts';
import { NativeElement } from '../../core/native-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { uid } from '../../core/uid.ts';

/**
 * Carousel slideshow with snap scrolling, autoplay, controls, and indicators.
 * @attr {string} direction - Scroll direction: "horizontal" | "vertical"
 * @attr {boolean} controls - Shows prev/next navigation buttons
 * @attr {boolean} indicators - Shows dot indicators
 * @attr {boolean} autoplay - Enables automatic slide advancement
 * @attr {number} interval - Autoplay interval in milliseconds (default 5000)
 * @attr {boolean} loop - Enables infinite looping
 * @attr {boolean} peek - Shows partial adjacent slides
 * @attr {number} per-view - Number of slides visible at once
 * @attr {string} gap - Gap between slides
 * @attr {boolean} disabled - Disables keyboard navigation
 * @attr {number} index - Active slide index (0-based)
 * @fires native:slide-change - Fired when the active slide changes with `{ index, slide }` detail
 */
export class NSlideshow extends NativeElement {
  static observedAttributes = [
    'direction', 'controls', 'indicators', 'autoplay', 'interval',
    'loop', 'peek', 'per-view', 'gap', 'disabled', 'index',
  ];

  #track: HTMLElement | null = null;
  #indicatorsEl: HTMLElement | null = null;
  #prevBtn: HTMLButtonElement | null = null;
  #nextBtn: HTMLButtonElement | null = null;
  #liveRegion: HTMLElement | null = null;

  #activeIndex = signal(0);
  #slideCount = signal(0);
  #disabled = signal(false);

  #autoplayTimer: ReturnType<typeof setInterval> | null = null;
  #prefersReducedMotion: MediaQueryList | null = null;
  #observer: IntersectionObserver | null = null;
  #slides: HTMLElement[] = [];

  // Drag-to-scroll state
  #isDragging = false;
  #dragStartX = 0;
  #dragStartY = 0;
  #dragScrollLeft = 0;
  #dragScrollTop = 0;

  #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'region';
  }

  // ── Public API ──

  get index(): number {
    return this.#activeIndex.value;
  }

  set index(val: number) {
    this.goTo(val);
  }

  goTo(index: number): void {
    const count = this.#slides.length;
    if (count === 0) return;

    let target = index;
    if (this.hasAttribute('loop')) {
      target = ((index % count) + count) % count;
    } else {
      target = Math.max(0, Math.min(index, count - 1));
    }

    const slide = this.#slides[target];
    if (!slide) return;

    const isVertical = this.getAttribute('direction') === 'vertical';
    slide.scrollIntoView({
      block: isVertical ? 'start' : 'nearest',
      inline: isVertical ? 'nearest' : 'start',
    });
  }

  next(): void {
    this.goTo(this.#activeIndex.value + 1);
  }

  prev(): void {
    this.goTo(this.#activeIndex.value - 1);
  }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
      case 'per-view':
        this.#applyPerView(val);
        break;
      case 'autoplay':
        if (val !== null) this.#startAutoplay();
        else this.#stopAutoplay();
        break;
      case 'interval':
        // WHY: Restart autoplay with new interval if currently running
        if (this.hasAttribute('autoplay')) {
          this.#stopAutoplay();
          this.#startAutoplay();
        }
        break;
      case 'index': {
        const num = parseInt(val ?? '0', 10);
        if (!isNaN(num)) this.goTo(num);
        break;
      }
      case 'loop':
        // WHY: Update prev/next button disabled states when loop changes
        this.#syncControls(this.#activeIndex.value, this.#slideCount.value);
        break;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();
    this.#prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ── Stamp structural DOM ──

    const track = document.createElement('div');
    track.setAttribute('part', 'track');
    track.id = uid('ss-track');
    track.setAttribute('tabindex', '0');

    // Move all children into track
    const slides: HTMLElement[] = [];
    while (this.firstChild) {
      const child = this.firstChild;
      track.appendChild(child);
      if (child instanceof HTMLElement && child.tagName.toLowerCase() === 'n-slide') {
        slides.push(child);
      }
    }
    this.appendChild(track);
    this.#track = track;
    this.#slides = slides;

    if (__DEV__ && slides.length === 0) {
      console.warn('[n-slideshow] No <n-slide> children found.');
    }

    // Controls
    const controlsEl = document.createElement('div');
    controlsEl.setAttribute('part', 'controls');

    const prevBtn = document.createElement('button');
    prevBtn.setAttribute('part', 'prev');
    prevBtn.setAttribute('aria-label', 'Previous slide');
    prevBtn.setAttribute('type', 'button');
    prevBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z" fill="currentColor"/></svg>';

    const nextBtn = document.createElement('button');
    nextBtn.setAttribute('part', 'next');
    nextBtn.setAttribute('aria-label', 'Next slide');
    nextBtn.setAttribute('type', 'button');
    nextBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z" fill="currentColor"/></svg>';

    controlsEl.appendChild(prevBtn);
    controlsEl.appendChild(nextBtn);
    this.appendChild(controlsEl);
    this.#prevBtn = prevBtn;
    this.#nextBtn = nextBtn;

    // Indicators (n-pagination-dots component)
    const indicatorsEl = document.createElement('n-pagination-dots');
    indicatorsEl.setAttribute('part', 'indicators');
    indicatorsEl.setAttribute('variant', 'plain');
    this.appendChild(indicatorsEl);
    this.#indicatorsEl = indicatorsEl;

    // Live region
    const liveRegion = document.createElement('div');
    liveRegion.id = uid('ss-live');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('data-visually-hidden', '');
    this.appendChild(liveRegion);
    this.#liveRegion = liveRegion;

    // ARIA
    this.setAttribute('aria-roledescription', 'carousel');
    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Slideshow');
    }

    // Per-view CSS variable
    this.#applyPerView(this.getAttribute('per-view'));

    // Wire slides
    this.#slideCount.value = slides.length;
    this.#wireSlideAria(slides);
    indicatorsEl.setAttribute('count', String(slides.length));
    indicatorsEl.setAttribute('active', '0');
    this.#setupObserver(slides);

    // Activate first slide
    if (slides.length > 0) {
      slides[0].toggleAttribute('active', true);
    }

    // Effect: sync indicators + controls + live region
    this.addEffect(() => {
      const idx = this.#activeIndex.value;
      const count = this.#slideCount.value;
      if (this.#indicatorsEl) this.#indicatorsEl.setAttribute('active', String(idx));
      this.#syncControls(idx, count);
      if (this.#liveRegion) {
        this.#liveRegion.textContent = `Slide ${idx + 1} of ${count}`;
      }
    });

    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));

    // Events
    indicatorsEl.addEventListener('native:change', this.#onIndicatorChange);
    prevBtn.addEventListener('click', this.#onPrev);
    nextBtn.addEventListener('click', this.#onNext);
    track.addEventListener('keydown', this.#onKeydown);
    track.addEventListener('pointerdown', this.#onDragStart);
    this.addEventListener('mouseenter', this.#onPause);
    this.addEventListener('mouseleave', this.#onResume);
    this.addEventListener('focusin', this.#onPause);
    this.addEventListener('focusout', this.#onResume);

    // Autoplay
    if (this.hasAttribute('autoplay')) {
      this.#startAutoplay();
    }
  }

  teardown(): void {
    this.#stopAutoplay();
    this.#observer?.disconnect();
    this.#observer = null;
    this.#prevBtn?.removeEventListener('click', this.#onPrev);
    this.#nextBtn?.removeEventListener('click', this.#onNext);
    this.#track?.removeEventListener('keydown', this.#onKeydown);
    this.#track?.removeEventListener('pointerdown', this.#onDragStart);
    this.removeEventListener('mouseenter', this.#onPause);
    this.removeEventListener('mouseleave', this.#onResume);
    this.removeEventListener('focusin', this.#onPause);
    this.removeEventListener('focusout', this.#onResume);
    this.#track = null;
    this.#indicatorsEl?.removeEventListener('native:change', this.#onIndicatorChange);
    this.#indicatorsEl = null;
    this.#prevBtn = null;
    this.#nextBtn = null;
    this.#liveRegion = null;
    this.#slides = [];
    super.teardown();
  }

  // ── Private ──

  #applyPerView(val: string | null): void {
    const n = Math.max(1, parseInt(val ?? '1', 10) || 1);
    this.style.setProperty('--n-per-view', String(n));
  }

  #wireSlideAria(slides: HTMLElement[]): void {
    const count = slides.length;
    for (let i = 0; i < count; i++) {
      const slide = slides[i];
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${i + 1} of ${count}`);
      if (!slide.id) slide.id = uid('slide');
    }
  }

  #onIndicatorChange = (e: Event): void => {
    const { index } = (e as CustomEvent).detail;
    // WHY: stopImmediatePropagation prevents n-pagination-dots's native:change from reaching
    // external listeners — slideshow re-dispatches its own native:slide-change instead.
    e.stopImmediatePropagation();
    this.#stopAutoplay();
    this.goTo(index);
  };

  #setupObserver(slides: HTMLElement[]): void {
    const track = this.#track;
    if (!track || slides.length === 0) return;

    this.#observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const slide = entry.target as HTMLElement;
            const idx = this.#slides.indexOf(slide);
            if (idx !== -1 && idx !== this.#activeIndex.value) {
              this.#activeIndex.value = idx;
              this.#slides.forEach((s, i) => s.toggleAttribute('active', i === idx));
              this.dispatchEvent(new CustomEvent('native:slide-change', {
                bubbles: true,
                composed: true,
                detail: { index: idx, slide },
              }));
            }
          }
        }
      },
      { root: track, threshold: 0.5 },
    );

    for (const slide of slides) {
      this.#observer.observe(slide);
    }
  }

  #syncControls(activeIndex: number, count: number): void {
    if (!this.#prevBtn || !this.#nextBtn) return;
    const loop = this.hasAttribute('loop');
    this.#prevBtn.disabled = !loop && activeIndex === 0;
    this.#nextBtn.disabled = !loop && activeIndex === count - 1;
  }

  #startAutoplay(): void {
    if (this.#prefersReducedMotion?.matches) return;
    this.#stopAutoplay();
    const ms = parseInt(this.getAttribute('interval') ?? '5000', 10) || 5000;
    this.#autoplayTimer = setInterval(() => this.next(), ms);
  }

  #stopAutoplay(): void {
    if (this.#autoplayTimer !== null) {
      clearInterval(this.#autoplayTimer);
      this.#autoplayTimer = null;
    }
  }

  // ── Event handlers ──

  #onPrev = (): void => {
    this.#stopAutoplay();
    this.prev();
  };

  #onNext = (): void => {
    this.#stopAutoplay();
    this.next();
  };

  #onPause = (): void => {
    if (this.#autoplayTimer !== null) {
      clearInterval(this.#autoplayTimer);
      this.#autoplayTimer = null;
    }
  };

  #onResume = (): void => {
    if (this.hasAttribute('autoplay') && !this.#prefersReducedMotion?.matches && this.#autoplayTimer === null) {
      this.#startAutoplay();
    }
  };

  // ── Drag-to-scroll ──

  #onDragStart = (e: PointerEvent): void => {
    // Only handle primary button (mouse left) and ignore touch (native scroll handles it)
    if (e.button !== 0 || e.pointerType === 'touch') return;
    const track = this.#track;
    if (!track) return;

    this.#isDragging = true;
    this.#dragStartX = e.clientX;
    this.#dragStartY = e.clientY;
    this.#dragScrollLeft = track.scrollLeft;
    this.#dragScrollTop = track.scrollTop;

    // Disable smooth scrolling during drag for immediate feedback
    track.style.scrollBehavior = 'auto';
    track.style.scrollSnapType = 'none';
    track.setPointerCapture(e.pointerId);
    track.setAttribute('data-dragging', '');

    track.addEventListener('pointermove', this.#onDragMove);
    track.addEventListener('pointerup', this.#onDragEnd);
    track.addEventListener('pointercancel', this.#onDragEnd);
  };

  #onDragMove = (e: PointerEvent): void => {
    if (!this.#isDragging || !this.#track) return;
    e.preventDefault();
    const isVertical = this.getAttribute('direction') === 'vertical';
    if (isVertical) {
      const dy = e.clientY - this.#dragStartY;
      this.#track.scrollTop = this.#dragScrollTop - dy;
    } else {
      const dx = e.clientX - this.#dragStartX;
      this.#track.scrollLeft = this.#dragScrollLeft - dx;
    }
  };

  #onDragEnd = (e: PointerEvent): void => {
    if (!this.#isDragging || !this.#track) return;
    this.#isDragging = false;
    this.#track.releasePointerCapture(e.pointerId);
    this.#track.removeAttribute('data-dragging');
    this.#track.removeEventListener('pointermove', this.#onDragMove);
    this.#track.removeEventListener('pointerup', this.#onDragEnd);
    this.#track.removeEventListener('pointercancel', this.#onDragEnd);

    // Re-enable smooth scrolling and snap — browser will snap to nearest slide
    this.#track.style.scrollBehavior = '';
    this.#track.style.scrollSnapType = '';
  };

  #onKeydown = (e: KeyboardEvent): void => {
    if (this.#disabled.value) return;
    const isVertical = this.getAttribute('direction') === 'vertical';

    switch (e.key) {
      case isVertical ? 'ArrowDown' : 'ArrowRight':
        e.preventDefault();
        this.next();
        break;
      case isVertical ? 'ArrowUp' : 'ArrowLeft':
        e.preventDefault();
        this.prev();
        break;
      case 'Home':
        e.preventDefault();
        this.goTo(0);
        break;
      case 'End':
        e.preventDefault();
        this.goTo(this.#slideCount.value - 1);
        break;
    }
  };
}
