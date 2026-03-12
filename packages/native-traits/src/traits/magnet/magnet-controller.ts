export interface MagnetOptions {
  /** CSS selector for draggable items within host (default ':scope > *') */
  selector?: string;
  /** Snap threshold distance in px — how close before snapping (default 20) */
  threshold?: number;
  /** Snap to grid size in px — 0 means snap to other elements only (default 0) */
  gridSize?: number;
  /** Snap strength 0-1 — 1 is instant snap, lower values ease toward snap point (default 1) */
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
  offsetX: number;
  offsetY: number;
  pointerId: number;
  snapping: boolean;
}

interface SnapAxis {
  /** Adjusted translate value */
  translate: number;
  /** Host-relative position for the guide line (null = no guide) */
  guidePos: number | null;
  /** What the item snapped to */
  snapType: 'grid' | 'edge' | 'sibling';
  /** When true, show guide only — do not adjust position */
  guideOnly?: boolean;
}

interface SnapResult {
  x: SnapAxis | null;
  y: SnapAxis | null;
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
  #scale = 1;

  constructor(host: HTMLElement, options: MagnetOptions = {}) {
    this.host = host;
    this.selector = options.selector ?? ':scope > *';
    this.threshold = options.threshold ?? 20;
    this.gridSize = options.gridSize ?? 0;
    this.strength = options.strength ?? 1;
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
    this.#endDrag();
  }

  destroy(): void {
    this.#removeGuides();
    this.detach();
  }

  // ── Pointer handlers (arrow functions for auto-bind) ──

  #onPointerDown = (e: PointerEvent): void => {
    if (this.disabled || e.button !== 0) return;
    if (e.pointerType === 'touch' && !e.isPrimary) return;

    const item = this.#findItem(e.target as HTMLElement);
    if (!item) return;

    e.preventDefault();
    this.host.setPointerCapture(e.pointerId);
    this.host.toggleAttribute('magnetized', true);
    item.style.willChange = 'translate';

    // Detect CSS transform scale on host (e.g. zoomed-out canvas)
    const hostRect = this.host.getBoundingClientRect();
    const clientW = this.host.clientWidth;
    this.#scale = (clientW && hostRect.width) ? hostRect.width / clientW : 1;

    const { tx, ty } = this.#parseTranslate(item);

