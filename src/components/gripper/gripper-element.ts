import { NativeElement } from '../../core/native-element.ts';
import { uid } from '../../core/uid.ts';

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

/** Sign multipliers for corner handles — maps dx/dy to width/height changes. */
const CORNER_SIGNS: Record<string, { sx: number; sy: number }> = {
  'bottom-end': { sx: 1, sy: 1 },
  'bottom-start': { sx: -1, sy: 1 },
  'top-end': { sx: 1, sy: -1 },
  'top-start': { sx: -1, sy: -1 },
};

/**
 * Declarative gripper handle that escapes overflow via Popover API
 * and positions itself via CSS Anchor Positioning.
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

  // Drag state
  #isGripping = false;
  #startX = 0;
  #startY = 0;
  #startWidth = 0;
  #startHeight = 0;

  // ── Lifecycle ──

  setup(): void {
    super.setup();

    // Render in top layer via popover
    this.setAttribute('popover', 'manual');
    try { this.showPopover(); } catch { /* already open */ }

    this.#wireTarget();
    this.addEventListener('pointerdown', this.#onPointerDown);
  }

  teardown(): void {
    this.#cleanup();
    this.removeEventListener('pointerdown', this.#onPointerDown);
    this.#unwireTarget();
    try { this.hidePopover(); } catch { /* already hidden */ }
    super.teardown();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (!this.isConnected) return;

    if (name === 'for') {
      this.#unwireTarget();
      this.#wireTarget();
    } else if (name === 'placement') {
      this.#applyPlacement();
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
  }

  #unwireTarget(): void {
    if (this.#target) {
      this.#target.style.removeProperty('anchor-name');
      this.#target = null;
    }
    this.style.removeProperty('position-anchor');
    this.style.removeProperty('position-area');
    this.style.removeProperty('width');
    this.style.removeProperty('height');
    this.#anchorId = '';
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

  // ── Constraint helpers ──

  /** Read per-axis min/max, falling back to generic min/max. */
  #getConstraints(): { minW: number; maxW: number; minH: number; maxH: number } {
    const min = parseFloat(this.getAttribute('min') ?? '0') || 0;
    const max = parseFloat(this.getAttribute('max') ?? 'Infinity') || Infinity;
    return {
      minW: parseFloat(this.getAttribute('min-width') ?? '') || min,
      maxW: parseFloat(this.getAttribute('max-width') ?? '') || max,
      minH: parseFloat(this.getAttribute('min-height') ?? '') || min,
      maxH: parseFloat(this.getAttribute('max-height') ?? '') || max,
    };
  }

  // ── Pointer interaction ──

  #onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    if (this.hasAttribute('disabled')) return;
    if (!this.#target) return;

    e.preventDefault();
    this.#isGripping = true;
    this.#startX = e.clientX;
    this.#startY = e.clientY;

    const rect = this.#target.getBoundingClientRect();
    this.#startWidth = rect.width;
    this.#startHeight = rect.height;

    this.setPointerCapture(e.pointerId);
    this.#target.setAttribute('gripping', '');
    this.setAttribute('gripping', '');

    document.addEventListener('pointermove', this.#onPointerMove);
    document.addEventListener('pointerup', this.#onPointerUp);
    document.addEventListener('pointercancel', this.#onPointerCancel);
    document.addEventListener('keydown', this.#onKeyDown);

    this.#target.dispatchEvent(new CustomEvent('native:grip-start', {
      bubbles: true,
      composed: true,
      detail: {
        mode: this.getAttribute('mode') ?? 'resize-horizontal',
        placement: this.getAttribute('placement') ?? 'end',
        startValue: { width: this.#startWidth, height: this.#startHeight },
      },
    }));
  };

  #onPointerMove = (e: PointerEvent): void => {
    if (!this.#isGripping || !this.#target) return;

    const mode = this.getAttribute('mode') ?? 'resize-horizontal';
    const placement = this.getAttribute('placement') ?? 'end';
    const reverse = this.hasAttribute('reverse');
    const step = parseFloat(this.getAttribute('step') ?? '0') || 0;
    const { minW, maxW, minH, maxH } = this.#getConstraints();

    let dx = e.clientX - this.#startX;
    let dy = e.clientY - this.#startY;

    if (step > 0) {
      dx = Math.round(dx / step) * step;
      dy = Math.round(dy / step) * step;
    }

    if (mode === 'resize-corner') {
      const signs = CORNER_SIGNS[placement] ?? { sx: 1, sy: 1 };
      const w = Math.min(maxW, Math.max(minW, this.#startWidth + dx * signs.sx));
      const h = Math.min(maxH, Math.max(minH, this.#startHeight + dy * signs.sy));
      this.#target.style.width = `${w}px`;
      this.#target.style.height = `${h}px`;
    } else {
      const sign = reverse ? -1 : 1;

      if (mode === 'resize-horizontal') {
        const w = Math.min(maxW, Math.max(minW, this.#startWidth + dx * sign));
        this.#target.style.width = `${w}px`;
      } else if (mode === 'resize-vertical') {
        const h = Math.min(maxH, Math.max(minH, this.#startHeight + dy * sign));
        this.#target.style.height = `${h}px`;
      }
    }

    const rect = this.#target.getBoundingClientRect();
    this.#target.dispatchEvent(new CustomEvent('native:grip-move', {
      bubbles: true,
      composed: true,
      detail: {
        mode,
        placement,
        value: { width: rect.width, height: rect.height },
        delta: { dx, dy },
      },
    }));
  };

  #onPointerUp = (_e: PointerEvent): void => {
    if (!this.#isGripping || !this.#target) return;

    const rect = this.#target.getBoundingClientRect();
    this.#target.dispatchEvent(new CustomEvent('native:grip-end', {
      bubbles: true,
      composed: true,
      detail: {
        mode: this.getAttribute('mode') ?? 'resize-horizontal',
        placement: this.getAttribute('placement') ?? 'end',
        value: { width: rect.width, height: rect.height },
      },
    }));

    this.#cleanup();
  };

  #onPointerCancel = (): void => {
    if (!this.#isGripping) return;
    this.#revert();
    this.#cleanup();
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (!this.#isGripping || !this.#target) return;

    const placement = this.getAttribute('placement') ?? 'end';

    if (e.key === 'Escape') {
      e.preventDefault();
      this.#revert();

      this.#target.dispatchEvent(new CustomEvent('native:grip-cancel', {
        bubbles: true,
        composed: true,
        detail: {
          mode: this.getAttribute('mode') ?? 'resize-horizontal',
          placement,
        },
      }));

      this.#cleanup();
      return;
    }

    // Arrow key nudging
    const step = parseFloat(this.getAttribute('step') ?? '1') || 1;
    const mode = this.getAttribute('mode') ?? 'resize-horizontal';
    const reverse = this.hasAttribute('reverse');
    const { minW, maxW, minH, maxH } = this.#getConstraints();
    const sign = reverse ? -1 : 1;
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

  // ── Helpers ──

  #revert(): void {
    if (!this.#target) return;
    const mode = this.getAttribute('mode') ?? 'resize-horizontal';

    if (mode === 'resize-horizontal' || mode === 'resize-corner') {
      this.#target.style.width = `${this.#startWidth}px`;
    }
    if (mode === 'resize-vertical' || mode === 'resize-corner') {
      this.#target.style.height = `${this.#startHeight}px`;
    }
  }

  #cleanup(): void {
    this.#isGripping = false;
    this.#target?.removeAttribute('gripping');
    this.removeAttribute('gripping');
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
    document.removeEventListener('pointercancel', this.#onPointerCancel);
    document.removeEventListener('keydown', this.#onKeyDown);
  }
}
