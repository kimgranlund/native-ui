import { NativeElement } from '../../core/native-element.ts';
import { RovingFocusController } from '../../traits/roving-focus-controller.ts';
import { PopoverController } from '../../traits/popover-controller.ts';

// Inline SVG for overflow trigger — avoids tree-shaking risk from
// side-effect icon registration import.
const OVERFLOW_SVG = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M156,128a28,28,0,1,1-28-28A28,28,0,0,1,156,128ZM48,100a28,28,0,1,0,28,28A28,28,0,0,0,48,100Zm160,0a28,28,0,1,0,28,28A28,28,0,0,0,208,100Z"/></svg>';

interface OverflowUnit {
  el: HTMLElement;
  flexItems: HTMLElement[];
  priority: 'low' | 'normal' | 'high';
  pinned: boolean;
  index: number;
  width: number;
}

const PRIORITY_ORDER: Record<string, number> = { low: 0, normal: 1, high: 2 };

const BTN = ':is(n-button, button):not([disabled])';
const ITEM_SELECTOR = `:scope > ${BTN}:not([data-overflow]), :scope > n-toolbar-group:not([data-overflow]) > ${BTN}`;
const ITEM_SELECTOR_NO_TRIGGER = `:scope > ${BTN}:not([data-overflow]):not([data-overflow-trigger]), :scope > n-toolbar-group:not([data-overflow]) > ${BTN}`;

/**
 * Horizontal action bar with toolbar role, roving focus, and responsive overflow menu.
 *
 * **Variants:**
 * - *(default)* — panel background, border, border-radius, padding.
 * - `variant="plain"` — zero-chrome: transparent background, no border,
 *   no border-radius, no padding. Stable API for embedded action rows
 *   (e.g. header trailing slots, chat controls) that need toolbar layout
 *   and overflow without container chrome.
 */
export class NToolbar extends NativeElement {
  static observedAttributes = ['orientation'];