    // Store offset in local (unscaled) coordinate space
    this.#dragState = {
      item,
      offsetX: e.clientX / this.#scale - tx,
      offsetY: e.clientY / this.#scale - ty,
      pointerId: e.pointerId,
      snapping: false,
    };

    this.host.addEventListener('pointermove', this.#onPointerMove);
    this.host.addEventListener('pointerup', this.#onPointerUp);
    this.host.addEventListener('pointercancel', this.#onPointerCancel);
  };

  #onPointerMove = (e: PointerEvent): void => {
    const state = this.#dragState;
    if (!state) return;

    // Raw desired translate from pointer delta (converted to local space)
    const rawTx = e.clientX / this.#scale - state.offsetX;
    const rawTy = e.clientY / this.#scale - state.offsetY;

    // Calculate snap
    const snap = this.#calculateSnap(state.item, rawTx, rawTy);

    // Apply — interpolate with strength (1 = instant snap), skip guide-only axes
    let finalTx = rawTx;
    let finalTy = rawTy;

    if (snap.x && !snap.x.guideOnly) finalTx = rawTx + (snap.x.translate - rawTx) * this.strength;
    if (snap.y && !snap.y.guideOnly) finalTy = rawTy + (snap.y.translate - rawTy) * this.strength;

    state.item.style.translate = `${finalTx}px ${finalTy}px`;

    // Snapping state (only real snaps, not guide-only)
    const isSnapping = (snap.x !== null && !snap.x.guideOnly) || (snap.y !== null && !snap.y.guideOnly);
    state.item.toggleAttribute('magnet-snapping', isSnapping);

    // Guides (positioned at the snap line in local coordinate space)
    if (this.guides) {
      this.#removeGuides();
      if (snap.x?.guidePos != null) this.#addGuide('x', snap.x.guidePos / this.#scale);
      if (snap.y?.guidePos != null) this.#addGuide('y', snap.y.guidePos / this.#scale);
    }

    // Edge-triggered snap event (only on snap enter)
    if (isSnapping && !state.snapping) {
      const snappedX = snap.x !== null;
      const snappedY = snap.y !== null;
      let axis: 'x' | 'y' | 'both' = 'both';
      if (snappedX && !snappedY) axis = 'x';
      else if (!snappedX && snappedY) axis = 'y';

      this.host.dispatchEvent(new CustomEvent('native:magnet-snap', {
        bubbles: true,
        composed: true,
        detail: {
          item: state.item,
          x: finalTx,
          y: finalTy,
          snappedTo: (snap.x ?? snap.y)!.snapType,
          axis,
        },
      }));
    }
    state.snapping = isSnapping;
  };

  #onPointerUp = (e: PointerEvent): void => {
    const state = this.#dragState;
    if (!state) return;

    const { tx, ty } = this.#parseTranslate(state.item);
    const item = state.item;

    // Cleanup before dispatching (prevents leaks if handler navigates)
    item.removeAttribute('magnet-snapping');
    item.style.willChange = '';
    this.#endDrag(e);

    this.host.dispatchEvent(new CustomEvent('native:magnet-drop', {
      bubbles: true,
      composed: true,
      detail: { item, x: tx, y: ty },
    }));
  };

  #onPointerCancel = (e: PointerEvent): void => {
    const state = this.#dragState;
    if (state) {
      state.item.removeAttribute('magnet-snapping');
      state.item.style.willChange = '';
    }
    this.#endDrag(e);
  };

  // ── Snap calculation ──

  #calculateSnap(item: HTMLElement, rawTx: number, rawTy: number): SnapResult {
    const hostRect = this.host.getBoundingClientRect();
    const projected = this.#projectItemRect(item, rawTx, rawTy);

    // Scale threshold to client space — getBoundingClientRect values are scaled,
    // so compare against scaled threshold for consistent snap distance on screen
    const scaledThreshold = this.threshold * this.#scale;

    let bestX: SnapAxis | null = null;
    let bestY: SnapAxis | null = null;
    let bestDistX = scaledThreshold;
    let bestDistY = scaledThreshold;

    // All distance comparisons happen in client (screen) space via getBoundingClientRect.
    // Translate adjustments convert back to local space by dividing by scale.
    const s = this.#scale;

    // Grid snap (in host-relative space so all items share the same grid)
    if (this.gridSize > 0) {
      const itemLeftInHost = projected.left - hostRect.left;
      const itemTopInHost = projected.top - hostRect.top;

      // gridSize is in local space — scale to client space for comparison
      const scaledGrid = this.gridSize * s;
      const snappedLeft = Math.round(itemLeftInHost / scaledGrid) * scaledGrid;
      const snappedTop = Math.round(itemTopInHost / scaledGrid) * scaledGrid;

      const distX = Math.abs(itemLeftInHost - snappedLeft);
      const distY = Math.abs(itemTopInHost - snappedTop);

      if (distX < bestDistX) {
        bestDistX = distX;
        bestX = {
          translate: rawTx + (snappedLeft - itemLeftInHost) / s,
          guidePos: snappedLeft,
          snapType: 'grid',
        };
      }
      if (distY < bestDistY) {
        bestDistY = distY;
        bestY = {
          translate: rawTy + (snappedTop - itemTopInHost) / s,
          guidePos: snappedTop,
          snapType: 'grid',
        };
      }
    }

    // Sibling detection (for snap and/or guide-only)
    if (this.snapToSiblings || this.guides) {
      const siblingGuideOnly = !this.snapToSiblings;
      const siblings = this.host.querySelectorAll(this.selector);

      for (const sibling of siblings) {
        if (sibling === item) continue;
        const sibRect = (sibling as HTMLElement).getBoundingClientRect();

        // X edges: item left/right/center vs sibling left/right/center
        const itemEdgesX = [projected.left, projected.right, projected.centerX];
        const sibEdgesX = [sibRect.left, sibRect.right, (sibRect.left + sibRect.right) / 2];

        for (const sibEdge of sibEdgesX) {
          for (const itemEdge of itemEdgesX) {
            const dist = Math.abs(itemEdge - sibEdge);
            if (dist < bestDistX) {
              bestDistX = dist;
              bestX = {
                translate: rawTx + (sibEdge - itemEdge) / s,
                guidePos: sibEdge - hostRect.left,
                snapType: 'sibling',
                guideOnly: siblingGuideOnly,
              };
            }
          }
        }

        // Y edges
        const itemEdgesY = [projected.top, projected.bottom, projected.centerY];
        const sibEdgesY = [sibRect.top, sibRect.bottom, (sibRect.top + sibRect.bottom) / 2];

        for (const sibEdge of sibEdgesY) {
          for (const itemEdge of itemEdgesY) {
            const dist = Math.abs(itemEdge - sibEdge);
            if (dist < bestDistY) {
              bestDistY = dist;
              bestY = {
                translate: rawTy + (sibEdge - itemEdge) / s,
                guidePos: sibEdge - hostRect.top,
                snapType: 'sibling',
                guideOnly: siblingGuideOnly,
              };
            }
          }
        }
      }
    }

    // Edge detection (for snap and/or guide-only)
    if (this.snapToEdges || this.guides) {
      const edgeGuideOnly = !this.snapToEdges;
      // Left edge
      const distLeft = Math.abs(projected.left - hostRect.left);
      if (distLeft < bestDistX) {
        bestDistX = distLeft;
        bestX = {
          translate: rawTx + (hostRect.left - projected.left) / s,
          guidePos: 0,
          snapType: 'edge',
          guideOnly: edgeGuideOnly,
        };
      }
      // Right edge
      const distRight = Math.abs(projected.right - hostRect.right);
      if (distRight < bestDistX) {
        bestDistX = distRight;
        bestX = {
          translate: rawTx + (hostRect.right - projected.right) / s,
          guidePos: hostRect.width,
          snapType: 'edge',
          guideOnly: edgeGuideOnly,
        };
      }
      // Top edge
      const distTop = Math.abs(projected.top - hostRect.top);
      if (distTop < bestDistY) {
        bestDistY = distTop;
        bestY = {
          translate: rawTy + (hostRect.top - projected.top) / s,
          guidePos: 0,
          snapType: 'edge',
          guideOnly: edgeGuideOnly,
        };
      }
      // Bottom edge
      const distBottom = Math.abs(projected.bottom - hostRect.bottom);
      if (distBottom < bestDistY) {
        bestDistY = distBottom; // suppress unused: bestDistY is the running minimum
        bestY = {
          translate: rawTy + (hostRect.bottom - projected.bottom) / s,
          guidePos: hostRect.height,
          snapType: 'edge',
          guideOnly: edgeGuideOnly,
        };
      }
    }

    // suppress unused — bestDistX/Y are running minimums used in comparisons
    void bestDistX;
    void bestDistY;

    return { x: bestX, y: bestY };
  }

  // ── Helpers ──

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

  /** Project where the item WOULD be at the proposed translate values (returns client-space rect). */
  #projectItemRect(item: HTMLElement, proposedTx: number, proposedTy: number) {
    const base = item.getBoundingClientRect();
    const { tx, ty } = this.#parseTranslate(item);
    // Delta is in local space — scale to client space for getBoundingClientRect comparison
    const dx = (proposedTx - tx) * this.#scale;
    const dy = (proposedTy - ty) * this.#scale;
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

  #addGuide(axis: 'x' | 'y', hostRelativePos: number): void {
    const guide = document.createElement('div');
    guide.setAttribute('data-magnet-guide', axis);
    guide.style.pointerEvents = 'none';
    guide.style.position = 'absolute';

    if (axis === 'x') {
      guide.style.cssText = `position:absolute;top:0;bottom:0;width:1px;background:${this.guideColor};pointer-events:none;z-index:999;`;
      guide.style.left = `${hostRelativePos}px`;
    } else {
      guide.style.cssText = `position:absolute;left:0;right:0;height:1px;background:${this.guideColor};pointer-events:none;z-index:999;`;
      guide.style.top = `${hostRelativePos}px`;
    }

    this.host.appendChild(guide);
    this.#guideElements.push(guide);
  }

  #removeGuides(): void {
    for (const g of this.#guideElements) g.remove();
    this.#guideElements = [];
  }

  #endDrag(e?: PointerEvent): void {
    this.#dragState = null;
    this.host.removeEventListener('pointermove', this.#onPointerMove);
    this.host.removeEventListener('pointerup', this.#onPointerUp);
    this.host.removeEventListener('pointercancel', this.#onPointerCancel);
    this.#removeGuides();
    this.host.removeAttribute('magnetized');
    if (e) {
      try { this.host.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    }
  }
}
