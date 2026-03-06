export interface MagnetOptions {
  /** CSS selector for draggable items within host (default ':scope > *') */
  selector?: string;
  /** Snap threshold distance in px — how close before snapping (default 20) */
  threshold?: number;
  /** Snap to grid size in px — 0 means snap to other elements only (default 0) */
  gridSize?: number;
  /** Snap strength 0-1 — how aggressively it pulls (default 0.3) */
  strength?: number;
  /** Show guide lines when snapping (default true) */
  guides?: boolean;
  /** Guide line color (default 'var(--n-color-accent-500)') */
  guideColor?: string;
  /** Enable snap to container edges (default true) */
  snapToEdges?: boolean;
  /** Enable snap to sibling element edges/centers (default true) */
  snapToSiblings?: boolean;
  /** Disable the controller */
  disabled?: boolean;
}

interface DragState {
  item: HTMLElement;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  pointerId: number;
}

interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  snapType: 'grid' | 'edge' | 'sibling' | null;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

/** Snap elements toward each other or to a grid when dragged within a threshold distance. */
export class MagnetController {
  readonly host: HTMLElement;
  selector: string;
  threshold: number;
  gridSize: number;
  strength: number;
  guides: boolean;
  guideColor: string;
  snapToEdges: boolean;
  snapToSiblings: boolean;
  disabled: boolean;

  #attached = false;
  #dragState: DragState | null = null;
  #guideElements: HTMLElement[] = [];

  constructor(host: HTMLElement, options: MagnetOptions = {}) {
    this.host = host;
    this.selector = options.selector ?? ':scope > *';
    this.threshold = options.threshold ?? 20;
    this.gridSize = options.gridSize ?? 0;
    this.strength = options.strength ?? 0.3;
    this.guides = options.guides ?? true;
    this.guideColor = options.guideColor ?? 'var(--n-color-accent-500)';
    this.snapToEdges = options.snapToEdges ?? true;
    this.snapToSiblings = options.snapToSiblings ?? true;
    this.disabled = options.disabled ?? false;
    this.attach();
  }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener('pointerdown', this.#onPointerDown);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('pointerdown', this.#onPointerDown);
    if (this.#dragState) {
      this.host.removeEventListener('pointermove', this.#onPointerMove);
      this.host.removeEventListener('pointerup', this.#onPointerUp);
      this.host.removeEventListener('pointercancel', this.#onPointerCancel);
      this.#dragState = null;
    }
  }

  destroy(): void {
    this.#removeGuides();
    this.detach();
  }

  // ── Pointer handlers (arrow functions for auto-bind) ──

  #onPointerDown = (e: PointerEvent): void => {
    if (this.disabled || e.button !== 0) return;
    if (e.pointerType === 'touch' && !e.isPrimary) return;

    // Delegate to matching item
    const item = this.#findItem(e.target as HTMLElement);
    if (!item) return;

    this.host.setPointerCapture(e.pointerId);
    this.host.toggleAttribute('magnetized', true);
    item.style.willChange = 'transform';

    // Parse current translate to get starting position
    const { tx, ty } = this.#parseTranslate(item);

    this.#dragState = {
      item,
      startX: tx,
      startY: ty,
      offsetX: e.clientX - tx,
      offsetY: e.clientY - ty,
      pointerId: e.pointerId,
    };

    this.host.addEventListener('pointermove', this.#onPointerMove);
    this.host.addEventListener('pointerup', this.#onPointerUp);
    this.host.addEventListener('pointercancel', this.#onPointerCancel);
  };

  #onPointerMove = (e: PointerEvent): void => {
    const state = this.#dragState;
    if (!state) return;

    // Proposed raw position
    let proposedX = e.clientX - state.offsetX;
    let proposedY = e.clientY - state.offsetY;

    // Calculate snap
    const snap = this.#calculateSnap(state.item, proposedX, proposedY);

    // Interpolate toward snap point using strength
    if (snap.snappedX) proposedX += (snap.x - proposedX) * this.strength;
    if (snap.snappedY) proposedY += (snap.y - proposedY) * this.strength;

    // Apply position
    state.item.style.translate = `${proposedX}px ${proposedY}px`;

    // Update guides
    if (this.guides) {
      this.#updateGuides(snap);
    }

    // Set snapping attribute
    state.item.toggleAttribute('magnet-snapping', snap.snappedX || snap.snappedY);

    // Dispatch snap event
    if (snap.snappedX || snap.snappedY) {
      let axis: 'x' | 'y' | 'both' = 'both';
      if (snap.snappedX && !snap.snappedY) axis = 'x';
      else if (!snap.snappedX && snap.snappedY) axis = 'y';

      this.host.dispatchEvent(new CustomEvent('native:magnet-snap', {
        bubbles: true,
        composed: true,
        detail: {
          item: state.item,
          x: proposedX,
          y: proposedY,
          snappedTo: snap.snapType,
          axis,
        },
      }));
    }
  };

  #onPointerUp = (e: PointerEvent): void => {
    const state = this.#dragState;
    if (!state) return;

    // Parse final position from style
    const { tx, ty } = this.#parseTranslate(state.item);

    // Cleanup
    this.#cleanupTracking(e);

    state.item.removeAttribute('magnet-snapping');
    state.item.style.willChange = '';

    this.host.dispatchEvent(new CustomEvent('native:magnet-drop', {
      bubbles: true,
      composed: true,
      detail: { item: state.item, x: tx, y: ty },
    }));
  };

  #onPointerCancel = (e: PointerEvent): void => {
    const state = this.#dragState;
    if (state) {
      state.item.removeAttribute('magnet-snapping');
      state.item.style.willChange = '';
    }
    this.#cleanupTracking(e);
  };

  // ── Internals ──

  #findItem(target: HTMLElement): HTMLElement | null {
    const items = this.host.querySelectorAll(this.selector);
    for (const item of items) {
      if (item === target || item.contains(target)) return item as HTMLElement;
    }
    return null;
  }

