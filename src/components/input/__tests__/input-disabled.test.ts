// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../input.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('n-input');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('n-input — disabled interaction', () => {
  it('contenteditable is false when disabled', () => {
    const el = create({ disabled: '' });
    expect(el.getAttribute('contenteditable')).toBe('false');
    // ARIA: disabled input has aria-disabled
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });

  it('contenteditable restores to plaintext-only when enabled', () => {
    const el = create({ disabled: '' });
    (el as any).disabled = false;
    expect(el.getAttribute('contenteditable')).toBe('plaintext-only');
    // ARIA: re-enabled input clears aria-disabled
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('disabled + readonly: removing disabled keeps contenteditable false', () => {
    const el = create({ disabled: '', readonly: '' });
    (el as any).disabled = false;
    expect(el.getAttribute('contenteditable')).toBe('false');
  });

  it('readonly + disabled: removing readonly keeps contenteditable false', () => {
    const el = create({ disabled: '', readonly: '' });
    el.removeAttribute('readonly');
    expect(el.getAttribute('contenteditable')).toBe('false');
  });

  it('value can still be set programmatically when disabled', () => {
    const el = create({ disabled: '' });
    (el as any).value = 'hello';
    expect((el as any).value).toBe('hello');
  });
});
