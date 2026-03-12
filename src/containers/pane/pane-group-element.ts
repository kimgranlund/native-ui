import { NativeElement } from '@nonoun/native-core';
import type { NPane } from './pane-element.ts';

/**
 * Coordinated pane group with resize between children.
 * Hit-tests pointer position against pane boundaries — no handle elements.
 * Accent bar renders via ::after on the hovered pane (data-edge-near / data-edge-active).
 *
 * @attr {'horizontal'|'vertical'} orientation - Layout direction (default: horizontal)
 */
export class NPaneGroup extends NativeElement {
  static observedAttributes = ['orientation'];

  #observer: MutationObserver | null = null;

  // Hover state
  #hoverPane: HTMLElement | null = null;

  // Resize state
  #activeIndex = -1;
  #startRatios: number[] = [];
  #startPixels: number[] = [];
  #panes: HTMLElement[] = [];
  #startX = 0;
  #startY = 0;

  get orientation(): 'horizontal' | 'vertical' {
    return (this.getAttribute('orientation') as 'horizontal' | 'vertical') ?? 'horizontal';
  }

  setup(): void {
    super.setup();
    this.addEventListener('pointermove', this.#onHover);
    this.addEventListener('pointerleave', this.#onLeave);
    this.addEventListener('pointerdown', this.#onPointerDown);

    this.deferChildren(() => {
      this.#distributeSpace();
    });

    this.#observer = new MutationObserver(this.#onChildChange);
    this.#observer.observe(this, {
      childList: true,
      attributes: true,
      attributeFilter: ['hidden', 'minimized'],
      subtree: false,
    });
  }

  teardown(): void {
    this.removeEventListener('pointermove', this.#onHover);
    this.removeEventListener('pointerleave', this.#onLeave);
    this.removeEventListener('pointerdown', this.#onPointerDown);
    this.#clearHover();
    this.#cleanupDrag();
    this.#observer?.disconnect();
    this.#observer = null;
    super.teardown();
  }

  attributeChangedCallback(name: string, _old: string | null, _val: string | null): void {
    if (name === 'orientation' && this.isConnected) {
      this.#distributeSpace();
    }
  }

  /** Get visible direct children (panes). */
  #getVisibleChildren(): HTMLElement[] {
    return Array.from(this.children).filter(
      c => c instanceof HTMLElement && !c.hidden
    ) as HTMLElement[];
  }

  #getMinSize(el: HTMLElement): number {
    if ('minSize' in el) return (el as NPane).minSize;
    const v = el.getAttribute('data-size-min');
    return v ? Number(v) : 0;
  }

  #getMaxSize(el: HTMLElement): number {
    if ('maxSize' in el) return (el as NPane).maxSize;
    const v = el.getAttribute('data-size-max');
    return v ? Number(v) : Infinity;
  }

  #distributeSpace(): void {
    const panes = this.#getVisibleChildren();
    for (const pane of panes) {
      if (pane.hasAttribute('minimized')) continue;
      const size = pane.getAttribute('size');
      if (size && size !== 'auto') {
        pane.style.flex = `0 1 ${size}`;
      } else {
        pane.style.removeProperty('flex');
      }
      pane.style.removeProperty('flex-basis');
      pane.style.removeProperty('width');
      pane.style.removeProperty('height');
    }
  }

  // ── Boundary hit-testing ──

  /** Returns index of the boundary between pane[i] and pane[i+1] nearest to pointer, or -1. */
  #hitBoundary(clientX: number, clientY: number): number {
    const panes = this.#getVisibleChildren();
    if (panes.length < 2) return -1;
    const isVertical = this.orientation === 'vertical';
    const threshold = 8;

