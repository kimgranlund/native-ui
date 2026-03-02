import { NativeElement } from '../../core/native-element.ts';
import { uid } from '../../core/uid.ts';

/**
 * Form field wrapper that wires label, description, and error slots to a child control via ARIA.
 * @attr {boolean} disabled - Cascades disabled state to the child control
 * @attr {boolean} required - Cascades required state to the child control
 */
export class NField extends NativeElement {
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

    this.addEventListener('native:invalid', this.#onInvalid);
    this.addEventListener('native:valid', this.#onValid);
  }

  teardown(): void {
    this.removeEventListener('native:invalid', this.#onInvalid);
    this.removeEventListener('native:valid', this.#onValid);
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
      'n-input, n-select, n-combobox, n-checkbox, n-switch, n-radio, n-range, n-textarea, n-input-otp, input, select, textarea'
    );
    for (const el of candidates) {
      // Skip slotted elements (label, description, error)
      if (!el.hasAttribute('slot')) {
        this.#control = el;
        break;
      }
    }

    if (__DEV__ && !this.#control) {
      console.warn('[n-field] No form control found. Expected one of: n-input, n-select, n-combobox, n-checkbox, n-switch, n-radio, n-range, n-textarea, n-input-otp.');
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

    if (label) {
      this.#control.setAttribute('aria-labelledby', label.id);
    }

    // WHY: Only include description in initial describedby — error id is added
    // dynamically in #onInvalid/#onValid to avoid referencing hidden content
    if (desc) {
      this.#control.setAttribute('aria-describedby', desc.id);
    }
  }

  // ── State sync ──

  #syncDisabled(): void {
    const disabled = this.hasAttribute('disabled');
    // WHY: Set aria-disabled on the field itself so CSS [aria-disabled] rules fire
    if (disabled) {
      this.setAttribute('aria-disabled', 'true');
    } else {
      this.removeAttribute('aria-disabled');
    }
    if (!this.#control) return;
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
    // WHY: Add error id to describedby so AT announces the error message
    this.#updateDescribedBy(true);
  };

  #onValid = (): void => {
    this.removeAttribute('invalid');
    // WHY: Remove error id from describedby when valid
    this.#updateDescribedBy(false);
  };

  #updateDescribedBy(includeError: boolean): void {
    if (!this.#control) return;
    const desc = this.querySelector('[slot="description"]');
    const error = this.querySelector('[slot="error"]');
    const ids: string[] = [];
    if (desc) ids.push(desc.id);
    if (includeError && error) ids.push(error.id);
    if (ids.length) {
      this.#control.setAttribute('aria-describedby', ids.join(' '));
    } else {
      this.#control.removeAttribute('aria-describedby');
    }
  }
}