  #parseTranslate(el: HTMLElement): { tx: number; ty: number } {
    const val = el.style.translate;
    if (!val) return { tx: 0, ty: 0 };
    const parts = val.match(/-?[\d.]+/g);
    if (!parts) return { tx: 0, ty: 0 };
    return { tx: parseFloat(parts[0]) || 0, ty: parseFloat(parts[1]) || 0 };
  }

  #calculateSnap(item: HTMLElement, proposedX: number, proposedY: number): SnapResult {
    const result: SnapResult = { x: proposedX, y: proposedY, snappedX: false, snappedY: false, snapType: null };
    let bestDistX = this.threshold;
    let bestDistY = this.threshold;

    // Grid snap
    if (this.gridSize > 0) {
      const snapX = Math.round(proposedX / this.gridSize) * this.gridSize;
      const snapY = Math.round(proposedY / this.gridSize) * this.gridSize;
      const distX = Math.abs(proposedX - snapX);
      const distY = Math.abs(proposedY - snapY);

      if (distX < bestDistX) {
        result.x = snapX;
        result.snappedX = true;
        bestDistX = distX;
        result.snapType = 'grid';
      }
      if (distY < bestDistY) {
        result.y = snapY;
        result.snappedY = true;
        bestDistY = distY;
        result.snapType = 'grid';
      }
    }

    // Sibling snap
    if (this.snapToSiblings) {
      const itemRect = this.#getItemRect(item, proposedX, proposedY);
      const siblings = this.host.querySelectorAll(this.selector);

      for (const sibling of siblings) {
        if (sibling === item) continue;
        const sibEl = sibling as HTMLElement;
        const sibRect = this.#getElementRect(sibEl);

        // Check left/right/center-x edges
        const edgesX = [sibRect.left, sibRect.right, sibRect.centerX];
        const itemEdgesX = [itemRect.left, itemRect.right, itemRect.centerX];

        for (const sibEdge of edgesX) {
          for (const itemEdge of itemEdgesX) {
            const dist = Math.abs(itemEdge - sibEdge);
            if (dist < bestDistX) {
              bestDistX = dist;
              result.x = proposedX + (sibEdge - itemEdge);
              result.snappedX = true;
              result.snapType = 'sibling';
            }
          }
        }

        // Check top/bottom/center-y edges
        const edgesY = [sibRect.top, sibRect.bottom, sibRect.centerY];
        const itemEdgesY = [itemRect.top, itemRect.bottom, itemRect.centerY];

        for (const sibEdge of edgesY) {
          for (const itemEdge of itemEdgesY) {
            const dist = Math.abs(itemEdge - sibEdge);
            if (dist < bestDistY) {
              bestDistY = dist;
              result.y = proposedY + (sibEdge - itemEdge);
              result.snappedY = true;
              result.snapType = 'sibling';
            }
          }
        }
      }
    }

    // Edge snap (container edges)
    if (this.snapToEdges) {
      const hostRect = this.host.getBoundingClientRect();
      const itemRect = this.#getItemRect(item, proposedX, proposedY);

      // Left edge
      const distLeft = Math.abs(itemRect.left - hostRect.left);
      if (distLeft < bestDistX) {
        bestDistX = distLeft;
        result.x = proposedX + (hostRect.left - itemRect.left);
        result.snappedX = true;
        result.snapType = 'edge';
      }
      // Right edge
      const distRight = Math.abs(itemRect.right - hostRect.right);
      if (distRight < bestDistX) {
        bestDistX = distRight;
        result.x = proposedX + (hostRect.right - itemRect.right);
        result.snappedX = true;
        result.snapType = 'edge';
      }
      // Top edge
      const distTop = Math.abs(itemRect.top - hostRect.top);
      if (distTop < bestDistY) {
        bestDistY = distTop;
        result.y = proposedY + (hostRect.top - itemRect.top);
        result.snappedY = true;
        result.snapType = 'edge';
      }
      // Bottom edge
      if (Math.abs(itemRect.bottom - hostRect.bottom) < bestDistY) {
        result.y = proposedY + (hostRect.bottom - itemRect.bottom);
        result.snappedY = true;
        result.snapType = 'edge';
      }
    }

    return result;
  }

  /** Get item rect based on proposed translate position */
  #getItemRect(item: HTMLElement, proposedX: number, proposedY: number): Rect {
    const base = item.getBoundingClientRect();
    const { tx, ty } = this.#parseTranslate(item);
    // Adjust: base rect is at current translate; we want it at proposed translate
    const dx = proposedX - tx;
    const dy = proposedY - ty;
    const left = base.left + dx;
    const top = base.top + dy;
    const right = base.right + dx;
    const bottom = base.bottom + dy;
    return {
      left,
      top,
      right,
      bottom,
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2,
    };
  }

  #getElementRect(el: HTMLElement): Rect {
    const r = el.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
      centerX: (r.left + r.right) / 2,
      centerY: (r.top + r.bottom) / 2,
    };
  }

  #updateGuides(snap: SnapResult): void {
    this.#removeGuides();

    if (!snap.snappedX && !snap.snappedY) return;

    const hostRect = this.host.getBoundingClientRect();

    if (snap.snappedX) {
      const guide = document.createElement('div');
      guide.style.cssText = `position:absolute;top:0;bottom:0;width:1px;background:${this.guideColor};pointer-events:none;z-index:999;`;
      guide.style.left = `${snap.x - hostRect.left + this.host.scrollLeft}px`;
      guide.setAttribute('data-magnet-guide', 'x');
      this.host.appendChild(guide);
      this.#guideElements.push(guide);
    }

    if (snap.snappedY) {
      const guide = document.createElement('div');
      guide.style.cssText = `position:absolute;left:0;right:0;height:1px;background:${this.guideColor};pointer-events:none;z-index:999;`;
      guide.style.top = `${snap.y - hostRect.top + this.host.scrollTop}px`;
      guide.setAttribute('data-magnet-guide', 'y');
      this.host.appendChild(guide);
      this.#guideElements.push(guide);
    }
  }

  #removeGuides(): void {
    for (const g of this.#guideElements) g.remove();
    this.#guideElements = [];
  }

  #cleanupTracking(e: PointerEvent): void {
    this.#dragState = null;
    this.host.removeEventListener('pointermove', this.#onPointerMove);
    this.host.removeEventListener('pointerup', this.#onPointerUp);
    this.host.removeEventListener('pointercancel', this.#onPointerCancel);
    this.#removeGuides();
    this.host.removeAttribute('magnetized');
    try { this.host.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  }
}
