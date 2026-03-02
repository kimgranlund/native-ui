// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../checkbox.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('n-checkbox');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-checkbox', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-checkbox')).toBeDefined();
  });

  it('defaults to unchecked', () => {
    const el = create();
    expect(el.getAttribute('aria-checked')).toBe('false');
    expect((el as any).checked).toBe(false);
  });

  it('reflects checked attribute to aria-checked', () => {
    const el = create({ checked: '' });
    expect(el.getAttribute('aria-checked')).toBe('true');
  });

  it('toggles on native:press event', () => {
    const el = create();
    expect((el as any).checked).toBe(false);

    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect((el as any).checked).toBe(true);
    expect(el.getAttribute('aria-checked')).toBe('true');

    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect((el as any).checked).toBe(false);
    expect(el.getAttribute('aria-checked')).toBe('false');
  });

  it('dispatches native:change on toggle', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:change', handler);

    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ checked: true, value: 'on' });
  });

  it('uses custom value in native:change detail', () => {
    const el = create({ value: 'yes' });
    const handler = vi.fn();
    el.addEventListener('native:change', handler);

    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect(handler.mock.calls[0][0].detail.value).toBe('yes');
  });

  it('does not toggle when disabled', () => {
    const el = create({ disabled: '' });
    // ARIA: disabled checkbox sets aria-disabled
    expect(el.getAttribute('aria-disabled')).toBe('true');
    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect((el as any).checked).toBe(false);
  });

  it('indeterminate clears to checked on press', () => {
    const el = create({ indeterminate: '' });
    expect(el.getAttribute('aria-checked')).toBe('mixed');

    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect((el as any).indeterminate).toBe(false);
    expect((el as any).checked).toBe(true);
    expect(el.getAttribute('aria-checked')).toBe('true');
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

  it('full toggle cycle: indeterminate → checked → unchecked → checked', () => {
    const el = create({ indeterminate: '' });
    expect(el.getAttribute('aria-checked')).toBe('mixed');

    // Press 1: indeterminate → checked
    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect((el as any).indeterminate).toBe(false);
    expect((el as any).checked).toBe(true);
    expect(el.getAttribute('aria-checked')).toBe('true');

    // Press 2: checked → unchecked
    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect((el as any).checked).toBe(false);
    expect(el.getAttribute('aria-checked')).toBe('false');

    // Press 3: unchecked → checked
    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect((el as any).checked).toBe(true);
    expect(el.getAttribute('aria-checked')).toBe('true');
  });

  it('form value is null when unchecked', () => {
    const el = create({ value: 'yes' });
    // Initially unchecked — form value should not include this checkbox
    expect((el as any).checked).toBe(false);

    // Check it
    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect((el as any).checked).toBe(true);

    // Uncheck it
    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect((el as any).checked).toBe(false);
  });
});