    for (let i = 0; i < panes.length - 1; i++) {
      const rect = panes[i].getBoundingClientRect();
      const edge = isVertical ? rect.bottom : rect.right;
      const pos = isVertical ? clientY : clientX;
      if (Math.abs(pos - edge) <= threshold) return i;
    }
    return -1;
  }

  // ── Hover ──

  #onHover = (e: PointerEvent): void => {
    if (this.#activeIndex >= 0) return;
    const index = this.#hitBoundary(e.clientX, e.clientY);
    const panes = this.#getVisibleChildren();

    if (index >= 0) {
      const pane = panes[index];
      if (this.#hoverPane !== pane) {
        this.#clearHover();
        const edge = this.orientation === 'vertical' ? 'bottom' : 'right';
        pane.setAttribute('data-edge-near', edge);
        this.#hoverPane = pane;
      }
      this.style.cursor = this.orientation === 'vertical' ? 'row-resize' : 'col-resize';
    } else {
      this.#clearHover();
      this.style.removeProperty('cursor');
    }
  };

  #onLeave = (): void => {
    if (this.#activeIndex >= 0) return;
    this.#clearHover();
    this.style.removeProperty('cursor');
  };

  #clearHover(): void {
    if (this.#hoverPane) {
      this.#hoverPane.removeAttribute('data-edge-near');
      this.#hoverPane = null;
    }
  }

  // ── Drag resize ──

  #onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    const index = this.#hitBoundary(e.clientX, e.clientY);
    if (index < 0) return;

    e.preventDefault();
    e.stopPropagation();
    this.#clearHover();

    this.#activeIndex = index;
    this.#panes = this.#getVisibleChildren();
    this.#startX = e.clientX;
    this.#startY = e.clientY;

    const isVertical = this.orientation === 'vertical';

    // Record start pixel sizes
    const pixels = this.#panes.map(p => {
      const rect = p.getBoundingClientRect();
      return isVertical ? rect.height : rect.width;
    });
    const totalPixels = pixels.reduce((sum, v) => sum + v, 0);
    const count = this.#panes.length;
    const ratios = pixels.map(px => (totalPixels > 0 ? (px / totalPixels) * count : 1));

    // Freeze all panes to current flex-grow ratio
    for (let i = 0; i < this.#panes.length; i++) {
      this.#panes[i].style.flex = `${ratios[i]} 1 0%`;
    }

    this.#startRatios = ratios;
    this.#startPixels = pixels;

    this.setAttribute('data-resizing', '');
    const edge = isVertical ? 'bottom' : 'right';
    this.#panes[index].setAttribute('data-edge-active', edge);
    this.style.cursor = isVertical ? 'row-resize' : 'col-resize';

    this.setPointerCapture(e.pointerId);
    document.addEventListener('pointermove', this.#onDragMove);
    document.addEventListener('pointerup', this.#onDragEnd);
    document.addEventListener('pointercancel', this.#onDragCancel);
    document.addEventListener('keydown', this.#onKeyDown);
  };

  #onDragMove = (e: PointerEvent): void => {
    if (this.#activeIndex < 0) return;

    const isVertical = this.orientation === 'vertical';
    const delta = isVertical
      ? e.clientY - this.#startY
      : e.clientX - this.#startX;

    const i = this.#activeIndex;
    const paneA = this.#panes[i];
    const paneB = this.#panes[i + 1];
    if (!paneA || !paneB) return;

    const startA = this.#startPixels[i];
    const startB = this.#startPixels[i + 1];
    const pairTotal = startA + startB;

    const minA = this.#getMinSize(paneA);
    const maxA = this.#getMaxSize(paneA);
    const minB = this.#getMinSize(paneB);
    const maxB = this.#getMaxSize(paneB);

    let newA = startA + delta;
    let newB = startB - delta;

    if (newA < minA) { newA = minA; newB = pairTotal - minA; }
    if (newA > maxA) { newA = maxA; newB = pairTotal - maxA; }
    if (newB < minB) { newB = minB; newA = pairTotal - minB; }
    if (newB > maxB) { newB = maxB; newA = pairTotal - maxB; }

    const pairRatio = this.#startRatios[i] + this.#startRatios[i + 1];
    const pairPixels = newA + newB;
    paneA.style.flex = `${(newA / pairPixels) * pairRatio} 1 0%`;
    paneB.style.flex = `${(newB / pairPixels) * pairRatio} 1 0%`;
  };

  #onDragEnd = (): void => {
    if (this.#activeIndex < 0) return;

    const isVertical = this.orientation === 'vertical';
    const sizes = this.#panes.map(p => {
      const rect = p.getBoundingClientRect();
      return isVertical ? rect.height : rect.width;
    });

    const ratios = this.#panes.map(p => {
      const flex = p.style.flex;
      const match = flex.match(/^([\d.]+)/);
      return match ? Number(match[1]) : 1;
    });

    this.dispatchEvent(new CustomEvent('native:pane-resize', {
      bubbles: true,
      composed: true,
      detail: { sizes, ratios, index: this.#activeIndex },
    }));

    this.#cleanupDrag();
  };

  #onDragCancel = (): void => {
    if (this.#activeIndex < 0) return;
    for (let i = 0; i < this.#panes.length; i++) {
      this.#panes[i].style.flex = `${this.#startRatios[i]} 1 0%`;
    }
    this.#cleanupDrag();
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.#activeIndex >= 0) {
      e.preventDefault();
      this.#onDragCancel();
    }
  };

  #cleanupDrag(): void {
    if (this.#activeIndex >= 0) {
      this.#panes[this.#activeIndex]?.removeAttribute('data-edge-active');
    }
    this.#activeIndex = -1;
    this.#startRatios = [];
    this.#startPixels = [];
    this.#panes = [];
    this.removeAttribute('data-resizing');
    this.style.removeProperty('cursor');
    document.removeEventListener('pointermove', this.#onDragMove);
    document.removeEventListener('pointerup', this.#onDragEnd);
    document.removeEventListener('pointercancel', this.#onDragCancel);
    document.removeEventListener('keydown', this.#onKeyDown);
  }

  #pendingDistribute = 0;

  #onChildChange = (): void => {
    if (this.#pendingDistribute) return;
    this.#pendingDistribute = requestAnimationFrame(() => {
      this.#pendingDistribute = 0;
      this.#distributeSpace();
    });
  };
}
