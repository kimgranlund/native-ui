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
      this.#clearFlip();
      // WHY: showPopover() throws InvalidStateError if already open (e.g. effect re-run)
      try { this.#popoverEl?.showPopover(); } catch { /* already open */ }
      // Detect flip AFTER showPopover — popover is now in the top layer with final position
      this.#detectFlip();
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

  /** Detect popover placement relative to anchor and set transform origin accordingly.
   *  Called AFTER showPopover() — reads actual rendered position in top layer.
   *
   *  Rule: origin points toward the anchor (trigger).
   *    below anchor → top center      (default, no override needed)
   *    above anchor → bottom center
   *    left of anchor → center right
   *    right of anchor → center left
   */
  #detectFlip(): void {
    const anchor = this.#anchorEl;
    const popover = this.#popoverEl;
    if (!anchor || !popover) return;

    const a = anchor.getBoundingClientRect();
    const p = popover.getBoundingClientRect();
    const threshold = 4;

    // Determine primary placement direction
    const isAbove = p.bottom <= a.top + threshold;
    const isLeft = p.right <= a.left + threshold;
    const isRight = p.left >= a.right - threshold;
    // Default (below) needs no override — CSS default is top center

    let origin: string | null = null;
    let from: string | null = null;

    if (isAbove) {
      origin = 'bottom center';
      from = 'perspective(800px) scale(0.96) rotateX(20deg)';
    } else if (isLeft) {
      origin = 'center right';
      from = 'perspective(800px) scale(0.96) rotateY(-20deg)';
    } else if (isRight) {
      origin = 'center left';
      from = 'perspective(800px) scale(0.96) rotateY(20deg)';
    }

    if (origin && from) {
      popover.style.setProperty('--n-popover-origin', origin);
      popover.style.setProperty('--n-popover-from', from);
      // Restart entry animation with corrected origin
      popover.style.transition = 'none';
      popover.offsetHeight; // force reflow
      popover.style.removeProperty('transition');
    }
  }

  #clearFlip(): void {
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
