export interface DragOptions {
  selector: string;
  dropZoneSelector?: string;
  /** CSS selector for zone containers that items can be dragged between (e.g., kanban columns). */
  zoneSelector?: string;
  axis?: 'vertical' | 'horizontal' | 'both';
  mode?: 'drop' | 'slot' | 'preview';
  disabled?: boolean;
  /** Enable view-transition animation for preview mode grid reordering (default: true). */
  animate?: boolean;
}

/** Enables pointer-driven drag-and-drop with drop, slot, or preview reordering. */
export class DragController {
  readonly host: HTMLElement;
  selector: string;
  dropZoneSelector: string;
  zoneSelector: string;
  axis: 'vertical' | 'horizontal' | 'both';
  mode: 'drop' | 'slot' | 'preview';
  disabled: boolean;
  animate: boolean;

  #dragItem: HTMLElement | null = null;
  #ghost: HTMLElement | null = null;
  #placeholder: HTMLElement | null = null;
  #startX = 0;
  #startY = 0;
  #grabOffsetX = 0;
  #grabOffsetY = 0;
  #dragIndex = -1;
  #lastSlotIndex = -1;
  #sourceZone: HTMLElement | null = null;
  #currentZone: HTMLElement | null = null;
  #attached = false;
  // WHY: Store the document reference at drag start so cleanup always removes
  // listeners from the same document — even if the host is adopted into a
  // different document mid-drag (e.g. Astro View Transition swap).
  #doc: Document | null = null;

  // Preview mode: save original position for cancel restore
  #previewOriginParent: HTMLElement | null = null;
  #previewOriginNext: HTMLElement | null = null;
  #lastPreviewIndex = -1;
  #pointerId = -1;

  constructor(host: HTMLElement, options: DragOptions) {
    this.host = host;
    this.selector = options.selector;
    this.dropZoneSelector = options.dropZoneSelector ?? '';
    this.zoneSelector = options.zoneSelector ?? '';
    this.axis = options.axis ?? 'both';
    this.mode = options.mode ?? 'drop';
    this.disabled = options.disabled ?? false;
    this.animate = options.animate ?? true;
    this.attach();
  }

