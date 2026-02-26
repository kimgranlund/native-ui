// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-button.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('ui-button');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// Helper: temporarily override attachInternals so the UIButton constructor
// picks up a stub that includes a live `form` reference. The constructor calls
// attachInternals() synchronously, so we must patch the prototype before
// createElement and restore it afterwards.
function createWithFormInternals(
  formEl: HTMLFormElement,
  attrs: Record<string, string> = {},
): HTMLElement {
  const requestSubmit = vi.fn();
  const reset = vi.fn();

  const originalAttach = HTMLElement.prototype.attachInternals;
  HTMLElement.prototype.attachInternals = function () {
    return {
      role: null,
      form: formEl as unknown as HTMLFormElement & { requestSubmit: typeof requestSubmit; reset: typeof reset },
      states: new Set(),
      setFormValue() {},
      setValidity() {},
      reportValidity() { return true; },
      checkValidity() { return true; },
      validationMessage: '',
      willValidate: true,
      validity: { valid: true },
      labels: [],
      shadowRoot: null,
    } as unknown as ElementInternals;
  };

  // Patch the form mock methods so callers can access them
  (formEl as any).__requestSubmit = requestSubmit;
  (formEl as any).__reset = reset;
  formEl.requestSubmit = requestSubmit;
  formEl.reset = resetFn => { reset(resetFn); };

  const el = document.createElement('ui-button');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  formEl.appendChild(el);

  HTMLElement.prototype.attachInternals = originalAttach;

  return el;
}

describe('ui-button', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-button')).toBeDefined();
  });

  it('defaults to type="button"', () => {
    const el = create();
    expect((el as any).type).toBe('button');
  });

  it('sets tabindex=0 on setup', () => {
    const el = create();
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('sets tabindex=-1 when disabled (manageTabindex)', () => {
    const el = create();
    (el as any).disabled = true;
    expect(el.getAttribute('tabindex')).toBe('-1');
    (el as any).disabled = false;
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('disabled property toggles attribute', () => {
    const el = create();
    expect(el.hasAttribute('disabled')).toBe(false);

    (el as any).disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    // ARIA: disabled sets aria-disabled via createDisabledEffect
    expect(el.getAttribute('aria-disabled')).toBe('true');

    (el as any).disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    // ARIA: removing disabled clears aria-disabled
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('disabled attribute updates property', () => {
    const el = create();
    expect((el as any).disabled).toBe(false);

    el.setAttribute('disabled', '');
    expect((el as any).disabled).toBe(true);
    // ARIA: attribute-driven disabled sets aria-disabled
    expect(el.getAttribute('aria-disabled')).toBe('true');

    el.removeAttribute('disabled');
    expect((el as any).disabled).toBe(false);
    // ARIA: removing disabled attribute clears aria-disabled
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('type property reflects to attribute', () => {
    const el = create();
    (el as any).type = 'submit';
    expect(el.getAttribute('type')).toBe('submit');

    (el as any).type = 'reset';
    expect(el.getAttribute('type')).toBe('reset');

    (el as any).type = 'button';
    expect(el.getAttribute('type')).toBe('button');
  });

  it('type attribute updates property', () => {
    const el = create();
    el.setAttribute('type', 'submit');
    expect((el as any).type).toBe('submit');

    el.setAttribute('type', 'reset');
    expect((el as any).type).toBe('reset');
  });

  it('does not submit form when type="button" (default)', () => {
    const form = document.createElement('form');
    document.body.appendChild(form);

    const requestSubmit = vi.fn();
    const resetFn = vi.fn();
    form.requestSubmit = requestSubmit;
    form.reset = resetFn;

    const el = createWithFormInternals(form);

    // type defaults to 'button' — #onPress reads type and does not call submit/reset
    el.dispatchEvent(new Event('ui-press', { bubbles: true }));

    expect((form as any).__requestSubmit).not.toHaveBeenCalled();
    expect((form as any).__reset).not.toHaveBeenCalled();
  });

  it('submits form when type="submit" on ui-press', () => {
    const form = document.createElement('form');
    document.body.appendChild(form);

    const el = createWithFormInternals(form, { type: 'submit' });

    el.dispatchEvent(new Event('ui-press', { bubbles: true }));

    expect((form as any).__requestSubmit).toHaveBeenCalledTimes(1);
    expect((form as any).__reset).not.toHaveBeenCalled();
  });

  it('resets form when type="reset" on ui-press', () => {
    const form = document.createElement('form');
    document.body.appendChild(form);

    const el = createWithFormInternals(form, { type: 'reset' });

    el.dispatchEvent(new Event('ui-press', { bubbles: true }));

    expect((form as any).__reset).toHaveBeenCalledTimes(1);
    expect((form as any).__requestSubmit).not.toHaveBeenCalled();
  });

  it('does not act on ui-press when disabled', () => {
    const form = document.createElement('form');
    document.body.appendChild(form);

    const el = createWithFormInternals(form, { disabled: '', type: 'submit' });

    el.dispatchEvent(new Event('ui-press', { bubbles: true }));

    expect((form as any).__requestSubmit).not.toHaveBeenCalled();
    expect((form as any).__reset).not.toHaveBeenCalled();
  });

  it('formResetCallback restores disabled from attribute', () => {
    // Element created with disabled attribute — formResetCallback should restore disabled=true
    const el = create({ disabled: '' });
    expect((el as any).disabled).toBe(true);

    // Programmatically clear disabled (simulate form-driven change)
    (el as any).disabled = false;
    expect((el as any).disabled).toBe(false);

    // Re-add attribute to match original HTML state, then call formResetCallback
    el.setAttribute('disabled', '');
    (el as any).formResetCallback();
    expect((el as any).disabled).toBe(true);
  });

  it('formResetCallback clears disabled when attribute absent', () => {
    const el = create();
    // Simulate form programmatically disabling the element
    (el as any).disabled = true;
    expect((el as any).disabled).toBe(true);

    // Ensure attribute is absent, then formResetCallback should clear disabled
    el.removeAttribute('disabled');
    (el as any).formResetCallback();
    expect((el as any).disabled).toBe(false);
  });
});
