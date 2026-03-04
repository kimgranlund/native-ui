import { signal, NativeElement, PopoverController } from '@nonoun/native-ui';

/**
 * Collapsible group of navigation items using native details/summary.
 * Exposes `openFlyout()` / `closeFlyout()` for collapsed-sidebar mode —
 * the sidebar layout coordinator decides *when* to call them.
 * @attr {boolean} open - Whether the group is expanded
 */
export class NSidebarGroup extends NativeElement {
  static observedAttributes = ['open'];

  #open = signal(false);
  #details: HTMLDetailsElement | null = null;
  #internals: ElementInternals;
  #observer: MutationObserver | null = null;

  // Flyout popover (stamped in setup, managed by openFlyout/closeFlyout)
  #flyout: HTMLElement | null = null;
  #popover: PopoverController | null = null;
  #flyoutOpen = false;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'group';
  }

  /** Whether the flyout popover is currently open. */
  get flyoutOpen(): boolean {
    return this.#flyoutOpen;
  }

  get open(): boolean {
    return this.#open.value;
  }

  set open(val: boolean) {
    this.#open.value = val;
    this.toggleAttribute('open', val);
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'open') {
      this.#open.value = val !== null;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();

    // WHY: Stamp native <details>/<summary> for free disclosure behavior.
    // Same pattern as n-accordion-item.
    const details = document.createElement('details');
    const summary = document.createElement('summary');

    // Move <n-sidebar-group-header> content into <summary>
    const header = this.querySelector(':scope > n-sidebar-group-header');
    if (header) {
      summary.appendChild(header);
    }

    // Move remaining children into details (after summary)
    while (this.firstChild) details.appendChild(this.firstChild);

    details.insertBefore(summary, details.firstChild);
    this.appendChild(details);
    this.#details = details;

    // WHY: Sync <details> open state from signal. Defaults closed (matching <details>
    // pattern) — author opts in via [open] attribute for SSR compatibility.
    this.addEffect(() => {
      const open = this.#open.value;
      if (this.#details) this.#details.open = open;
    });

    // WHY: Listen for native toggle event to keep signal in sync
    details.addEventListener('toggle', this.#onToggle);

    // WHY: Watch for aria-current changes on child nav-items to drive
    // the sliding indicator (same pattern as vertical tabs).
    this.#observer = new MutationObserver(() => this.#syncIndicator());
    this.#observer.observe(details, {
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-current'],
    });

    // Sync initial state in case a child is already selected
    this.#syncIndicator();

    // ── Flyout popover ──
    // WHY: Stamp a n-listbox[popover] — same component the sidebar item menus use.
    // The sidebar layout coordinator calls openFlyout() when appropriate.
    const flyout = document.createElement('n-listbox');
    flyout.setAttribute('popover', 'manual');
    this.appendChild(flyout);
    this.#flyout = flyout;

    this.#popover = new PopoverController(this);
    // WHY: Anchor to the group element (not summary) so the flyout aligns with
    // the sidebar edge — same pattern as n-sidebar-item menus.
    this.#popover.wirePopover(this, flyout);

    // WHY: n-option click → native:select bubbles through listbox → group → nav.
    // The nav's ListNavigateController catches native:select and handles selection + navigation.
    // We just need to close the flyout after selection, and stop the listbox's native:change
    // from leaking to n-sidebar-nav (which would cause duplicate native:change events).
    flyout.addEventListener('native:select', this.#onFlyoutSelect);
    flyout.addEventListener('native:change', this.#onFlyoutChange);

    this.addEventListener('native:dismiss', this.#onFlyoutDismiss);
  }

  teardown(): void {
    this.closeFlyout();
    this.#popover?.destroy();
    this.#popover = null;
    this.#flyout?.remove();
    this.#flyout = null;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#details?.removeEventListener('toggle', this.#onToggle);
    this.#details = null;
    super.teardown();
  }

  #syncIndicator(): void {
    if (!this.#details) return;
    const items = this.#details.querySelectorAll<HTMLElement>(':scope > n-sidebar-nav-item');
    let selectedIndex = -1;

    for (let i = 0; i < items.length; i++) {
      if (items[i].hasAttribute('aria-current')) {
        selectedIndex = i;
        break;
      }
    }

    if (selectedIndex < 0) {
      this.#internals.states.delete('has-selection');
      return;
    }

    this.style.setProperty('--n-indicator-index', `${selectedIndex}`);
    this.#internals.states.add('has-selection');
  }

  #onToggle = (): void => {
    if (!this.#details) return;
    const isOpen = this.#details.open;
    this.#open.value = isOpen;
    this.toggleAttribute('open', isOpen);
  };

  // ── Flyout public API ──

  /** Stamp n-option elements from child nav-items, open the flyout popover. */
  openFlyout(): void {
    if (!this.#details || !this.#flyout) return;

    // WHY: Stamp n-option elements inside n-listbox — same components the
    // sidebar item menus use. Consistent styling, dogfooding real components.
    // NOT n-sidebar-nav-item — the collapsed sidebar rule hides all n-sidebar-nav-item
    // descendants, and that selector matches even in the top-layer popover.
    this.#flyout.innerHTML = '';
    const sources = this.#details.querySelectorAll<HTMLElement>(':scope > n-sidebar-nav-item');
    let first = true;
    for (const src of sources) {
      const value = src.getAttribute('value') ?? '';
      const label = src.getAttribute('label') || src.textContent?.trim() || '';
      const isDisabled = src.hasAttribute('aria-disabled');
      const opt = document.createElement('n-option');
      opt.setAttribute('value', value);
      opt.textContent = label;
      if (src.hasAttribute('aria-current')) opt.setAttribute('selected', '');
      if (isDisabled) opt.setAttribute('disabled', '');
      // WHY: Set tabindex so the listbox's RovingFocusController can manage
      // keyboard navigation. First non-disabled option gets tabindex="0".
      if (!isDisabled) {
        opt.setAttribute('tabindex', first ? '0' : '-1');
        first = false;
      }
      this.#flyout.appendChild(opt);
    }

    this.#flyoutOpen = true;
    this.#popover?.syncPopover(true);

    // WHY: Focus the first option so keyboard navigation works immediately.
    // Microtask ensures the popover is visible and options are upgraded.
    queueMicrotask(() => {
      const first = this.#flyout?.querySelector('n-option:not([disabled])') as HTMLElement | null;
      first?.focus();
    });
  }

  /** Clear the flyout and close the popover. Returns focus to the summary. */
  closeFlyout(): void {
    if (!this.#flyout) return;

    this.#flyout.innerHTML = '';
    this.#flyoutOpen = false;
    this.#popover?.syncPopover(false);

    // WHY: Return focus to the summary so keyboard users can continue navigating.
    const summary = this.#details?.querySelector('summary');
    summary?.focus();
  }

  // ── Flyout internal handlers ──

  #onFlyoutDismiss = (): void => {
    this.closeFlyout();
  };

  #onFlyoutSelect = (): void => {
    // WHY: Defer close to microtask so the native:select event finishes
    // bubbling to n-sidebar-nav before we clear the flyout DOM. Synchronous
    // innerHTML='' during bubble can interfere with propagation in browsers.
    queueMicrotask(() => this.closeFlyout());
  };

  #onFlyoutChange = (e: Event): void => {
    // WHY: The listbox dispatches native:change when a selection is made.
    // Stop it here so n-sidebar-nav doesn't get a duplicate native:change
    // (n-sidebar-nav dispatches its own native:change from the native:select handler).
    e.stopPropagation();
  };
}
