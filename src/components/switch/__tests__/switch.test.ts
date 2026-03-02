// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../switch.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('n-switch');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-switch', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-switch')).toBeDefined();
  });

  it('defaults to unchecked', () => {
    const el = create();
    expect(el.getAttribute('aria-checked')).toBe('false');
    expect((el as any).checked).toBe(false);
  });

  it('reflects checked attribute', () => {
    const el = create({ checked: '' });
    expect(el.getAttribute('aria-checked')).toBe('true');
  });

  it('toggles on native:press', () => {
    const el = create();
    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect((el as any).checked).toBe(true);
    expect(el.getAttribute('aria-checked')).toBe('true');

    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect((el as any).checked).toBe(false);
    // ARIA: unchecked state reflected in aria-checked
    expect(el.getAttribute('aria-checked')).toBe('false');
  });

  it('dispatches native:change with detail', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:change', handler);

    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ checked: true, value: 'on' });
  });

  it('does not toggle when disabled', () => {
    const el = create({ disabled: '' });
    // ARIA: disabled switch has aria-disabled
    expect(el.getAttribute('aria-disabled')).toBe('true');
    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect((el as any).checked).toBe(false);
    // ARIA: remains unchecked
    expect(el.getAttribute('aria-checked')).toBe('false');
  });

  it('sets tabindex=0 by default', () => {
    const el = create();
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('checked property reflects as attribute', () => {
    const el = create();
    (el as any).checked = true;
    expect(el.hasAttribute('checked')).toBe(true);
    (el as any).checked = false;
    expect(el.hasAttribute('checked')).toBe(false);
  });

  it('name property reflects to attribute', () => {
    const el = create() as any;
    expect(el.name).toBe('');
    el.name = 'toggle';
    expect(el.getAttribute('name')).toBe('toggle');
  });

  it('value property defaults to "on"', () => {
    const el = create() as any;
    expect(el.value).toBe('on');
  });

  it('custom value appears in native:change detail', () => {
    const el = create({ value: 'yes' });
    const handler = vi.fn();
    el.addEventListener('native:change', handler);

    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect(handler.mock.calls[0][0].detail).toEqual({ checked: true, value: 'yes' });
  });

  it('disabled property reflects as attribute and sets aria-disabled', () => {
    const el = create() as any;
    el.disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(el.getAttribute('aria-disabled')).toBe('true');
    el.disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
  });
});
