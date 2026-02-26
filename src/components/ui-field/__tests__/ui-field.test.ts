// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../ui-field.ts';
import '../../ui-input/ui-input.ts';

/**
 * Build a fully-structured ui-field BEFORE appending to DOM.
 * UIField uses deferChildren() — all children must be present when
 * connectedCallback fires so #discoverControl / #wireIds / #wireAria
 * all run with children available.
 */
function createField(): HTMLElement {
  const field = document.createElement('ui-field');

  const label = document.createElement('label');
  label.setAttribute('slot', 'label');
  label.textContent = 'Name';
  field.appendChild(label);

  const input = document.createElement('ui-input');
  field.appendChild(input);

  const desc = document.createElement('span');
  desc.setAttribute('slot', 'description');
  desc.textContent = 'Enter your name';
  field.appendChild(desc);

  const error = document.createElement('span');
  error.setAttribute('slot', 'error');
  error.textContent = '';
  field.appendChild(error);

  // Appending triggers connectedCallback → setup() → deferChildren(fn)
  document.body.appendChild(field);
  return field;
}

/** Minimal field with only a label and control — no description/error slots. */
function createMinimalField(): HTMLElement {
  const field = document.createElement('ui-field');

  const label = document.createElement('label');
  label.setAttribute('slot', 'label');
  label.textContent = 'Email';
  field.appendChild(label);

  const input = document.createElement('ui-input');
  field.appendChild(input);

  document.body.appendChild(field);
  return field;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-field', () => {
  // ── Registration ──

  it('is registered as a custom element', () => {
    expect(customElements.get('ui-field')).toBeDefined();
  });

  // ── ID wiring ──

  it('assigns an id to the label slot element', () => {
    const field = createField();
    const label = field.querySelector('[slot="label"]');
    expect(label?.id).toBeTruthy();
  });

  it('assigns an id to the description slot element', () => {
    const field = createField();
    const desc = field.querySelector('[slot="description"]');
    expect(desc?.id).toBeTruthy();
  });

  it('assigns an id to the error slot element', () => {
    const field = createField();
    const error = field.querySelector('[slot="error"]');
    expect(error?.id).toBeTruthy();
  });

  it('does not overwrite an existing id on the label', () => {
    const field = document.createElement('ui-field');
    const label = document.createElement('label');
    label.setAttribute('slot', 'label');
    label.id = 'my-custom-label';
    field.appendChild(label);
    const input = document.createElement('ui-input');
    field.appendChild(input);
    document.body.appendChild(field);

    expect(label.id).toBe('my-custom-label');
  });

  // ── ARIA wiring ──

  it('sets aria-labelledby on the discovered control to the label id', () => {
    const field = createField();
    const label = field.querySelector('[slot="label"]') as HTMLElement;
    const control = field.querySelector('ui-input') as HTMLElement;
    expect(control.getAttribute('aria-labelledby')).toBe(label.id);
  });

  it('sets aria-describedby on control including both description and error ids', () => {
    const field = createField();
    const desc = field.querySelector('[slot="description"]') as HTMLElement;
    const error = field.querySelector('[slot="error"]') as HTMLElement;
    const control = field.querySelector('ui-input') as HTMLElement;

    const describedBy = control.getAttribute('aria-describedby') ?? '';
    expect(describedBy).toContain(desc.id);
    expect(describedBy).toContain(error.id);
  });

  it('sets aria-describedby even when only description slot is present', () => {
    const field = document.createElement('ui-field');
    const label = document.createElement('label');
    label.setAttribute('slot', 'label');
    field.appendChild(label);
    const input = document.createElement('ui-input');
    field.appendChild(input);
    const desc = document.createElement('span');
    desc.setAttribute('slot', 'description');
    field.appendChild(desc);
    document.body.appendChild(field);

    const control = field.querySelector('ui-input') as HTMLElement;
    expect(control.getAttribute('aria-describedby')).toBeTruthy();
  });

  // ── Control discovery ──

  it('discovers ui-input as the form control (skips slotted elements)', () => {
    const field = createField();
    // aria-labelledby on ui-input confirms it was discovered
    const control = field.querySelector('ui-input') as HTMLElement;
    expect(control.hasAttribute('aria-labelledby')).toBe(true);
  });

  it('does not set aria attributes on slotted label/description/error elements', () => {
    const field = createField();
    const label = field.querySelector('[slot="label"]') as HTMLElement;
    // The label is discovered by the field but should NOT itself receive aria-labelledby
    expect(label.hasAttribute('aria-labelledby')).toBe(false);
  });

  // ── Disabled propagation ──

  it('propagates disabled attribute to the discovered control', () => {
    const field = createField();
    field.setAttribute('disabled', '');

    const control = field.querySelector('ui-input') as HTMLElement;
    expect(control.hasAttribute('disabled')).toBe(true);
  });

  it('removes disabled from control when field disabled is removed', () => {
    const field = createField();
    field.setAttribute('disabled', '');
    field.removeAttribute('disabled');

    const control = field.querySelector('ui-input') as HTMLElement;
    expect(control.hasAttribute('disabled')).toBe(false);
  });

  // ── Required propagation ──

  it('propagates required attribute to the discovered control', () => {
    const field = createField();
    field.setAttribute('required', '');

    const control = field.querySelector('ui-input') as HTMLElement;
    expect(control.hasAttribute('required')).toBe(true);
  });

  it('removes required from control when field required is removed', () => {
    const field = createField();
    field.setAttribute('required', '');
    field.removeAttribute('required');

    const control = field.querySelector('ui-input') as HTMLElement;
    expect(control.hasAttribute('required')).toBe(false);
  });

  // ── Validation events ──

  it('ui-invalid event sets [invalid] attribute on the field', () => {
    const field = createField();
    field.dispatchEvent(new CustomEvent('ui-invalid', {
      bubbles: true,
      detail: { message: 'Required field' },
    }));

    expect(field.hasAttribute('invalid')).toBe(true);
  });

  it('ui-invalid event updates error slot textContent from detail.message', () => {
    const field = createField();
    field.dispatchEvent(new CustomEvent('ui-invalid', {
      bubbles: true,
      detail: { message: 'This field is required' },
    }));

    const error = field.querySelector('[slot="error"]') as HTMLElement;
    expect(error.textContent).toBe('This field is required');
  });

  it('ui-invalid without a message does not clear existing error text', () => {
    const field = createField();
    const error = field.querySelector('[slot="error"]') as HTMLElement;
    error.textContent = 'Pre-existing error';

    field.dispatchEvent(new CustomEvent('ui-invalid', {
      bubbles: true,
      detail: {},
    }));

    // No message in detail — textContent should be unchanged
    expect(error.textContent).toBe('Pre-existing error');
  });

  it('ui-valid event removes [invalid] attribute from the field', () => {
    const field = createField();
    field.setAttribute('invalid', '');

    field.dispatchEvent(new CustomEvent('ui-valid', { bubbles: true }));

    expect(field.hasAttribute('invalid')).toBe(false);
  });

  it('ui-valid event does nothing when [invalid] is not present', () => {
    const field = createField();
    // Should not throw
    field.dispatchEvent(new CustomEvent('ui-valid', { bubbles: true }));
    expect(field.hasAttribute('invalid')).toBe(false);
  });

  // ── Disabled on connect ──

  it('propagates disabled at connect time when attribute is already present', () => {
    const field = document.createElement('ui-field');
    field.setAttribute('disabled', '');

    const label = document.createElement('label');
    label.setAttribute('slot', 'label');
    field.appendChild(label);

    const input = document.createElement('ui-input');
    field.appendChild(input);

    document.body.appendChild(field);

    const control = field.querySelector('ui-input') as HTMLElement;
    expect(control.hasAttribute('disabled')).toBe(true);
  });

  // ── No control edge case ──

  it('does not throw when no control child is present', () => {
    const field = document.createElement('ui-field');
    const label = document.createElement('label');
    label.setAttribute('slot', 'label');
    field.appendChild(label);

    expect(() => document.body.appendChild(field)).not.toThrow();
  });

  it('handles ui-invalid gracefully with no error slot present', () => {
    const field = createMinimalField();

    expect(() => {
      field.dispatchEvent(new CustomEvent('ui-invalid', {
        bubbles: true,
        detail: { message: 'Oops' },
      }));
    }).not.toThrow();

    expect(field.hasAttribute('invalid')).toBe(true);
  });
});
