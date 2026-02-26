import { UIElement } from '../../core/ui-element.ts';
import { uid } from '../../core/uid.ts';

/**
 * Form field wrapper that wires label, description, and error slots to a child control via ARIA.
 * @attr {boolean} disabled - Cascades disabled state to the child control
 * @attr {boolean} required - Cascades required state to the child control
 */
export class UIField extends UIElement {
  static observedAttributes = ['disabled', 'required'];

  #labelId = uid('field-label');
  #descId = uid('field-desc');
  #errorId = uid('field-err');
  #control: HTMLElement | null = null;

  setup(): void {
    super.setup();

    this.deferChildren(() => {
      this.#discoverControl();
      this.#wireIds();
      this.#wireAria();
      this.#syncDisabled();
      this.#syncRequired();
    });

    this.addEventListener('ui-invalid', this.#onInvalid);
    this.addEventListener('ui-valid', this.#onValid);
  }

  teardown(): void {
    this.removeEventListener('ui-invalid', this.#onInvalid);
    this.removeEventListener('ui-valid', this.#onValid);
    super.teardown();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'disabled':
        this.#syncDisabled();
        break;
      case 'required':
        this.#syncRequired();
        break;
    }
    super.attributeChangedCallback(name, old, val);
  }

  // ── Control discovery ──

  #discoverControl(): void {
    // Find first form-associated custom element or native input/select/textarea
    const candidates = this.querySelectorAll<HTMLElement>(
      'ui-input, ui-select, ui-combobox, ui-checkbox, ui-switch, ui-radio, ui-range, ui-textarea, ui-input-otp, input, select, textarea'
    );
    for (const el of candidates) {
      // Skip slotted elements (label, description, error)
      if (!el.hasAttribute('slot')) {
        this.#control = el;
        break;
      }
    }

    if (__DEV__ && !this.#control) {
      console.warn('[ui-field] No form control found. Expected one of: ui-input, ui-select, ui-combobox, ui-checkbox, ui-switch, ui-radio, ui-range, ui-textarea, ui-input-otp.');
    }
  }

  // ── ID wiring ──

  #wireIds(): void {
    const label = this.querySelector('[slot="label"]');
    const desc = this.querySelector('[slot="description"]');
    const error = this.querySelector('[slot="error"]');

    if (label && !label.id) label.id = this.#labelId;
    if (desc && !desc.id) desc.id = this.#descId;
    if (error && !error.id) error.id = this.#errorId;
  }

  // ── ARIA wiring ──

  #wireAria(): void {
    if (!this.#control) return;

    const label = this.querySelector('[slot="label"]');
    const desc = this.querySelector('[slot="description"]');
    const error = this.querySelector('[slot="error"]');

    if (label) {
      this.#control.setAttribute('aria-labelledby', label.id);
    }

    // Build describedby from available slots
    const describedBy: string[] = [];
    if (desc) describedBy.push(desc.id);
    if (error) describedBy.push(error.id);
    if (describedBy.length) {
      this.#control.setAttribute('aria-describedby', describedBy.join(' '));
    }
  }

  // ── State sync ──

  #syncDisabled(): void {
    if (!this.#control) return;
    const disabled = this.hasAttribute('disabled');
    if (disabled) {
      this.#control.setAttribute('disabled', '');
    } else {
      this.#control.removeAttribute('disabled');
    }
  }

  #syncRequired(): void {
    if (!this.#control) return;
    const required = this.hasAttribute('required');
    if (required) {
      this.#control.setAttribute('required', '');
    } else {
      this.#control.removeAttribute('required');
    }
  }

  // ── Validation events ──

  #onInvalid = (e: Event): void => {
    const ce = e as CustomEvent;
    this.setAttribute('invalid', '');
    // Update error text if provided in event detail
    const error = this.querySelector('[slot="error"]');
    if (error && ce.detail?.message) {
      error.textContent = ce.detail.message;
    }
  };

  #onValid = (): void => {
    this.removeAttribute('invalid');
  };
}
