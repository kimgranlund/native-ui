// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../input-otp.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('n-input-otp');
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

describe('n-input-otp', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-input-otp')).toBeDefined();
  });

  it('stamps 6 cells by default', () => {
    const el = create();
    const cells = el.querySelectorAll('.n-otp-cell');
    expect(cells.length).toBe(6);
  });

  it('respects length attribute', () => {
    const el = create({ length: '4' });
    const cells = el.querySelectorAll('.n-otp-cell');
    expect(cells.length).toBe(4);
  });

  it('value getter returns joined cell values', () => {
    const el = create();
    (el as any).value = '123';
    expect((el as any).value).toBe('123');
  });

  it('value setter populates cells', () => {
    const el = create();
    (el as any).value = '456';
    const cells = el.querySelectorAll('.n-otp-cell');
    expect(cells[0].textContent).toBe('4');
    expect(cells[1].textContent).toBe('5');
    expect(cells[2].textContent).toBe('6');
    expect(cells[3].textContent).toBe('');
    expect(cells[4].textContent).toBe('');
    expect(cells[5].textContent).toBe('');
  });

  it('value setter truncates to length', () => {
    const el = create({ length: '4' });
    (el as any).value = '123456789';
    expect((el as any).value).toBe('1234');
  });

  it('disabled property toggles attribute', () => {
    const el = create();
    expect(el.hasAttribute('disabled')).toBe(false);
    expect((el as any).disabled).toBe(false);

    (el as any).disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    expect((el as any).disabled).toBe(true);

    (el as any).disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    expect((el as any).disabled).toBe(false);
  });

  it('name property reflects to attribute', () => {
    const el = create();
    expect((el as any).name).toBe('');

    (el as any).name = 'otp-code';
    expect(el.getAttribute('name')).toBe('otp-code');
  });

  it('cells have contenteditable="plaintext-only"', () => {
    const el = create();
    const cells = el.querySelectorAll('.n-otp-cell');
    for (const cell of cells) {
      expect(cell.getAttribute('contenteditable')).toBe('plaintext-only');
    }
  });

  it('cells have data-empty attribute when empty', () => {
    const el = create();
    const cells = el.querySelectorAll('.n-otp-cell');
    for (const cell of cells) {
      expect(cell.hasAttribute('data-empty')).toBe(true);
    }
  });

  it('data-empty removed when cell has value', () => {
    const el = create();
    (el as any).value = '1';
    const cells = el.querySelectorAll('.n-otp-cell');
    expect(cells[0].hasAttribute('data-empty')).toBe(false);
    // Remaining cells still empty
    expect(cells[1].hasAttribute('data-empty')).toBe(true);
  });

  it('formResetCallback clears value', () => {
    const el = create();
    (el as any).value = '123456';
    expect((el as any).value).toBe('123456');

    (el as any).formResetCallback();
    expect((el as any).value).toBe('');
    const cells = el.querySelectorAll('.n-otp-cell');
    for (const cell of cells) {
      expect(cell.textContent).toBe('');
      expect(cell.hasAttribute('data-empty')).toBe(true);
    }
  });

  it('dispatches native:input on cell input', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:input', handler);

    const cells = el.querySelectorAll('.n-otp-cell');
    cells[0].textContent = '1';
    cells[0].dispatchEvent(new Event('input', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: '1' });
  });

  it('dispatches native:change when all cells filled', () => {
    const el = create({ length: '3' });
    const changeHandler = vi.fn();
    el.addEventListener('native:change', changeHandler);

    const cells = el.querySelectorAll('.n-otp-cell');

    // Fill first two — no native:change yet
    cells[0].textContent = '1';
    cells[0].dispatchEvent(new Event('input', { bubbles: true }));
    cells[1].textContent = '2';
    cells[1].dispatchEvent(new Event('input', { bubbles: true }));
    expect(changeHandler).not.toHaveBeenCalled();

    // Fill the last cell — native:change fires
    cells[2].textContent = '3';
    cells[2].dispatchEvent(new Event('input', { bubbles: true }));
    expect(changeHandler).toHaveBeenCalledTimes(1);
    expect(changeHandler.mock.calls[0][0].detail).toEqual({ value: '123' });
  });

  it('pattern attribute changes validation regex', () => {
    const el = create({ pattern: '[a-z]' });
    const cells = el.querySelectorAll('.n-otp-cell');

    // Numeric should be rejected
    cells[0].textContent = '1';
    cells[0].dispatchEvent(new Event('input', { bubbles: true }));
    expect((el as any).value).toBe('');

    // Lowercase letter should be accepted
    cells[0].textContent = 'a';
    cells[0].dispatchEvent(new Event('input', { bubbles: true }));
    expect((el as any).value).toBe('a');
  });

  it('keydown Backspace clears current cell', () => {
    const el = create();
    (el as any).value = '123';
    const cells = el.querySelectorAll('.n-otp-cell');

    // Backspace on cell 0 which has a value
    const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true });
    cells[0].dispatchEvent(event);

    // Cell 0 should be cleared
    expect(cells[0].textContent).toBe('');
    expect(cells[0].hasAttribute('data-empty')).toBe(true);
  });

  it('keydown ArrowLeft moves focus to previous cell', () => {
    const el = create();
    const cells = el.querySelectorAll('.n-otp-cell');
    const focusSpy = vi.spyOn(cells[0] as HTMLElement, 'focus');

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
    cells[1].dispatchEvent(event);

    expect(focusSpy).toHaveBeenCalled();
  });

  it('keydown ArrowRight moves focus to next cell', () => {
    const el = create();
    const cells = el.querySelectorAll('.n-otp-cell');
    const focusSpy = vi.spyOn(cells[1] as HTMLElement, 'focus');

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    cells[0].dispatchEvent(event);

    expect(focusSpy).toHaveBeenCalled();
  });

  it('keydown Delete clears current cell', () => {
    const el = create();
    (el as any).value = '123';
    const cells = el.querySelectorAll('.n-otp-cell');

    const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true });
    cells[1].dispatchEvent(event);

    expect(cells[1].textContent).toBe('');
    expect(cells[1].hasAttribute('data-empty')).toBe(true);
    // Value should reflect cleared cell
    expect((el as any).value).toBe('13');
  });

  it('paste fills cells from clipboard', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('native:input', handler);

    const pasteEvent = new Event('paste') as any;
    pasteEvent.clipboardData = { getData: () => '123456' };
    pasteEvent.preventDefault = vi.fn();
    el.dispatchEvent(pasteEvent);

    expect(pasteEvent.preventDefault).toHaveBeenCalled();
    expect((el as any).value).toBe('123456');
    const cells = el.querySelectorAll('.n-otp-cell');
    expect(cells[0].textContent).toBe('1');
    expect(cells[1].textContent).toBe('2');
    expect(cells[2].textContent).toBe('3');
    expect(cells[3].textContent).toBe('4');
    expect(cells[4].textContent).toBe('5');
    expect(cells[5].textContent).toBe('6');
  });

  it('paste truncates to length', () => {
    const el = create({ length: '3' });

    const pasteEvent = new Event('paste') as any;
    pasteEvent.clipboardData = { getData: () => '123456' };
    pasteEvent.preventDefault = vi.fn();
    el.dispatchEvent(pasteEvent);

    expect((el as any).value).toBe('123');
  });

  it('paste filters non-matching characters', () => {
    const el = create();

    const pasteEvent = new Event('paste') as any;
    pasteEvent.clipboardData = { getData: () => '1a2b3c' };
    pasteEvent.preventDefault = vi.fn();
    el.dispatchEvent(pasteEvent);

    // Only digits should be kept (default pattern is [0-9])
    expect((el as any).value).toBe('123');
  });
});
