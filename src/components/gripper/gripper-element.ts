import { NativeElement } from '../../core/native-element.ts';
import { uid } from '../../core/uid.ts';
import { ResizeController } from '../../traits/resize-controller.ts';
import type { HandlePosition } from '../../traits/resize-controller.ts';

export type GripperMode = 'resize-horizontal' | 'resize-vertical' | 'resize-corner';

export type GripperPlacement =
  | 'start' | 'end' | 'top' | 'bottom'
  | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';

const PLACEMENT_MAP: Record<string, string> = {
  'start': 'inline-start center',
  'end': 'inline-end center',
  'top': 'block-start center',
  'bottom': 'block-end center',
  'top-start': 'block-start inline-start',
  'top-end': 'block-start inline-end',
  'bottom-start': 'block-end inline-start',
  'bottom-end': 'block-end inline-end',
};

/** Maps gripper placement to ResizeController HandlePosition for corner mode. */
const PLACEMENT_TO_HANDLE: Record<string, HandlePosition> = {
  'bottom-end': 'bottom-right',
  'bottom-start': 'bottom-left',
  'top-end': 'top-right',
  'top-start': 'top-left',
};

/**
 * Declarative gripper handle that escapes overflow via Popover API
 * and positions itself via CSS Anchor Positioning. Delegates resize
 * logic to ResizeController.
 *
 * @attr {string} mode - Grip mode: resize-horizontal, resize-vertical, resize-corner
 * @attr {string} for - ID of the target element to manipulate
 * @attr {string} placement - Where to place relative to target: start, end, top, bottom, top-start, etc.
 * @attr {number} min - Minimum value (px) for resize (both axes fallback)
 * @attr {number} max - Maximum value (px) for resize (both axes fallback)
 * @attr {number} min-width - Minimum width (px) for corner mode. Falls back to `min`.
 * @attr {number} max-width - Maximum width (px) for corner mode. Falls back to `max`.
 * @attr {number} min-height - Minimum height (px) for corner mode. Falls back to `min`.
 * @attr {number} max-height - Maximum height (px) for corner mode. Falls back to `max`.
 * @attr {number} step - Snap-to-grid increment (px)
 * @attr {boolean} reverse - Reverse drag direction
 * @attr {boolean} disabled - Disable interaction
 */
export class NGripper extends NativeElement {
  static observedAttributes = ['mode', 'for', 'placement', 'min', 'max', 'min-width', 'max-width', 'min-height', 'max-height', 'step', 'reverse', 'disabled'];

  #target: HTMLElement | null = null;
  #anchorId = '';
  #ctrl: ResizeController | null = null;
  #isGripping = false;

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    // Render in top layer via popover
    this.setAttribute('popover', 'manual');
    try { this.showPopover(); } catch { /* already open */ }

