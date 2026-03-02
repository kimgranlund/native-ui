import { NativeElement, ResizeController } from '@nonoun/native-ui';
import type { NSidebarGroup } from './sidebar-group-element.ts';

/** Full-page layout with a resizable sidebar aside and content column.
 *  Coordinates nav-group flyout popovers when the sidebar is collapsed. */
export class NSidebar extends NativeElement {
  static observedAttributes = ['collapsed'];

  #sidebarResize: ResizeController | null = null;
  #resizeObserver: ResizeObserver | null = null;

  // Flyout coordination for collapsed sidebar mode
  #activeGroup: NSidebarGroup | null = null;
  #summaryListeners: Array<{ summary: HTMLElement; handler: (e: Event) => void }> = [];

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    // WHY: Guard with dataset.ready — attributeChangedCallback fires before
    // connectedCallback/setup() when attributes are set pre-connection.
    // #syncFlyoutMode() needs child nav-groups to be setup'd first.
    if (name === 'collapsed' && this.dataset.ready !== undefined) this.#syncFlyoutMode();
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();

    const aside = this.querySelector(':scope > [slot="sidebar"]') as HTMLElement | null;

    // Sidebar resize
    if (aside?.querySelector('.layout-resize-handle')) {
      this.#sidebarResize = new ResizeController(aside, {
        handleSelector: '.layout-resize-handle',
        axis: 'horizontal',
        min: 160,
        max: 400,
      });
    }

    // Measure header/footer heights for absolute overlay layout
    if (aside) this.#observeOverlays(aside);

    // ── Flyout coordination ──
    // WHY: When the sidebar is collapsed, nav-group headers become icon buttons.
    // Clicking them should open a flyout popover instead of toggling <details>.
    // The sidebar coordinator owns this behavior — nav-group doesn't know about sidebars.
    // WHY: queueMicrotask — child n-sidebar-group elements exist in the DOM but haven't
    // had their setup() called yet (they stamp <details>/<summary> in setup). The browser
    // processes connectedCallbacks in tree order, so the microtask runs after all children
    // are fully initialized.
    queueMicrotask(() => this.#syncFlyoutMode());

    // WHY: When a group closes its own flyout (via native:dismiss or option select),
    // clear our active reference so the coordinator stays in sync.
    this.addEventListener('native:dismiss', this.#onGroupDismiss);

    this.dataset.ready = '';
  }

  teardown(): void {
    this.removeEventListener('native:dismiss', this.#onGroupDismiss);
    this.#teardownFlyoutListeners();
    this.#activeGroup = null;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#sidebarResize?.destroy();
    this.#sidebarResize = null;
    super.teardown();
  }

  // ── Flyout coordination ──

  /** Attach or detach summary click interception based on collapsed state. */
  #syncFlyoutMode(): void {
    this.#teardownFlyoutListeners();

    if (!this.hasAttribute('collapsed')) {
      // Expanded: close any open flyout, no interception needed
      if (this.#activeGroup?.flyoutOpen) this.#activeGroup.closeFlyout();
      this.#activeGroup = null;
      return;
    }

    // Collapsed: intercept summary clicks on all nav-group descendants
    const groups = this.querySelectorAll<NSidebarGroup>('n-sidebar-group');
    for (const group of groups) {
      const summary = group.querySelector(':scope > details > summary') as HTMLElement | null;
      if (!summary) continue;

      const handler = (e: Event): void => {
        // WHY: Prevent <details> from toggling — we handle interaction via popover.
        e.preventDefault();

        if (this.#activeGroup === group && group.flyoutOpen) {
          group.closeFlyout();
          this.#activeGroup = null;
        } else {
          // Close previous flyout (mutual exclusion)
          if (this.#activeGroup?.flyoutOpen) this.#activeGroup.closeFlyout();
          group.openFlyout();
          this.#activeGroup = group;
        }
      };

      summary.addEventListener('click', handler);
      this.#summaryListeners.push({ summary, handler });
    }
  }

  /** Remove all summary click listeners. */
  #teardownFlyoutListeners(): void {
    for (const { summary, handler } of this.#summaryListeners) {
      summary.removeEventListener('click', handler);
    }
    this.#summaryListeners = [];
  }

  /** When a group closes its flyout internally (dismiss, option select),
   *  clear our active reference so we stay in sync. */
  #onGroupDismiss = (e: Event): void => {
    const group = (e.target as HTMLElement)?.closest?.('n-sidebar-group') as NSidebarGroup | null;
    if (group && group === this.#activeGroup) {
      this.#activeGroup = null;
    }
  };

  /** Watch header/footer size changes and sync CSS custom properties + data
   *  attributes so content gets correct padding offsets and fade masks. */
  #observeOverlays(aside: HTMLElement): void {
    const header = aside.querySelector('n-sidebar-header') as HTMLElement | null;
    const footer = aside.querySelector('n-sidebar-footer') as HTMLElement | null;
    const content = aside.querySelector('n-sidebar-content') as HTMLElement | null;
    if (!content) return;

    const sync = (): void => {
      const hh = header ? header.offsetHeight : 0;
      const fh = footer ? footer.offsetHeight : 0;
      aside.style.setProperty('--n-sidebar-header-height', `${hh}px`);
      aside.style.setProperty('--n-sidebar-footer-height', `${fh}px`);

      if (header) content.dataset.hasHeader = '';
      else delete content.dataset.hasHeader;
      if (footer) content.dataset.hasFooter = '';
      else delete content.dataset.hasFooter;
    };

    // Initial sync
    sync();

    // Re-sync when header/footer resize (e.g. collapsed mode changes height)
    const targets: HTMLElement[] = [];
    if (header) targets.push(header);
    if (footer) targets.push(footer);

    if (targets.length > 0) {
      this.#resizeObserver = new ResizeObserver(sync);
      for (const t of targets) this.#resizeObserver.observe(t);
    }
  }
}
