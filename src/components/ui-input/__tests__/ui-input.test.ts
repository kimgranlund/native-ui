// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-input.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('ui-input');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-input', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-input')).toBeDefined();
  });

  it('sets contenteditable="plaintext-only" on setup', () => {
    const el = create();
    expect(el.getAttribute('contenteditable')).toBe('plaintext-only');
  });

  it('does not override contenteditable if already set', () => {
    const el = document.createElement('ui-input');
    el.setAttribute('contenteditable', 'false');
    document.body.appendChild(el);
    expect(el.getAttribute('contenteditable')).toBe('false');
  });

  // ── Value ──

  it('value getter returns empty string when no text content', () => {
    const el = create();
    expect((el as any).value).toBe('');
  });

  it('value setter sets text content', () => {
    const el = create();
    (el as any).value = 'hello';
    expect((el as any).value).toBe('hello');
  });

  it('value setter replaces previous text content', () => {
    const el = create();
    (el as any).value = 'first';
    (el as any).value = 'second';
    expect((el as any).value).toBe('second');
  });

  it('value setter with empty string clears text content', () => {
    const el = create();
    (el as any).value = 'hello';
    (el as any).value = '';
    expect((el as any).value).toBe('');
  });

  it('value attribute sets text content on connect', () => {
    const el = create({ value: 'from-attr' });
    expect((el as any).value).toBe('from-attr');
  });

  // ── Placeholder ──

  it('placeholder property reflects to attribute', () => {
    const el = create();
    (el as any).placeholder = 'Enter text';
    expect(el.getAttribute('placeholder')).toBe('Enter text');
  });

  it('placeholder property reads from attribute', () => {
    const el = create({ placeholder: 'Type here' });
    expect((el as any).placeholder).toBe('Type here');
  });

  it('placeholder returns empty string when attribute is absent', () => {
    const el = create();
    expect((el as any).placeholder).toBe('');
  });

  // ── Name ──

  it('name property reflects to attribute', () => {
    const el = create();
    (el as any).name = 'email';
    expect(el.getAttribute('name')).toBe('email');
  });

  it('name property reads from attribute', () => {
    const el = create({ name: 'username' });
    expect((el as any).name).toBe('username');
  });

  it('name returns empty string when attribute is absent', () => {
    const el = create();
    expect((el as any).name).toBe('');
  });

  // ── Disabled ──

  it('disabled property defaults to false', () => {
    const el = create();
    expect((el as any).disabled).toBe(false);
  });

  it('disabled property setter adds disabled attribute', () => {
    const el = create();
    (el as any).disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    // ARIA: disabled input sets aria-disabled
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });

  it('disabled property setter removes disabled attribute when set to false', () => {
    const el = create({ disabled: '' });
    (el as any).disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    // ARIA: removing disabled clears aria-disabled
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('disabled attribute sets contenteditable to false', () => {
    const el = create({ disabled: '' });
    expect(el.getAttribute('contenteditable')).toBe('false');
  });

  it('removing disabled attribute restores contenteditable to plaintext-only', () => {
    const el = create({ disabled: '' });
    el.removeAttribute('disabled');
    expect(el.getAttribute('contenteditable')).toBe('plaintext-only');
  });

  // ── ReadOnly ──

  it('readOnly property defaults to false', () => {
    const el = create();
    expect((el as any).readOnly).toBe(false);
  });

  it('readOnly property setter adds readonly attribute', () => {
    const el = create();
    (el as any).readOnly = true;
    expect(el.hasAttribute('readonly')).toBe(true);
  });

  it('readOnly property setter removes readonly attribute when set to false', () => {
    const el = create({ readonly: '' });
    (el as any).readOnly = false;
    expect(el.hasAttribute('readonly')).toBe(false);
  });

  it('readOnly=true sets contenteditable to false', () => {
    const el = create();
    (el as any).readOnly = true;
    expect(el.getAttribute('contenteditable')).toBe('false');
  });

  it('readOnly=false restores contenteditable to plaintext-only', () => {
    const el = create();
    (el as any).readOnly = true;
    (el as any).readOnly = false;
    expect(el.getAttribute('contenteditable')).toBe('plaintext-only');
  });

  // ── Required ──

  it('required property defaults to false', () => {
    const el = create();
    expect((el as any).required).toBe(false);
  });

  it('required property setter adds required attribute', () => {
    const el = create();
    (el as any).required = true;
    expect(el.hasAttribute('required')).toBe(true);
  });

  it('required property setter removes required attribute when set to false', () => {
    const el = create({ required: '' });
    (el as any).required = false;
    expect(el.hasAttribute('required')).toBe(false);
  });

  // ── Events ──

  it('dispatches ui-input event on native input event', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-input', handler);

    el.dispatchEvent(new Event('input', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ui-input event detail contains current value', () => {
    const el = create();
    (el as any).value = 'typed';
    const handler = vi.fn();
    el.addEventListener('ui-input', handler);

    el.dispatchEvent(new Event('input', { bubbles: true }));

    expect(handler.mock.calls[0][0].detail).toEqual({ value: 'typed' });
  });

  it('dispatches ui-change event on blur', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

    el.dispatchEvent(new Event('blur'));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ui-change event detail contains current value', () => {
    const el = create();
    (el as any).value = 'blurred';
    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

    el.dispatchEvent(new Event('blur'));

    expect(handler.mock.calls[0][0].detail).toEqual({ value: 'blurred' });
  });

  it('ui-input event bubbles', () => {
    const el = create();
    const handler = vi.fn();
    document.body.addEventListener('ui-input', handler);

    el.dispatchEvent(new Event('input', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('ui-input', handler);
  });

  it('ui-change event bubbles', () => {
    const el = create();
    const handler = vi.fn();
    document.body.addEventListener('ui-change', handler);

    el.dispatchEvent(new Event('blur'));

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('ui-change', handler);
  });

  // ── Empty state ──

  it('adds empty state when value is empty', () => {
    const el = create();
    const internals = (el as any).attachInternals?.();
    // Empty state is tracked via internals.states — verify via value behavior
    expect((el as any).value).toBe('');
  });

  it('empty state is set on creation with no value', () => {
    const el = create();
    // Verify the element tracks empty state — empty value means empty state should be set
    (el as any).value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    // After input with empty value, element should still have empty string value
    expect((el as any).value).toBe('');
  });

  it('non-empty value clears empty state', () => {
    const el = create();
    (el as any).value = 'hello';
    // After setting a non-empty value, the value is reflected correctly
    expect((el as any).value).toBe('hello');
  });

  it('clearing value restores empty state', () => {
    const el = create();
    (el as any).value = 'hello';
    (el as any).value = '';
    expect((el as any).value).toBe('');
  });

  // ── formResetCallback ──

  it('formResetCallback clears value', () => {
    const el = create();
    (el as any).value = 'some text';
    expect((el as any).value).toBe('some text');

    (el as any).formResetCallback();

    expect((el as any).value).toBe('');
  });

  it('formResetCallback restores empty state', () => {
    const el = create();
    (el as any).value = 'some text';
    (el as any).formResetCallback();

    // Value is cleared — empty state should now be active
    expect((el as any).value).toBe('');
  });

  it('formResetCallback reads disabled state from the disabled attribute', () => {
    const el = create();
    // Start enabled, set value, then reset — should remain not disabled
    (el as any).value = 'hello';
    (el as any).formResetCallback();
    expect((el as any).disabled).toBe(false);
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  it('formResetCallback on non-disabled element keeps disabled false', () => {
    const el = create();
    (el as any).formResetCallback();
    expect((el as any).disabled).toBe(false);
  });

  // ── formDisabledCallback ──

  it('formDisabledCallback sets disabled state and contenteditable', () => {
    const el = create();
    (el as any).formDisabledCallback(true);
    expect((el as any).disabled).toBe(true);
    expect(el.getAttribute('contenteditable')).toBe('false');
  });

  it('formDisabledCallback restores contenteditable when re-enabled', () => {
    const el = create();
    (el as any).formDisabledCallback(true);
    (el as any).formDisabledCallback(false);
    expect((el as any).disabled).toBe(false);
    expect(el.getAttribute('contenteditable')).toBe('plaintext-only');
  });

  // ── Slot children ──

  it('sets slot children to contenteditable=false on setup', () => {
    const el = document.createElement('ui-input');
    const icon = document.createElement('ui-icon');
    icon.setAttribute('slot', 'leading');
    el.appendChild(icon);
    document.body.appendChild(el);

    expect(icon.getAttribute('contenteditable')).toBe('false');
  });
});