    // Listen for resize events from controller (fired on self via eventTarget)
    this.addEventListener('native:resize-start', this.#onResizeStart);
    this.addEventListener('native:resize-move', this.#onResizeMove);
    this.addEventListener('native:resize-end', this.#onResizeEnd);
    this.addEventListener('native:resize-cancel', this.#onResizeCancel);

    this.#wireTarget();
  }

  teardown(): void {
    this.#isGripping = false;
    document.removeEventListener('keydown', this.#onArrowKey);

    this.removeEventListener('native:resize-start', this.#onResizeStart);
    this.removeEventListener('native:resize-move', this.#onResizeMove);
    this.removeEventListener('native:resize-end', this.#onResizeEnd);
    this.removeEventListener('native:resize-cancel', this.#onResizeCancel);

    this.#unwireTarget();
    try { this.hidePopover(); } catch { /* already hidden */ }
    super.teardown();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (!this.isConnected) return;

    if (name === 'for' || name === 'mode') {
      this.#unwireTarget();
      this.#wireTarget();
    } else if (name === 'placement') {
      this.#applyPlacement();
      // Update data-handle for corner mode
      if (this.#ctrl && this.getAttribute('mode') === 'resize-corner') {
        const handle = PLACEMENT_TO_HANDLE[val ?? 'bottom-end'];
        if (handle) {
          this.dataset.handle = handle;
          this.#ctrl.handles = [handle];
        }
      }
    } else if (this.#ctrl) {
      if (name === 'min') this.#ctrl.min = parseFloat(val ?? '0') || 0;
      else if (name === 'max') this.#ctrl.max = parseFloat(val ?? '') || Infinity;
      else if (name === 'disabled') this.#ctrl.disabled = val !== null;
      else if (name === 'reverse') this.#ctrl.reverse = val !== null;
      else if (name === 'step') this.#ctrl.step = parseFloat(val ?? '0') || 0;
      else if (name === 'min-width') this.#ctrl.minWidth = this.#parseOptional(val);
      else if (name === 'max-width') this.#ctrl.maxWidth = this.#parseOptional(val);
      else if (name === 'min-height') this.#ctrl.minHeight = this.#parseOptional(val);
      else if (name === 'max-height') this.#ctrl.maxHeight = this.#parseOptional(val);
    }

    super.attributeChangedCallback(name, old, val);
  }

  // ── Target + Anchor wiring ──

  #wireTarget(): void {
    const targetId = this.getAttribute('for');
    if (!targetId) return;
    this.#target = document.getElementById(targetId);
    if (!this.#target) return;

    // Wire CSS anchor positioning
    this.#anchorId = uid('anchor');
    this.#target.style.setProperty('anchor-name', `--${this.#anchorId}`);
    this.style.setProperty('position-anchor', `--${this.#anchorId}`);

    this.#applyPlacement();
    this.#applyAnchorSizing();
    this.#createController();
  }

  #unwireTarget(): void {
    this.#ctrl?.destroy();
    this.#ctrl = null;

    if (this.#target) {
      this.#target.style.removeProperty('anchor-name');
      this.#target = null;
    }
    this.style.removeProperty('position-anchor');
    this.style.removeProperty('position-area');
    this.style.removeProperty('width');
    this.style.removeProperty('height');
    delete this.dataset.handle;
    this.#anchorId = '';
  }

  #createController(): void {
    if (!this.#target) return;

    const mode = this.getAttribute('mode') ?? 'resize-horizontal';
    const placement = this.getAttribute('placement') ?? 'end';

    let axis: 'horizontal' | 'vertical' | 'both' = 'horizontal';
    let handleMode: 'edge' | 'corner' = 'edge';
    let handles: HandlePosition[] | undefined;

    if (mode === 'resize-vertical') {
      axis = 'vertical';
    } else if (mode === 'resize-corner') {
      axis = 'both';
      handleMode = 'corner';
      const handle = PLACEMENT_TO_HANDLE[placement] ?? 'bottom-right';
      this.dataset.handle = handle;
      handles = [handle];
    }

    this.#ctrl = new ResizeController(this.#target, {
      handle: this,
      eventTarget: this,
      axis,
      handleMode,
      handles,
      min: parseFloat(this.getAttribute('min') ?? '0') || 0,
      max: parseFloat(this.getAttribute('max') ?? '') || Infinity,
      minWidth: this.#parseOptional(this.getAttribute('min-width')),
      maxWidth: this.#parseOptional(this.getAttribute('max-width')),
      minHeight: this.#parseOptional(this.getAttribute('min-height')),
      maxHeight: this.#parseOptional(this.getAttribute('max-height')),
      step: parseFloat(this.getAttribute('step') ?? '0') || 0,
      reverse: this.hasAttribute('reverse'),
      disabled: this.hasAttribute('disabled'),
      stateAttribute: 'gripping',
    });
  }

  #parseOptional(val: string | null): number | undefined {
    if (!val) return undefined;
    const n = parseFloat(val);
    return isNaN(n) ? undefined : n;
  }

  #applyPlacement(): void {
    const placement = this.getAttribute('placement') ?? 'end';
    const area = PLACEMENT_MAP[placement];
    if (area) {
      this.style.setProperty('position-area', area);
    }
  }

  #applyAnchorSizing(): void {
    const mode = this.getAttribute('mode') ?? 'resize-horizontal';

    if (mode === 'resize-horizontal') {
      // Height matches target's block size
      this.style.setProperty('height', 'anchor-size(block)');
    } else if (mode === 'resize-vertical') {
      // Width matches target's inline size
      this.style.setProperty('width', 'anchor-size(inline)');
    }
    // Corner mode: fixed 12×12 from CSS, no anchor sizing needed
  }

  // ── Resize event interception → grip events ──

  #onResizeStart = (e: Event): void => {
    e.stopImmediatePropagation();
    if (!this.#target) return;

    this.#isGripping = true;
    document.addEventListener('keydown', this.#onArrowKey);

    const ce = e as CustomEvent;
    this.#target.dispatchEvent(new CustomEvent('native:grip-start', {
      bubbles: true,
      composed: true,
      detail: {
        mode: this.getAttribute('mode') ?? 'resize-horizontal',
        placement: this.getAttribute('placement') ?? 'end',
        startValue: { width: ce.detail.width, height: ce.detail.height },
      },
    }));
  };

