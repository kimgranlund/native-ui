// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../ui-switch.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('ui-switch');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-switch — form callbacks', () => {
  it('onFormDisabled disables the switch', () => {
    const el = create() as any;
    expect(el.disabled).toBe(false);
    el.formDisabledCallback(true);
    expect(el.disabled).toBe(true);
  });

  it('onFormDisabled re-enables the switch', () => {
    const el = create({ disabled: '' }) as any;
    el.formDisabledCallback(false);
    expect(el.disabled).toBe(false);
  });

  it('onFormReset resets to initial checked state (unchecked)', () => {
    const el = create() as any;
    el.checked = true;
    expect(el.checked).toBe(true);
    el.formResetCallback();
    expect(el.checked).toBe(false);
    // ARIA: aria-checked reflects reset state
    expect(el.getAttribute('aria-checked')).toBe('false');
  });

  it('onFormReset resets to initial checked state (checked)', () => {
    const el = create({ checked: '' }) as any;
    el.checked = false;
    expect(el.checked).toBe(false);
    el.formResetCallback();
    expect(el.checked).toBe(true);
    // ARIA: aria-checked reflects reset state
    expect(el.getAttribute('aria-checked')).toBe('true');
  });
});
