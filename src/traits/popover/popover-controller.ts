import { uid } from '../../core/uid.ts';
import { DismissController } from '../dismiss/dismiss-controller.ts';

/** Wires anchor positioning between elements and manages popover show/hide with dismiss layer. */
export class PopoverController {
  readonly host: HTMLElement;
  readonly #dismiss: DismissController;

  #anchorEl: HTMLElement | null = null;
  #popoverEl: HTMLElement | null = null;

  constructor(host: HTMLElement) {
    this.host = host;
    this.#dismiss = new DismissController(host);
  }

  wirePopover(anchor: HTMLElement, popover: HTMLElement): void {
    this.#anchorEl = anchor;
    this.#popoverEl = popover;
    const id = uid('anchor');
    anchor.style.setProperty('anchor-name', `--${id}`);
    popover.style.setProperty('position-anchor', `--${id}`);
  }

  syncPopover(open: boolean): void {
    if (open) {
      this.#detectFlip();
      // WHY: showPopover() throws InvalidStateError if already open (e.g. effect re-run)
      try { this.#popoverEl?.showPopover(); } catch { /* already open */ }
      this.#dismiss.enable();
    } else {
      // WHY: hidePopover() throws InvalidStateError if already hidden (e.g. initial effect run)
      try { this.#popoverEl?.hidePopover(); } catch { /* already hidden */ }
      // WHY: Defer clearFlip until after the exit transition completes.
      // Clearing inline --n-popover-origin/--n-popover-from immediately would revert the
      // exit animation to the CSS default (top center) — wrong direction for flipped popovers.
      const popover = this.#popoverEl;
      if (popover) {
        let cleared = false;
        const clear = () => { if (cleared) return; cleared = true; this.#clearFlip(); };
        popover.addEventListener('transitionend', clear, { once: true });
        // Safety: clear even if transitionend doesn't fire (e.g. reduced motion, no transition)
        setTimeout(clear, 300);
      }
      this.#dismiss.disable();
    }
  }

  /** Detect if flip-block will place the popover above the anchor.
   *  Sets --n-popover-origin / --n-popover-from inline BEFORE showPopover()
   *  so @starting-style reads the correct animation direction. */
  #detectFlip(): void {
    const anchor = this.#anchorEl;
    const popover = this.#popoverEl;
    if (!anchor || !popover) return;

    // Briefly make popover measurable (still hidden — no paint between set/remove)
    popover.style.display = 'block';
    popover.style.visibility = 'hidden';
    const height = popover.offsetHeight;
    popover.style.removeProperty('display');
    popover.style.removeProperty('visibility');

    const anchorRect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;

    // Mirror the flip-block algorithm: flip when content overflows below and above has more room
    if (height > spaceBelow && spaceAbove > spaceBelow) {
      // Force above placement as a JS fallback when CSS position-try isn't applied.
      popover.style.setProperty('position-area', 'block-start span-inline-end');
      popover.style.setProperty('margin-block-start', '0');
      popover.style.setProperty('margin-block-end', 'var(--n-popover-gap)');
      popover.style.setProperty('--n-popover-origin', 'bottom center');
      popover.style.setProperty('--n-popover-from', 'perspective(800px) scale(0.96) rotateX(20deg)');
    } else {
      this.#clearFlip();
    }
  }

  #clearFlip(): void {
    this.#popoverEl?.style.removeProperty('position-area');
    this.#popoverEl?.style.removeProperty('margin-block-start');
    this.#popoverEl?.style.removeProperty('margin-block-end');
    this.#popoverEl?.style.removeProperty('--n-popover-origin');
    this.#popoverEl?.style.removeProperty('--n-popover-from');
  }

  destroy(): void {
    this.#dismiss.destroy();
    this.#clearFlip();
    this.#anchorEl?.style.removeProperty('anchor-name');
    this.#anchorEl = null;
    this.#popoverEl?.style.removeProperty('position-anchor');
    this.#popoverEl = null;
  }
}
