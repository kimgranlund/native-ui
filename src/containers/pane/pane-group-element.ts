import { NativeElement } from '../../core/native-element.ts';
import type { NPane } from './pane-element.ts';

/**
 * Coordinated pane group with resize handles between children.
 * Stamps resize handles between visible `<n-pane>` children and manages
 * pointer-based coordinated resizing (one pane grows, adjacent shrinks).
 *
 * @attr {'horizontal'|'vertical'} orientation - Layout direction (default: horizontal)
 */
export class NPaneGroup extends NativeElement {
  static observedAttributes = ['orientation'];

  #handles: HTMLElement[] = [];
  #observer: MutationObserver | null = null;

  // Resize state
  #activeIndex = -1;
  #startSizes: number[] = [];
  #startPointer = 0;
  #panes: NPane[] = [];

  get orientation(): 'horizontal' | 'vertical' {
    return (this.getAttribute('orientation') as 'horizontal' | 'vertical') ?? 'horizontal';
  }

  setup(): void {
    super.setup();
    this.deferChildren(() => {
      this.#stampHandles();
    });

    // Watch for child additions/removals and hidden/minimized changes
    this.#observer = new MutationObserver(this.#onChildChange);
    this.#observer.observe(this, {
      childList: true,
      attributes: true,
      attributeFilter: ['hidden', 'minimized'],
      subtree: false,
    });
  }

  teardown(): void {
    this.#removeHandles();
    this.#observer?.disconnect();
    this.#observer = null;
    this.#cleanupResize();
    super.teardown();
  }

  attributeChangedCallback(name: string, _old: string | null, _val: string | null): void {
    if (name === 'orientation' && this.isConnected) {
      this.#stampHandles();
    }
  }

  /** Get visible, non-handle n-pane children. */
  #getVisiblePanes(): NPane[] {
    return Array.from(this.querySelectorAll<NPane>(':scope > n-pane:not([hidden])'));
  }

  #removeHandles(): void {
    for (const h of this.#handles) h.remove();
    this.#handles = [];
  }

  #stampHandles(): void {
    this.#removeHandles();
    this.#distributeSpace();

    const panes = this.#getVisiblePanes();
    if (panes.length < 2) return;

    // Insert a handle between each adjacent pair
    for (let i = 0; i < panes.length - 1; i++) {
      const handle = document.createElement('div');
      handle.className = 'pane-handle';
      handle.dataset.index = String(i);
      handle.addEventListener('pointerdown', this.#onPointerDown);
      // Insert handle after panes[i]
      panes[i].after(handle);
      this.#handles.push(handle);
    }
  }

  #distributeSpace(): void {
    const panes = this.#getVisiblePanes();
    for (const pane of panes) {
      if (!pane.hasAttribute('minimized')) {
        pane.style.removeProperty('flex');
        pane.style.removeProperty('flex-basis');
        pane.style.removeProperty('width');
        pane.style.removeProperty('height');
      }
    }
  }

  // ── Resize logic ──

  #onPointerDown = (e: PointerEvent): void => {
    const handle = e.currentTarget as HTMLElement;
    const index = Number(handle.dataset.index);
    if (isNaN(index)) return;

    e.preventDefault();
    handle.setPointerCapture(e.pointerId);

    this.#activeIndex = index;
    this.#panes = this.#getVisiblePanes();
    const isVertical = this.orientation === 'vertical';

    // Record start sizes
    this.#startSizes = this.#panes.map(p => {
      const rect = p.getBoundingClientRect();
      return isVertical ? rect.height : rect.width;
    });
    this.#startPointer = isVertical ? e.clientY : e.clientX;

    this.setAttribute('data-resizing', '');
    handle.setAttribute('data-active', '');

    handle.addEventListener('pointermove', this.#onPointerMove);
    handle.addEventListener('pointerup', this.#onPointerUp);
    handle.addEventListener('pointercancel', this.#onPointerCancel);
    handle.addEventListener('lostpointercapture', this.#onPointerUp);
    document.addEventListener('keydown', this.#onKeyDown);
  };

  #onPointerMove = (e: PointerEvent): void => {
    if (this.#activeIndex < 0) return;

    const isVertical = this.orientation === 'vertical';
    const pointer = isVertical ? e.clientY : e.clientX;
    const delta = pointer - this.#startPointer;

    const i = this.#activeIndex;
    const paneA = this.#panes[i];
    const paneB = this.#panes[i + 1];
    if (!paneA || !paneB) return;

    const startA = this.#startSizes[i];
    const startB = this.#startSizes[i + 1];

    // Clamp to min/max
    const minA = (paneA as NPane).minSize || 0;
    const maxA = (paneA as NPane).maxSize || Infinity;
    const minB = (paneB as NPane).minSize || 0;
    const maxB = (paneB as NPane).maxSize || Infinity;

    let newA = startA + delta;
    let newB = startB - delta;

    // Enforce constraints
    if (newA < minA) { newA = minA; newB = startA + startB - minA; }
    if (newA > maxA) { newA = maxA; newB = startA + startB - maxA; }
    if (newB < minB) { newB = minB; newA = startA + startB - minB; }
    if (newB > maxB) { newB = maxB; newA = startA + startB - maxB; }

    // Apply sizes
    const prop = isVertical ? 'height' : 'width';
    paneA.style.flex = 'none';
    paneA.style[prop] = `${newA}px`;
    paneB.style.flex = 'none';
    paneB.style[prop] = `${newB}px`;
  };

  #onPointerUp = (_e: PointerEvent | Event): void => {
    if (this.#activeIndex < 0) return;

    // Dispatch resize event with final sizes
    const isVertical = this.orientation === 'vertical';
    const sizes = this.#panes.map(p => {
      const rect = p.getBoundingClientRect();
      return isVertical ? rect.height : rect.width;
    });

    this.dispatchEvent(new CustomEvent('native:pane-resize', {
      bubbles: true,
      composed: true,
      detail: { sizes, index: this.#activeIndex },
    }));

    this.#cleanupResize();
  };

  #onPointerCancel = (): void => {
    this.#revertSizes();
    this.#cleanupResize();
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.#activeIndex >= 0) {
      e.preventDefault();
      this.#revertSizes();
      // Release pointer capture to end the drag
      const handle = this.#handles[this.#activeIndex];
      if (handle) {
        try { handle.releasePointerCapture(0); } catch { /* may not have capture */ }
      }
      this.#cleanupResize();
    }
  };

  #revertSizes(): void {
    const isVertical = this.orientation === 'vertical';
    const prop = isVertical ? 'height' : 'width';
    for (let i = 0; i < this.#panes.length; i++) {
      const pane = this.#panes[i];
      if (this.#startSizes[i] !== undefined) {
        pane.style.flex = 'none';
        pane.style[prop] = `${this.#startSizes[i]}px`;
      }
    }
  }

  #cleanupResize(): void {
    const handle = this.#activeIndex >= 0 ? this.#handles[this.#activeIndex] : null;
    if (handle) {
      handle.removeAttribute('data-active');
      handle.removeEventListener('pointermove', this.#onPointerMove);
      handle.removeEventListener('pointerup', this.#onPointerUp);
      handle.removeEventListener('pointercancel', this.#onPointerCancel);
      handle.removeEventListener('lostpointercapture', this.#onPointerUp);
    }
    document.removeEventListener('keydown', this.#onKeyDown);
    this.removeAttribute('data-resizing');
    this.#activeIndex = -1;
    this.#startSizes = [];
    this.#panes = [];
  }

  #pendingStamp = 0;

  #onChildChange = (): void => {
    // Debounce to handle batch DOM operations
    if (this.#pendingStamp) return;
    this.#pendingStamp = requestAnimationFrame(() => {
      this.#pendingStamp = 0;
      this.#stampHandles();
    });
  };
}