  #onResizeMove = (e: Event): void => {
    e.stopImmediatePropagation();
    if (!this.#target) return;

    const ce = e as CustomEvent;
    this.#target.dispatchEvent(new CustomEvent('native:grip-move', {
      bubbles: true,
      composed: true,
      detail: {
        mode: this.getAttribute('mode') ?? 'resize-horizontal',
        placement: this.getAttribute('placement') ?? 'end',
        value: { width: ce.detail.width, height: ce.detail.height },
        delta: ce.detail.delta ?? { dx: 0, dy: 0 },
      },
    }));
  };

  #onResizeEnd = (e: Event): void => {
    e.stopImmediatePropagation();
    if (!this.#target) return;

    this.#isGripping = false;
    document.removeEventListener('keydown', this.#onArrowKey);

    const ce = e as CustomEvent;
    this.#target.dispatchEvent(new CustomEvent('native:grip-end', {
      bubbles: true,
      composed: true,
      detail: {
        mode: this.getAttribute('mode') ?? 'resize-horizontal',
        placement: this.getAttribute('placement') ?? 'end',
        value: { width: ce.detail.width, height: ce.detail.height },
      },
    }));
  };

  #onResizeCancel = (e: Event): void => {
    e.stopImmediatePropagation();
    if (!this.#target) return;

    this.#isGripping = false;
    document.removeEventListener('keydown', this.#onArrowKey);

    this.#target.dispatchEvent(new CustomEvent('native:grip-cancel', {
      bubbles: true,
      composed: true,
      detail: {
        mode: this.getAttribute('mode') ?? 'resize-horizontal',
        placement: this.getAttribute('placement') ?? 'end',
      },
    }));
  };

  // ── Arrow key nudging (gripper-specific) ──

  #onArrowKey = (e: KeyboardEvent): void => {
    if (!this.#isGripping || !this.#target || !this.#ctrl) return;

    const mode = this.getAttribute('mode') ?? 'resize-horizontal';
    const placement = this.getAttribute('placement') ?? 'end';
    const step = this.#ctrl.step || 1;
    const sign = this.#ctrl.reverse ? -1 : 1;
    const minW = this.#ctrl.minWidth ?? this.#ctrl.min;
    const maxW = this.#ctrl.maxWidth ?? this.#ctrl.max;
    const minH = this.#ctrl.minHeight ?? this.#ctrl.min;
    const maxH = this.#ctrl.maxHeight ?? this.#ctrl.max;
    let handled = false;

    if (mode === 'resize-horizontal' || mode === 'resize-corner') {
      if (e.key === 'ArrowRight') {
        const rect = this.#target.getBoundingClientRect();
        const w = Math.min(maxW, Math.max(minW, rect.width + step * sign));
        this.#target.style.width = `${w}px`;
        handled = true;
      } else if (e.key === 'ArrowLeft') {
        const rect = this.#target.getBoundingClientRect();
        const w = Math.min(maxW, Math.max(minW, rect.width - step * sign));
        this.#target.style.width = `${w}px`;
        handled = true;
      }
    }

    if (mode === 'resize-vertical' || mode === 'resize-corner') {
      if (e.key === 'ArrowDown') {
        const rect = this.#target.getBoundingClientRect();
        const h = Math.min(maxH, Math.max(minH, rect.height + step * sign));
        this.#target.style.height = `${h}px`;
        handled = true;
      } else if (e.key === 'ArrowUp') {
        const rect = this.#target.getBoundingClientRect();
        const h = Math.min(maxH, Math.max(minH, rect.height - step * sign));
        this.#target.style.height = `${h}px`;
        handled = true;
      }
    }

    if (handled) {
      e.preventDefault();
      const rect = this.#target.getBoundingClientRect();
      this.#target.dispatchEvent(new CustomEvent('native:grip-move', {
        bubbles: true,
        composed: true,
        detail: {
          mode,
          placement,
          value: { width: rect.width, height: rect.height },
          delta: { dx: 0, dy: 0 },
        },
      }));
    }
  };
}
