// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../ui-checkbox.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('ui-checkbox');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-checkbox — form callbacks', () => {
  it('onFormDisabled disables the checkbox', () => {
    const el = create() as any;
    expect(el.disabled).toBe(false);
    el.formDisabledCallback(true);
    expect(el.disabled).toBe(true);
  });

  it('onFormDisabled re-enables the checkbox', () => {
    const el = create({ disabled: '' }) as any;
    el.formDisabledCallback(false);
    expect(el.disabled).toBe(false);
  });

  it('onFormReset resets to initial checked state (unchecked)', () => {
    const el = create() as any;
    // Toggle on
    el.checked = true;
    expect(el.checked).toBe(true);
    el.formResetCallback();
    expect(el.checked).toBe(false);
    // ARIA: aria-checked reflects reset state
    expect(el.getAttribute('aria-checked')).toBe('false');
  });

  it('onFormReset resets to initial checked state (checked)', () => {
    const el = create({ checked: '' }) as any;
    // Toggle off
    el.checked = false;
    expect(el.checked).toBe(false);
    el.formResetCallback();
    expect(el.checked).toBe(true);
    // ARIA: aria-checked reflects reset state
    expect(el.getAttribute('aria-checked')).toBe('true');
  });

  it('onFormReset clears indeterminate', () => {
    const el = create({ indeterminate: '' }) as any;
    expect(el.indeterminate).toBe(true);
    // ARIA: indeterminate maps to aria-checked="mixed"
    expect(el.getAttribute('aria-checked')).toBe('mixed');
    el.formResetCallback();
    expect(el.indeterminate).toBe(false);
    // ARIA: after reset, aria-checked is no longer "mixed"
    expect(el.getAttribute('aria-checked')).not.toBe('mixed');
  });
});