  attach(): void {
    if (this.#attached) return;
    this.#attached = true;
    this.host.addEventListener('pointerdown', this.#onPointerDown);
    this.host.addEventListener('pointerenter', this.#onHoverIn, true);
    this.host.addEventListener('pointerleave', this.#onHoverOut, true);
  }

  detach(): void {
    if (!this.#attached) return;
    this.#attached = false;
    this.host.removeEventListener('pointerdown', this.#onPointerDown);
    this.host.removeEventListener('pointerenter', this.#onHoverIn, true);
    this.host.removeEventListener('pointerleave', this.#onHoverOut, true);
    this.#cleanup();
  }

  destroy(): void {
    if (this.#dragItem && this.#ghost) {
      this.#restorePreview();
      this.host.dispatchEvent(new CustomEvent('native:drag-cancel', {
        bubbles: true,
        composed: true,
        detail: { item: this.#dragItem },
      }));
    }
    this.detach();
  }

  // ── Queries ──

  #getItems(): HTMLElement[] {
    if (!this.selector) return [];
    return [...this.host.querySelectorAll<HTMLElement>(this.selector)]
      .filter(el => !el.hasAttribute('popover'));
  }

  #getDropZones(): HTMLElement[] {
    if (!this.dropZoneSelector) return this.#getItems();
    return [...this.host.querySelectorAll<HTMLElement>(this.dropZoneSelector)]
      .filter(el => !el.hasAttribute('popover'));
  }

  #getZones(): HTMLElement[] {
    if (!this.zoneSelector) return [];
    return [...this.host.querySelectorAll<HTMLElement>(this.zoneSelector)];
  }

  #getItemsInZone(zone: HTMLElement): HTMLElement[] {
    if (!this.selector) return [];
    return [...zone.querySelectorAll<HTMLElement>(this.selector)]
      .filter(el => !el.hasAttribute('popover'));
  }

  #findZoneAt(x: number, y: number): HTMLElement | null {
    const zones = this.#getZones();
    for (const zone of zones) {
      const rect = zone.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return zone;
      }
    }
    return null;
  }

  // ── Hover feedback ──

  #onHoverIn = (e: PointerEvent): void => {
    if (this.disabled || !this.selector || this.#ghost) return;
    const target = (e.target as HTMLElement).closest?.(this.selector) as HTMLElement | null;
    if (!target || !this.host.contains(target)) return;
    target.style.outline = '2px solid var(--n-focus-ring, highlight)';
    target.style.outlineOffset = '2px';
  };

  #onHoverOut = (e: PointerEvent): void => {
    if (!this.selector) return;
    const target = (e.target as HTMLElement).closest?.(this.selector) as HTMLElement | null;
    if (!target || !this.host.contains(target)) return;
    target.style.removeProperty('outline');
    target.style.removeProperty('outline-offset');
  };

  // ── Drag lifecycle ──

  #onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    if (this.disabled) return;
    if (!this.selector) return;

    const target = (e.target as HTMLElement).closest?.(this.selector) as HTMLElement | null;
    if (!target || !this.host.contains(target)) return;

    const items = this.#getItems();
    const index = items.indexOf(target);
    if (index === -1) return;

    e.preventDefault();
    this.#dragItem = target;
    this.#dragIndex = index;
    this.#startX = e.clientX;
    this.#startY = e.clientY;

    const itemRect = target.getBoundingClientRect();
    this.#grabOffsetX = (itemRect.left + itemRect.width / 2) - e.clientX;
    this.#grabOffsetY = (itemRect.top + itemRect.height / 2) - e.clientY;

    if (this.zoneSelector) {
      this.#sourceZone = target.closest(this.zoneSelector) as HTMLElement | null;
    }

    this.#doc = this.host.ownerDocument;
    this.#doc.addEventListener('pointermove', this.#onPointerMove);
    this.#doc.addEventListener('pointerup', this.#onPointerUp);
    this.#doc.addEventListener('pointercancel', this.#onPointerCancel);
    this.#doc.addEventListener('keydown', this.#onKeyDown);

    try { target.setPointerCapture(e.pointerId); } catch { /* happy-dom no-op */ }
    this.#pointerId = e.pointerId;
    target.addEventListener('lostpointercapture', this.#onLostCapture);
  };

  #onPointerMove = (e: PointerEvent): void => {
    if (!this.#dragItem) return;

    // WHY: Create ghost on first move (not on pointerdown) to avoid ghost on click
    if (!this.#ghost) {
      this.#dragItem.style.removeProperty('outline');
      this.#dragItem.style.removeProperty('outline-offset');
      try {
        this.#createGhost(e);
      } catch {
        this.#cleanup();
        return;
      }
      this.#dragItem.setAttribute('dragging', '');
      if (this.mode === 'preview') {
        this.#previewOriginParent = this.#dragItem.parentElement;
        this.#previewOriginNext = this.#dragItem.nextElementSibling as HTMLElement | null;
        this.#lastPreviewIndex = -1;
        if (this.animate) this.#assignTransitionNames();
      }
      this.host.dispatchEvent(new CustomEvent('native:drag-start', {
        bubbles: true,
        composed: true,
        detail: { item: this.#dragItem, index: this.#dragIndex },
      }));
    }

    // WHY: Ghost always follows the pointer freely on both axes — axis only
    // constrains which zones are hit-tested, not the ghost's visual movement.
    const dx = e.clientX - this.#startX;
    const dy = e.clientY - this.#startY;
    this.#ghost!.style.transform = `translate(${dx}px, ${dy}px) scale(0.9)`;

    this.host.dispatchEvent(new CustomEvent('native:drag-move', {
      bubbles: true,
      composed: true,
      detail: { item: this.#dragItem, x: e.clientX, y: e.clientY },
    }));

    // WHY: Filter out the ghost clone as a safety measure — even though [popover]
    // excludes it from #getItems(), custom selectors on zones could still match it.
    const zones = this.#getDropZones().filter(z => z !== this.#ghost);

    if (this.mode === 'slot') {
      // WHY: Slot mode uses ghost center vs item centers. The slot indicator should
      // flip when the dragged element's center crosses another element's center.
      const ghostCenterX = e.clientX + this.#grabOffsetX;
      const ghostCenterY = e.clientY + this.#grabOffsetY;

      let items: HTMLElement[];
      let container: HTMLElement | undefined;

      if (this.zoneSelector) {
        // WHY: In zone mode, find which zone the ghost center is over and scope
        // hit-testing to items within that zone only (cross-zone kanban support).
        const zone = this.#findZoneAt(ghostCenterX, ghostCenterY);
        if (!zone) return;
        if (zone !== this.#currentZone) {
          if (this.#currentZone) {
            this.#clearSlotAttributes(this.#getItemsInZone(this.#currentZone));
            this.#currentZone.removeAttribute('drag-zone-active');
          }
          zone.setAttribute('drag-zone-active', '');
          this.#currentZone = zone;
          this.#lastSlotIndex = -1;
        }
        items = this.#getItemsInZone(zone).filter(el => el !== this.#ghost);
        container = zone;
      } else {
        items = zones;
      }

      // WHY: Exclude the dragging item from hit-testing — it still occupies DOM space
      // but shouldn't count as a target. Compare ghost center against remaining items only.
      const targets = items.filter(z => z !== this.#dragItem);

      // WHY: Find insertion index by counting how many item centers the ghost center has passed
      let insertIndex = 0;
      for (let i = 0; i < targets.length; i++) {
        const rect = targets[i].getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const isPast = this.axis === 'horizontal'
          ? ghostCenterX > centerX
          : this.axis === 'vertical'
            ? ghostCenterY > centerY
            : (ghostCenterX > centerX && ghostCenterY > centerY);

        if (isPast) {
          insertIndex = i + 1;
        } else {
          break;
        }
      }

      this.#updateSlot(items, insertIndex, container);
    } else if (this.mode === 'preview') {
      const ghostCenterX = e.clientX + this.#grabOffsetX;
      const ghostCenterY = e.clientY + this.#grabOffsetY;

      if (this.zoneSelector) {
        const zone = this.#findZoneAt(ghostCenterX, ghostCenterY);
        if (!zone) return;
        if (zone !== this.#currentZone) {
          if (this.#currentZone) this.#currentZone.removeAttribute('drag-zone-active');
          zone.setAttribute('drag-zone-active', '');
          this.#currentZone = zone;
          this.#lastPreviewIndex = -1;
        }
        const zoneItems = this.#getItemsInZone(zone).filter(el => el !== this.#ghost);
        this.#updatePreview(zoneItems, ghostCenterX, ghostCenterY, zone);
      } else {
        this.#updatePreview(zones, ghostCenterX, ghostCenterY);
      }
    } else {
      // WHY: Drop mode uses pointer position within zone bounds (more precise for "drop onto")
      let overZone: HTMLElement | null = null;
      let overIndex = -1;

      for (let i = 0; i < zones.length; i++) {
        const rect = zones[i].getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const midY = rect.top + rect.height / 2;

        const isOver = this.axis === 'vertical'
          ? (e.clientY >= rect.top && e.clientY <= rect.bottom)
          : this.axis === 'horizontal'
            ? (e.clientX >= rect.left && e.clientX <= rect.right)
            : (e.clientX >= rect.left && e.clientX <= rect.right &&
               e.clientY >= rect.top && e.clientY <= rect.bottom);

        if (isOver) {
          const isBefore = this.axis === 'horizontal'
            ? e.clientX < midX
            : e.clientY < midY;
          overIndex = isBefore ? i : i + 1;
          overZone = zones[i];
          break;
        }
      }

      this.#updateDropOver(zones, overZone, overIndex);
    }
  };

  // ── Drop mode: highlight target element ──

  #updateDropOver(zones: HTMLElement[], overZone: HTMLElement | null, _overIndex: number): void {
    for (const zone of zones) {
      if (zone !== overZone) {
        zone.removeAttribute('drag-over');
        zone.style.removeProperty('outline');
        zone.style.removeProperty('outline-offset');
      }
    }
    if (overZone) {
      overZone.setAttribute('drag-over', '');
      overZone.style.outline = '2px solid var(--n-focus-ring, highlight)';
      overZone.style.outlineOffset = '2px';
      this.host.dispatchEvent(new CustomEvent('native:drag-over', {
        bubbles: true,
        composed: true,
        detail: { item: this.#dragItem, target: overZone, index: _overIndex },
      }));
    }
  }

  // ── Slot mode: insert placeholder at gap ──

  #updateSlot(items: HTMLElement[], insertIndex: number, container?: HTMLElement): void {
    if (insertIndex === -1 || insertIndex === this.#lastSlotIndex) return;
    this.#lastSlotIndex = insertIndex;

    this.#clearSlotAttributes(items);

    if (!this.#placeholder) {
      const doc = this.#doc ?? this.host.ownerDocument;
      this.#placeholder = doc.createElement('div');
      this.#placeholder.className = 'drag-placeholder';
      this.#placeholder.setAttribute('aria-hidden', 'true');
    }

    const liveItems = items.filter(el => el !== this.#dragItem);
    const clampedIndex = Math.min(insertIndex, liveItems.length);

    if (clampedIndex < liveItems.length) {
      liveItems[clampedIndex].before(this.#placeholder);
    } else if (liveItems.length > 0) {
      liveItems[liveItems.length - 1].after(this.#placeholder);
    } else {
      // WHY: In zone mode, append to the target zone container; otherwise fall back to host.
      (container ?? this.host).appendChild(this.#placeholder);
    }

    if (clampedIndex < liveItems.length) {
      liveItems[clampedIndex].setAttribute('drag-slot-before', '');
    }
    if (clampedIndex > 0 && clampedIndex - 1 < liveItems.length) {
      liveItems[clampedIndex - 1].setAttribute('drag-slot-after', '');
    }

    const insertBefore = clampedIndex < liveItems.length ? liveItems[clampedIndex] : null;

    this.host.dispatchEvent(new CustomEvent('native:drag-over', {
      bubbles: true,
      composed: true,
      detail: { item: this.#dragItem, index: insertIndex, insertBefore },
    }));
  }

  #clearSlotAttributes(items: HTMLElement[]): void {
    for (const item of items) {
      item.removeAttribute('drag-slot-before');
      item.removeAttribute('drag-slot-after');
    }
  }

  // ── Preview mode: move real item in DOM ──

  #updatePreview(items: HTMLElement[], ghostCenterX: number, ghostCenterY: number, container?: HTMLElement): void {
    const liveItems = items.filter(el => el !== this.#dragItem);
    if (liveItems.length === 0) {
      // WHY: Empty zone — move item into the container so it becomes the first child.
      if (container && this.#dragItem && this.#lastPreviewIndex !== 0) {
        this.#lastPreviewIndex = 0;
        const doMove = () => container.appendChild(this.#dragItem!);
        if (this.animate && typeof document.startViewTransition === 'function') {
          const t = document.startViewTransition(() => {
            doMove();
            this.#assignTransitionNames();
          });
          t.finished.catch(() => {});
        } else {
          doMove();
        }
        this.host.dispatchEvent(new CustomEvent('native:drag-over', {
          bubbles: true,
          composed: true,
          detail: { item: this.#dragItem, index: 0, insertBefore: null },
        }));
      }
      return;
    }

    // WHY: Use ALL items (including the dragged one) for geometry detection.
    // The dragged item still occupies its grid cell ([dragging] only sets opacity),
    // so liveItems has a gap in the first row that would give wrong column count
    // and a shifted coordinate origin.
    const firstRect = items[0].getBoundingClientRect();
    let cols = 1;
    for (let i = 1; i < items.length; i++) {
      if (Math.abs(items[i].getBoundingClientRect().top - firstRect.top) < firstRect.height * 0.5) {
        cols = i + 1;
      } else {
        break;
      }
    }

    // WHY: Compute cell step (width + gap, height + gap) from adjacent items.
    // This handles arbitrary gap sizes without needing to know the CSS grid gap value.
    const stepX = cols > 1
      ? (items[1].getBoundingClientRect().left - firstRect.left)
      : firstRect.width;
    const stepY = cols < items.length
      ? (items[cols].getBoundingClientRect().top - firstRect.top)
      : firstRect.height;

    // WHY: Convert ghost center to grid (row, col) coordinates relative to the
    // first cell's center. Using Math.round gives a natural snap — the insertion
    // point flips when the ghost crosses the midpoint between two cells.
    const col = Math.round((ghostCenterX - (firstRect.left + firstRect.width / 2)) / stepX);
    const row = Math.round((ghostCenterY - (firstRect.top + firstRect.height / 2)) / stepY);
    const maxRow = Math.ceil(liveItems.length / cols) - 1;
    const clampedCol = Math.max(0, Math.min(col, cols - 1));
    const clampedRow = Math.max(0, Math.min(row, maxRow));

    let insertIndex = clampedRow * cols + clampedCol;
    insertIndex = Math.max(0, Math.min(insertIndex, liveItems.length));

    if (insertIndex === this.#lastPreviewIndex) return;
    this.#lastPreviewIndex = insertIndex;

    // WHY: Perform the actual DOM move — the item IS the live preview indicator.
    // Wrap in View Transition if available for smooth grid reflow animation.
    const insertBefore = insertIndex < liveItems.length ? liveItems[insertIndex] : null;
    const doMove = () => {
      if (insertBefore) {
        insertBefore.before(this.#dragItem!);
      } else {
        liveItems[liveItems.length - 1].after(this.#dragItem!);
      }
    };

    if (this.animate && typeof document.startViewTransition === 'function') {
      // WHY: Catch AbortError — rapid drags start new transitions before the
      // previous one finishes. The browser aborts the old transition, rejecting
      // its promise. This is expected and harmless (T0020).
      const t = document.startViewTransition(() => {
        doMove();
        // WHY: Reassign names after DOM move — indices shift when the dragged
        // item is reinserted, so each sibling needs a fresh transition name.
        this.#assignTransitionNames();
      });
      t.finished.catch(() => {});
    } else {
      doMove();
    }

    this.host.dispatchEvent(new CustomEvent('native:drag-over', {
      bubbles: true,
      composed: true,
      detail: { item: this.#dragItem, index: insertIndex, insertBefore },
    }));
  }

  // ── Preview mode: view-transition-name management ──

  #assignTransitionNames(): void {
    const items = this.#getItems();
    for (let i = 0; i < items.length; i++) {
      items[i].style.viewTransitionName =
        items[i] === this.#dragItem ? 'none' : `drag-item-${i}`;
    }
  }

  #clearTransitionNames(): void {
    for (const item of this.#getItems()) {
      item.style.removeProperty('view-transition-name');
    }
  }

  #restorePreview(): void {
    if (this.mode !== 'preview' || !this.#dragItem || !this.#previewOriginParent) return;
    const item = this.#dragItem;
    const next = this.#previewOriginNext;
    const parent = this.#previewOriginParent;
    const doRestore = () => {
      if (next && next.isConnected) {
        next.before(item);
      } else {
        parent.appendChild(item);
      }
    };
    if (this.animate && typeof document.startViewTransition === 'function') {
      const t = document.startViewTransition(() => {
        doRestore();
        this.#assignTransitionNames();
      });
      t.finished.catch(() => {});
    } else {
      doRestore();
    }
  }

  // ── End / Cancel ──

  #onPointerUp = (_e: PointerEvent): void => {
    if (!this.#dragItem) return;

    this.#dragItem.removeEventListener('lostpointercapture', this.#onLostCapture);
    if (this.#pointerId >= 0) {
      try { this.#dragItem.releasePointerCapture(this.#pointerId); } catch { /* already released */ }
    }

    const doc = this.#doc ?? this.host.ownerDocument;
    doc.removeEventListener('pointermove', this.#onPointerMove);
    doc.removeEventListener('pointerup', this.#onPointerUp);
    doc.removeEventListener('pointercancel', this.#onPointerCancel);
    doc.removeEventListener('keydown', this.#onKeyDown);
    this.#doc = null;

    if (this.#ghost) {
      if (this.mode === 'slot') {
        let liveItems: HTMLElement[];
        if (this.zoneSelector && this.#currentZone) {
          liveItems = this.#getItemsInZone(this.#currentZone)
            .filter(el => el !== this.#dragItem);
        } else {
          liveItems = this.#getItems().filter(el => el !== this.#dragItem);
        }
        const insertBefore = this.#lastSlotIndex >= 0 && this.#lastSlotIndex < liveItems.length
          ? liveItems[this.#lastSlotIndex]
          : null;

        this.host.dispatchEvent(new CustomEvent('native:drop', {
          bubbles: true,
          composed: true,
          detail: {
            item: this.#dragItem,
            fromIndex: this.#dragIndex,
            toIndex: this.#lastSlotIndex,
            insertBefore,
            sourceZone: this.#sourceZone,
            targetZone: this.#currentZone,
          },
        }));
      } else if (this.mode === 'preview') {
        let items: HTMLElement[];
        if (this.zoneSelector && this.#currentZone) {
          items = this.#getItemsInZone(this.#currentZone);
        } else {
          items = this.#getItems();
        }
        const toIndex = this.#dragItem ? items.indexOf(this.#dragItem) : -1;
        this.#previewOriginParent = null;
        this.#previewOriginNext = null;

        this.host.dispatchEvent(new CustomEvent('native:drop', {
          bubbles: true,
          composed: true,
          detail: {
            item: this.#dragItem,
            fromIndex: this.#dragIndex,
            toIndex,
            sourceZone: this.#sourceZone,
            targetZone: this.#currentZone,
          },
        }));
      } else {
        const zones = this.#getDropZones();
        const overZone = zones.find(z => z.hasAttribute('drag-over')) ?? null;
        const toIndex = overZone ? zones.indexOf(overZone) : -1;

        this.host.dispatchEvent(new CustomEvent('native:drop', {
          bubbles: true,
          composed: true,
          detail: {
            item: this.#dragItem,
            target: overZone,
            fromIndex: this.#dragIndex,
            toIndex,
            sourceZone: this.#sourceZone,
            targetZone: this.#currentZone,
          },
        }));
      }
    }

    this.#cleanup();
  };

  #onLostCapture = (): void => {
    if (!this.#dragItem) return;
    this.#onPointerUp(null as unknown as PointerEvent);
  };

  #onPointerCancel = (): void => {
    if (!this.#dragItem) return;
    this.#restorePreview();
    if (this.#ghost) {
      this.host.dispatchEvent(new CustomEvent('native:drag-cancel', {
        bubbles: true,
        composed: true,
        detail: { item: this.#dragItem },
      }));
    }
    this.#cleanup();
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.#dragItem) {
      e.preventDefault();
      this.#restorePreview();
      // WHY: Only dispatch native:drag-cancel if a drag is actually in progress (ghost exists).
      // Without a ghost, the pointer hasn't moved yet — no drag started, no cancel needed.
      if (this.#ghost) {
        this.host.dispatchEvent(new CustomEvent('native:drag-cancel', {
          bubbles: true,
          composed: true,
          detail: { item: this.#dragItem },
        }));
      }
      this.#cleanup();
    }
  };

  // ── Ghost ──

  #createGhost(e: PointerEvent): void {
    if (!this.#dragItem) return;

    const rect = this.#dragItem.getBoundingClientRect();
    const ghost = this.#dragItem.cloneNode(true) as HTMLElement;

    // WHY: Use popover for the ghost so it renders in the top layer.
    // This allows dragging freely across the viewport without clipping
    // from overflow containers or stacking context issues.
    // The UA :popover-open styles set `inset: 0` and `margin: auto`, so we
    // use `inset: unset` + explicit positioning to override them.
    // WHY: Append to this.host (not document.body) so the ghost inherits
    // CSS custom properties from the component tree. The [popover] attribute
    // excludes it from #getItems() queries and the top layer means it doesn't
    // occupy a grid/flex slot in the host's layout.
    ghost.setAttribute('popover', 'manual');
    ghost.setAttribute('aria-hidden', 'true');

    this.host.appendChild(ghost);
    ghost.showPopover();

    // WHY: Apply positioning AFTER showPopover() to override UA :popover-open defaults
    // (inset: 0, margin: auto). Only set positioning/layout overrides — preserve the
    // cloned element's own background, padding, border, etc.
    ghost.style.position = 'fixed';
    ghost.style.inset = 'unset';
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.margin = '0';
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.8';
    ghost.style.transformOrigin = 'center center';
    ghost.style.border = 'none';
    ghost.style.outline = 'none';

    this.#ghost = ghost;
    this.#startX = e.clientX;
    this.#startY = e.clientY;
  }

  #cleanup(): void {
    if (this.#ghost) {
      if (this.#ghost.isConnected) {
        try { this.#ghost.hidePopover(); } catch { /* already hidden */ }
      }
      this.#ghost.remove();
      this.#ghost = null;
    }
    if (this.#dragItem) {
      this.#dragItem.removeAttribute('dragging');
    }

    // WHY: Clear view-transition-name from all items after drag ends
    if (this.mode === 'preview' && this.animate) {
      this.#clearTransitionNames();
    }

    const zones = this.#getDropZones();
    if (this.mode === 'slot') {
      this.#clearSlotAttributes(zones);
    } else {
      for (const zone of zones) {
        zone.removeAttribute('drag-over');
        zone.style.removeProperty('outline');
        zone.style.removeProperty('outline-offset');
      }
    }

    if (this.#placeholder) {
      this.#placeholder.remove();
      this.#placeholder = null;
    }

    // WHY: Clear [drag-zone-active] from all zones on cleanup
    if (this.zoneSelector) {
      for (const zone of this.#getZones()) {
        zone.removeAttribute('drag-zone-active');
      }
    }

    // WHY: Pointer capture + lostpointercapture listener are released in #onPointerUp
    // BEFORE dispatching native:drop. Only release here for cancel/teardown paths.
    if (this.#dragItem && this.#pointerId >= 0) {
      this.#dragItem.removeEventListener('lostpointercapture', this.#onLostCapture);
      try { this.#dragItem.releasePointerCapture(this.#pointerId); } catch { /* already released */ }
    }

    this.#dragItem = null;
    this.#dragIndex = -1;
    this.#lastSlotIndex = -1;
    this.#sourceZone = null;
    this.#currentZone = null;
    this.#previewOriginParent = null;
    this.#previewOriginNext = null;
    this.#lastPreviewIndex = -1;
    this.#pointerId = -1;

    // WHY: Document listeners may already be removed by #onPointerUp (which removes
    // them before dispatching native:drop). Removing twice is safe (no-op).
    // This path handles cancel, teardown, and ghost creation failure.
    const doc = this.#doc ?? this.host.ownerDocument;
    doc.removeEventListener('pointermove', this.#onPointerMove);
    doc.removeEventListener('pointerup', this.#onPointerUp);
    doc.removeEventListener('pointercancel', this.#onPointerCancel);
    doc.removeEventListener('keydown', this.#onKeyDown);
    this.#doc = null;
  }
}
