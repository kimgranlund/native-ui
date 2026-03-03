import { NativeElement } from '../../core/native-element.ts';
import { RovingFocusController } from '../../traits/roving-focus-controller.ts';
import { PopoverController } from '../../traits/popover-controller.ts';
import '../../icons/custom/dots-three-bold.ts';

const BTN = ':is(n-button, button):not([disabled])';
const ITEM_SELECTOR = `:scope > ${BTN}:not([data-overflow]), :scope > n-toolbar-group:not([data-overflow]) > ${BTN}`;
const ITEM_SELECTOR_NO_TRIGGER = `:scope > ${BTN}:not([data-overflow]):not([data-overflow-trigger]), :scope > n-toolbar-group:not([data-overflow]) > ${BTN}`;

/** Horizontal action bar with toolbar role, roving focus, and responsive overflow menu. */
export class NToolbar extends NativeElement {
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

    // Stamp the overflow trigger button
    this.#moreBtn = document.createElement('n-button');
    this.#moreBtn.setAttribute('variant', 'ghost');
    this.#moreBtn.setAttribute('square', '');
    this.#moreBtn.setAttribute('aria-label', 'More actions');
    this.#moreBtn.setAttribute('data-overflow-trigger', '');
    const icon = document.createElement('n-icon');
    icon.setAttribute('name', 'dots-three-bold');
    this.#moreBtn.appendChild(icon);
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
    this.#roving = new RovingFocusController(this, {
      selector: ITEM_SELECTOR_NO_TRIGGER,
      orientation: 'horizontal',
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
    this.#roving.destroy();
    super.teardown();
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
      return;
    }

    // 7. Overflow detected — exit measurement mode, show more button
    this.removeAttribute('data-measuring');
    this.setAttribute('data-overflowing', '');
    const moreBtnWidth = this.#moreBtn.offsetWidth;
    const available = contentWidth - moreBtnWidth - gap;

    // 8. Walk units left-to-right, hiding those that don't fit
    let consumed = 0;
    let overflowing = false;
    flatIndex = 0;
    for (const unit of units) {
      if (overflowing) {
        unit.el.setAttribute('data-overflow', '');
        continue;
      }
      let unitCost = 0;
      for (const item of unit.flexItems) {
        if (flatIndex > 0) unitCost += gap;
        unitCost += item.offsetWidth;
        flatIndex++;
      }
      consumed += unitCost;
      if (consumed > available) {
        unit.el.setAttribute('data-overflow', '');
        overflowing = true;
      }
    }

    // 9. Update roving focus selector (include more button)
    this.#roving.selector = ITEM_SELECTOR;

    // 10. Rebuild the overflow menu
    this.#rebuildOverflowMenu();
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
   *  overflow together. Each unit tracks its flex items for width calculation. */
  #buildOverflowUnits(): { el: HTMLElement; flexItems: HTMLElement[] }[] {
    const units: { el: HTMLElement; flexItems: HTMLElement[] }[] = [];
    for (const child of this.#getContentChildren()) {
      if (child.tagName === 'N-TOOLBAR-GROUP') {
        const items: HTMLElement[] = [];
        for (const gc of child.children) {
          if (gc instanceof HTMLElement) items.push(gc);
        }
        units.push({ el: child, flexItems: items });
      } else {
        units.push({ el: child, flexItems: [child] });
      }
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
