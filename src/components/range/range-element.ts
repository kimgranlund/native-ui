import { signal } from '../../reactivity/signal.ts';
import { NativeElement } from '../../core/native-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { FormAssociable } from '../../core/form-associable.ts';

/**
 * Range slider input with keyboard and pointer interaction.
 * @attr {number} value - Current value (default 50)
 * @attr {number} min - Minimum value (default 0)
 * @attr {number} max - Maximum value (default 100)
 * @attr {number} step - Step increment (default 1)
 * @attr {boolean} disabled - Disables interaction
 * @attr {boolean} required - Marks as required for form validation
 * @attr {string} name - Form field name
 * @fires native:input - Fired continuously during drag with `{ value }` detail
 * @fires native:change - Fired on drag end or keyboard change with `{ value }` detail
 */
export class NRange extends FormAssociable(NativeElement) {
  static observedAttributes = ['value', 'min', 'max', 'step', 'disabled', 'name', 'required'];

  #internals: ElementInternals;
  #disabled = signal(false);
  #required = signal(false);
  #value = signal(50);
  #initialValue = 50;
  #min = signal(0);
  #max = signal(100);
  #step = signal(1);
  #thumb: HTMLDivElement | null = null;
  #dragging = false;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'slider';
  }

  // ── Value ──

  get value(): number { return this.#value.value; }
  set value(val: number) {
    this.#value.value = this.#clamp(val);
  }

  // ── Min ──

  get min(): number { return this.#min.value; }
  set min(val: number) {
    this.#min.value = val;
    this.setAttribute('min', String(val));
  }

  // ── Max ──

  get max(): number { return this.#max.value; }
  set max(val: number) {
    this.#max.value = val;
    this.setAttribute('max', String(val));
  }

  // ── Step ──

  get step(): number { return this.#step.value; }
  set step(val: number) {
    this.#step.value = val;
    this.setAttribute('step', String(val));
  }

  // ── Disabled ──

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  // ── Required ──

  get required(): boolean { return this.#required.value; }
  set required(val: boolean) {
    this.#required.value = val;
    this.toggleAttribute('required', val);
  }

  // ── Name ──

  get name(): string { return this.getAttribute('name') ?? ''; }
  set name(val: string) { this.setAttribute('name', val); }

  // ── Attribute sync ──

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'value':
        this.#value.value = this.#clamp(parseFloat(val ?? '50') || 50);
        break;
      case 'min':
        this.#min.value = parseFloat(val ?? '0') || 0;
        break;
      case 'max':
        this.#max.value = parseFloat(val ?? '100') || 100;
        break;
      case 'step':
        this.#step.value = parseFloat(val ?? '1') || 1;
        break;
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
      case 'required':
        this.#required.value = val !== null;
        break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Lifecycle ──

  setup(): void {
    super.setup();
    this.#initialValue = this.#value.value;

    // Create thumb element
    this.#thumb = document.createElement('div');
    this.#thumb.classList.add('n-range-thumb');
    this.appendChild(this.#thumb);

    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');

    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals, { manageTabindex: true }));

    // WHY: Sync initial required signal from attribute (attributeChangedCallback fires before setup)
    this.#required.value = this.hasAttribute('required');

    // Effect: sync progress CSS custom property + ARIA + form value
    this.addEffect(() => {
      const val = this.#value.value;
      const progress = this.#getProgress();
      this.style.setProperty('--n-progress', String(progress));
      // WHY: setAttribute (not internals.ariaValueX) so AT reads DOM attributes
      this.setAttribute('aria-valuenow', String(val));
      this.setAttribute('aria-valuemin', String(this.#min.value));
      this.setAttribute('aria-valuemax', String(this.#max.value));
      this.#internals.setFormValue(String(val));
    });

    this.addEventListener('pointerdown', this.#onPointerDown);
    this.addEventListener('keydown', this.#onKeyDown);
  }

  teardown(): void {
    this.removeEventListener('pointerdown', this.#onPointerDown);
    this.removeEventListener('keydown', this.#onKeyDown);
    if (this.#thumb) {
      this.#thumb.remove();
      this.#thumb = null;
    }
    super.teardown();
  }

  // ── Form callbacks ──

  override onFormDisabled(disabled: boolean): void {
    this.#disabled.value = disabled;
  }

  override onFormReset(): void {
    this.#value.value = this.#initialValue;
  }

  override onFormStateRestore(state: string | FormData | null): void {
    if (typeof state === 'string') {
      const num = parseFloat(state);
      if (!isNaN(num)) this.value = num;
    }
  }

  // ── Helpers ──

  #clamp(val: number): number {
    const min = this.#min.value;
    const max = this.#max.value;
    const step = this.#step.value;
    // Snap to step
    const snapped = Math.round((val - min) / step) * step + min;
    return Math.min(max, Math.max(min, snapped));
  }

  #getProgress(): number {
    const range = this.#max.value - this.#min.value;
    if (range === 0) return 0;
    return (this.#value.value - this.#min.value) / range;
  }

  #valueFromPointer(e: PointerEvent): number {
    const rect = this.getBoundingClientRect();
    const thumbSize = this.#thumb?.offsetWidth ?? 0;
    const trackStart = thumbSize / 2;
    const trackWidth = rect.width - thumbSize;
    if (trackWidth <= 0) return this.#min.value;
    const x = e.clientX - rect.left - trackStart;
    const ratio = Math.min(1, Math.max(0, x / trackWidth));
    return this.#min.value + ratio * (this.#max.value - this.#min.value);
  }

  // ── Pointer events ──

  #onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    if (this.#disabled.value) return;

    this.setPointerCapture(e.pointerId);
    this.#dragging = true;
    this.toggleAttribute('pressed', true);

    const val = this.#clamp(this.#valueFromPointer(e));
    this.#value.value = val;
    this.#dispatchInput();

    this.addEventListener('pointermove', this.#onPointerMove);
    this.addEventListener('pointerup', this.#onPointerUp);
    this.addEventListener('pointercancel', this.#onPointerCancel);
  };

  #onPointerMove = (e: PointerEvent): void => {
    if (!this.#dragging || this.#disabled.value) return;
    const val = this.#clamp(this.#valueFromPointer(e));
    if (val !== this.#value.value) {
      this.#value.value = val;

      this.#dispatchInput();
    }
  };

  #onPointerUp = (): void => {
    this.#dragging = false;
    this.removeAttribute('pressed');
    this.removeEventListener('pointermove', this.#onPointerMove);
    this.removeEventListener('pointerup', this.#onPointerUp);
    this.removeEventListener('pointercancel', this.#onPointerCancel);
    this.#dispatchChange();
  };

  #onPointerCancel = (): void => {
    this.#dragging = false;
    this.removeAttribute('pressed');
    this.removeEventListener('pointermove', this.#onPointerMove);
    this.removeEventListener('pointerup', this.#onPointerUp);
    this.removeEventListener('pointercancel', this.#onPointerCancel);
  };

  // ── Keyboard ──

  #onKeyDown = (e: KeyboardEvent): void => {
    if (this.#disabled.value) return;
    const step = this.#step.value;
    const bigStep = step * 10;
    let val = this.#value.value;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        val += step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        val -= step;
        break;
      case 'PageUp':
        val += bigStep;
        break;
      case 'PageDown':
        val -= bigStep;
        break;
      case 'Home':
        val = this.#min.value;
        break;
      case 'End':
        val = this.#max.value;
        break;
      default:
        return;
    }

    e.preventDefault();
    val = this.#clamp(val);
    if (val !== this.#value.value) {
      this.#value.value = val;

      this.#dispatchInput();
      this.#dispatchChange();
    }
  };

  // ── Events ──

  #dispatchInput(): void {
    this.dispatchEvent(new CustomEvent('native:input', {
      bubbles: true,
      composed: true,
      detail: { value: this.#value.value },
    }));
  }

  #dispatchChange(): void {
    this.dispatchEvent(new CustomEvent('native:change', {
      bubbles: true,
      composed: true,
      detail: { value: this.#value.value },
    }));
  }
}