  #internals: ElementInternals;
  #roving!: RovingFocusController;
  #popover: PopoverController | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #mutationObserver: MutationObserver | null = null;
  #moreBtn: HTMLElement | null = null;
  #overflowList: HTMLElement | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'toolbar';
  }

  setup(): void {
    super.setup();

    // Stamp the overflow trigger button — uses inline SVG to avoid
    // tree-shaking stripping the side-effect icon registration import.
    this.#moreBtn = document.createElement('n-button');
    this.#moreBtn.setAttribute('variant', 'ghost');
    this.#moreBtn.setAttribute('square', '');
    this.#moreBtn.setAttribute('aria-label', 'More actions');
    this.#moreBtn.setAttribute('data-overflow-trigger', '');
    this.#moreBtn.innerHTML = OVERFLOW_SVG;
    this.appendChild(this.#moreBtn);

    // Stamp the overflow popover listbox
    this.#overflowList = document.createElement('n-listbox');
    this.#overflowList.setAttribute('popover', '');
    this.appendChild(this.#overflowList);

    // Wire popover positioning
    this.#popover = new PopoverController(this);
    this.#popover.wirePopover(this.#moreBtn, this.#overflowList);

    // Toggle popover on more button press
    this.#moreBtn.addEventListener('native:press', this.#onMorePress);

    // Handle overflow menu selection
    this.#overflowList.addEventListener('native:change', this.#onOverflowSelect);

    // Dismiss listener — close popover when clicking outside
    this.addEventListener('native:dismiss', this.#onDismiss);

    // Roving focus — initial selector excludes the more trigger (hidden)
    const orientation = this.getAttribute('orientation');
    this.#roving = new RovingFocusController(this, {
      selector: ITEM_SELECTOR_NO_TRIGGER,
      orientation: (orientation === 'vertical' || orientation === 'both') ? orientation : 'horizontal',
    });

    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Toolbar');
    }

    // Observe size changes
    this.#resizeObserver = new ResizeObserver(() => this.#scheduleMeasure());
    this.#resizeObserver.observe(this);

    // Observe child additions/removals
    this.#mutationObserver = new MutationObserver(() => this.#scheduleMeasure());
    this.#mutationObserver.observe(this, { childList: true });
  }

  teardown(): void {
    if (this.#rafId) { cancelAnimationFrame(this.#rafId); this.#rafId = 0; }
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    this.#popover?.destroy();
    this.#popover = null;
    this.#moreBtn?.removeEventListener('native:press', this.#onMorePress);
    this.#overflowList?.removeEventListener('native:change', this.#onOverflowSelect);
    this.removeEventListener('native:dismiss', this.#onDismiss);
    this.#moreBtn?.remove();
    this.#moreBtn = null;
    this.#overflowList?.remove();
    this.#overflowList = null;
    this.#roving?.destroy();
    super.teardown();
  }

  attributeChangedCallback(name: string, _old: string | null, val: string | null): void {
    if (name === 'orientation' && this.#roving) {
      this.#roving.orientation = (val === 'vertical' || val === 'both') ? val : 'horizontal';
    }
  }

  // ---------------------------------------------------------------------------
  // Overflow measurement
  // ---------------------------------------------------------------------------

  #rafId = 0;

  #scheduleMeasure(): void {
    if (this.#rafId) return;
    this.#rafId = requestAnimationFrame(() => {
      this.#rafId = 0;
      this.#measure();
    });
  }

  #measure(): void {
    if (!this.#moreBtn || !this.#overflowList) return;

    // Vertical toolbars don't overflow horizontally — skip measurement.
    if (this.getAttribute('orientation') === 'vertical') {
      for (const child of this.#getContentChildren()) {
        child.removeAttribute('data-overflow');
      }
      this.removeAttribute('data-overflowing');
      this.removeAttribute('data-measuring');
      this.#roving.selector = ITEM_SELECTOR_NO_TRIGGER;
      this.#clearOverflowMenu();
      return;
    }

    // 0. Fix DOM order — connectedCallback stamps before parser adds children,
    //    so the trigger/listbox may precede content children. Move them to end.
    if (this.lastElementChild !== this.#overflowList) {
      this.#mutationObserver?.disconnect();
      this.appendChild(this.#moreBtn);
      this.appendChild(this.#overflowList);
      this.#mutationObserver?.observe(this, { childList: true });
    }

    // 1. Reset — unhide all items
    for (const child of this.#getContentChildren()) {
      child.removeAttribute('data-overflow');
    }
    this.removeAttribute('data-overflowing');

    // 2. Enter measurement mode — forces flex: 0 0 auto so offsetWidth
    //    reflects intrinsic size (needed when [fill] makes items grow).
    this.setAttribute('data-measuring', '');

    // 3. Compute the toolbar's content-box width (inner area for flex children)
    const cs = getComputedStyle(this);
    const contentWidth =
      this.clientWidth -
      (parseFloat(cs.paddingInlineStart) || 0) -
      (parseFloat(cs.paddingInlineEnd) || 0);

    // Guard: not laid out yet
    if (contentWidth <= 0) {
      this.removeAttribute('data-measuring');
      return;
    }

    // 4. Build overflow units — groups are atomic (all-or-nothing)
    const units = this.#buildOverflowUnits();
    const gap = this.#getGap();

    // 5. Sum total intrinsic width (flat across all flex items)
    let totalWidth = 0;
    let flatIndex = 0;
    for (const unit of units) {
      for (const item of unit.flexItems) {
        if (flatIndex > 0) totalWidth += gap;
        totalWidth += item.offsetWidth;
        flatIndex++;
      }
    }

    // 6. No overflow? Exit measurement mode and let items grow (if [fill]).
    if (totalWidth <= contentWidth) {
      this.removeAttribute('data-measuring');
      this.#roving.selector = ITEM_SELECTOR_NO_TRIGGER;
      this.#clearOverflowMenu();
      this.#dispatchOverflowEvent(units, new Set(), contentWidth, totalWidth);
      return;
    }

    // 7. Overflow detected — show more button but KEEP measurement mode
    //    so per-unit widths in step 8 reflect intrinsic sizes (not grown/shrunk).
    this.setAttribute('data-overflowing', '');

    // DEV diagnostic: warn if items overflow but no overflow trigger is visible
    // (e.g. toolbar inside a constrained container without the overflow menu).
    if (import.meta.env?.DEV && !this.#moreBtn?.isConnected) {
      console.warn(
        `[n-toolbar] Items overflow (${Math.round(totalWidth)}px > ${Math.round(contentWidth)}px) ` +
        `but overflow trigger is missing. Items will be clipped.`,
        this,
      );
    }
    const moreBtnWidth = this.#moreBtn.offsetWidth;
    const available = contentWidth - moreBtnWidth - gap;

    // 8. Measure per-unit widths (still in data-measuring mode for intrinsic sizes)
    for (const unit of units) {
      let w = 0;
      for (let i = 0; i < unit.flexItems.length; i++) {
        if (i > 0) w += gap;
        w += unit.flexItems[i].offsetWidth;
      }
      unit.width = w;
    }

    // 9. Exit measurement mode — items return to normal flex sizing
    this.removeAttribute('data-measuring');

    // 10. Priority-based overflow — sort candidates by priority (low first),
    //     then by reverse DOM order within same priority (later items first).
    //     Pinned items never overflow.
    const candidates = units
      .filter(u => !u.pinned)
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 1;
        const pb = PRIORITY_ORDER[b.priority] ?? 1;
        if (pa !== pb) return pa - pb;
        return b.index - a.index;
      });

    let remaining = totalWidth;
    const overflowed = new Set<HTMLElement>();

    for (const unit of candidates) {
      if (remaining <= available) break;
      overflowed.add(unit.el);
      remaining -= unit.width + gap;
    }

    // 11. Apply data-overflow
    for (const unit of units) {
      if (overflowed.has(unit.el)) {
        unit.el.setAttribute('data-overflow', '');
      }
    }

    // 12. Update roving focus selector (include more button)
    this.#roving.selector = ITEM_SELECTOR;

    // 13. Rebuild the overflow menu
    this.#rebuildOverflowMenu();

    // 14. Dispatch diagnostics event
    this.#dispatchOverflowEvent(units, overflowed, contentWidth, totalWidth);
  }

  /** Get content children (excludes the stamped more button and overflow listbox). */
  #getContentChildren(): HTMLElement[] {
    const children: HTMLElement[] = [];
    for (const child of this.children) {
      if (child === this.#moreBtn || child === this.#overflowList) continue;
      if (child instanceof HTMLElement) children.push(child);
    }
    return children;
  }

  /** Read the computed gap value. */
  #getGap(): number {
    const style = getComputedStyle(this);
    return parseFloat(style.columnGap) || 0;
  }

  /** Build atomic overflow units. Groups are treated as one unit so they
   *  overflow together. Each unit tracks its flex items for width calculation,
   *  priority, and pinned state. */
  #buildOverflowUnits(): OverflowUnit[] {
    const units: OverflowUnit[] = [];
    let index = 0;
    for (const child of this.#getContentChildren()) {
      const priority = (child.getAttribute('overflow-priority') ?? 'normal') as 'low' | 'normal' | 'high';
      const pinned = child.hasAttribute('overflow-pin');
      if (child.tagName === 'N-TOOLBAR-GROUP') {
        const items: HTMLElement[] = [];
        for (const gc of child.children) {
          if (gc instanceof HTMLElement) items.push(gc);
        }
        units.push({ el: child, flexItems: items, priority, pinned, index, width: 0 });
      } else {
        units.push({ el: child, flexItems: [child], priority, pinned, index, width: 0 });
      }
      index++;
    }
    return units;
  }

  // ---------------------------------------------------------------------------
  // Overflow menu
  // ---------------------------------------------------------------------------

  /** Get the flat list of actionable elements from overflow items.
   *  Walks into groups and expands compound controls (segmented-control → segments). */
  #getOverflowButtons(): HTMLElement[] {
    const buttons: HTMLElement[] = [];
    for (const child of this.#getContentChildren()) {
      if (!child.hasAttribute('data-overflow')) continue;
      if (child.tagName === 'N-TOOLBAR-GROUP') {
        for (const gc of child.children) {
          if (gc instanceof HTMLElement && gc.tagName !== 'N-DIVIDER') buttons.push(gc);
        }
      } else if (child.tagName === 'N-SEGMENTED-CONTROL') {
        for (const seg of child.children) {
          if (seg instanceof HTMLElement) buttons.push(seg);
        }
      } else if (child.tagName !== 'N-DIVIDER') {
        buttons.push(child);
      }
    }
    return buttons;
  }

  #rebuildOverflowMenu(): void {
    if (!this.#overflowList) return;
    this.#overflowList.innerHTML = '';

    const overflowButtons = this.#getOverflowButtons();

    for (let i = 0; i < overflowButtons.length; i++) {
      const source = overflowButtons[i];
      const label = this.#extractLabel(source);
      const option = document.createElement('n-option');
      option.setAttribute('value', String(i));
      option.textContent = label;
      this.#overflowList.appendChild(option);
    }
  }

  #clearOverflowMenu(): void {
    if (this.#overflowList) this.#overflowList.innerHTML = '';
  }

  /** Extract a human-readable label from a toolbar item. */
  #extractLabel(el: HTMLElement): string {
    // 1. Explicit aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // 2. Slot label text
    const slotLabel = el.querySelector('[slot="label"]');
    if (slotLabel?.textContent?.trim()) return slotLabel.textContent.trim();

    // 3. Full text content (skip if only whitespace)
    const text = el.textContent?.trim();
    if (text) return text;

    // 4. Icon name as fallback
    const icon = el.querySelector('n-icon');
    const iconName = icon?.getAttribute('name');
    if (iconName) {
      return iconName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    return 'Action';
  }

  // ---------------------------------------------------------------------------
  // Diagnostics
  // ---------------------------------------------------------------------------

  /** Dispatch `native:toolbar-overflow` with visibility stats. */
  #dispatchOverflowEvent(
    units: OverflowUnit[],
    overflowed: Set<HTMLElement>,
    availableWidth: number,
    totalWidth: number,
  ): void {
    const overflowedLabels: string[] = [];
    for (const unit of units) {
      if (overflowed.has(unit.el)) {
        overflowedLabels.push(this.#extractLabel(unit.el));
      }
    }
    this.dispatchEvent(new CustomEvent('native:toolbar-overflow', {
      bubbles: true,
      composed: true,
      detail: {
        visibleCount: units.length - overflowed.size,
        overflowedCount: overflowed.size,
        overflowedLabels,
        availableWidth,
        totalWidth,
      },
    }));
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  #onMorePress = (): void => {
    const isOpen = this.#overflowList?.matches(':popover-open');
    this.#popover?.syncPopover(!isOpen);
  };

  #onOverflowSelect = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    if (!detail?.value) return;

    const index = parseInt(detail.value, 10);
    const source = this.#getOverflowButtons()[index];
    if (source) source.click();

    // Close the popover
    this.#popover?.syncPopover(false);
  };

  #onDismiss = (): void => {
    this.#popover?.syncPopover(false);
  };
}
