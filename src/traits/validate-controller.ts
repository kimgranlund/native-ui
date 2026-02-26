export interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

export interface ValidateOptions {
  rules?: ValidationRule[];
}

/** Runs validation rules against a value and dispatches `ui-valid` or `ui-invalid` events. */
export class ValidateController {
  readonly host: HTMLElement;
  rules: ValidationRule[];

  #valid = true;
  #errorMessage = '';

  constructor(host: HTMLElement, options: ValidateOptions = {}) {
    this.host = host;
    this.rules = options.rules ?? [];
  }

  get valid(): boolean { return this.#valid; }
  get errorMessage(): string { return this.#errorMessage; }

  validate(value?: string): boolean {
    const val = value ?? this.#getInputValue();

    // WHY: Run through rules in order, first failure wins
    for (const rule of this.rules) {
      if (!rule.test(val)) {
        this.#valid = false;
        this.#errorMessage = rule.message;
        this.host.setAttribute('invalid', '');
        this.host.setAttribute('aria-invalid', 'true');
        this.host.dispatchEvent(new CustomEvent('ui-invalid', {
          bubbles: true,
          composed: true,
          detail: { message: rule.message, value: val },
        }));
        return false;
      }
    }

    this.#valid = true;
    this.#errorMessage = '';
    this.host.removeAttribute('invalid');
    this.host.removeAttribute('aria-invalid');
    this.host.dispatchEvent(new CustomEvent('ui-valid', {
      bubbles: true,
      composed: true,
      detail: { value: val },
    }));
    return true;
  }

  clearValidation(): void {
    this.#valid = true;
    this.#errorMessage = '';
    this.host.removeAttribute('invalid');
    this.host.removeAttribute('aria-invalid');
  }

  destroy(): void {
    // No listeners to clean up
  }

  // WHY: Common validation rules as static factories
  static required(message = 'This field is required'): ValidationRule {
    return { test: (v: string) => v.trim().length > 0, message };
  }

  static minLength(min: number, message?: string): ValidationRule {
    return {
      test: (v: string) => v.length >= min,
      message: message ?? `Must be at least ${min} characters`,
    };
  }

  static maxLength(max: number, message?: string): ValidationRule {
    return {
      test: (v: string) => v.length <= max,
      message: message ?? `Must be at most ${max} characters`,
    };
  }

  static pattern(regex: RegExp, message = 'Invalid format'): ValidationRule {
    return { test: (v: string) => regex.test(v), message };
  }

  // WHY: Try to find an input value from the element or its children
  #getInputValue(): string {
    if (this.#hasStringValue(this.host)) return this.host.value;
    const input = this.host.querySelector<HTMLInputElement>('input, textarea, select');
    return input?.value ?? '';
  }

  #hasStringValue(el: HTMLElement): el is HTMLElement & { value: string } {
    return 'value' in el && typeof (el as HTMLElement & { value: unknown }).value === 'string';
  }
}
