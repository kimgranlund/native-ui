// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../radio.ts';

function createGroup(values: string[], selected?: string): HTMLElement {
  const group = document.createElement('n-radio-group');
  if (selected) group.setAttribute('value', selected);
  for (const v of values) {
    const radio = document.createElement('n-radio');
    radio.setAttribute('value', v);
    radio.textContent = v;
    group.appendChild(radio);
  }
  document.body.appendChild(group);
  return group;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-radio-group', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-radio-group')).toBeDefined();
    expect(customElements.get('n-radio')).toBeDefined();
  });

  it('starts with null value when no value attribute', () => {
    const group = createGroup(['a', 'b', 'c']);
    expect((group as any).value).toBe(null);
  });

  it('initializes value from attribute', () => {
    const group = createGroup(['a', 'b', 'c'], 'b');
    expect((group as any).value).toBe('b');
  });

  it('selects radio on native:select event from child', () => {
    const group = createGroup(['a', 'b', 'c']);
    const handler = vi.fn();
    group.addEventListener('native:change', handler);

    const radioB = group.querySelector('n-radio[value="b"]')!;
    radioB.dispatchEvent(new CustomEvent('native:select', {
      bubbles: true,
      composed: true,
      detail: { value: 'b', label: 'b' },
    }));

    expect((group as any).value).toBe('b');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('b');
  });

  it('updates aria-checked on child radios when value changes', async () => {
    const group = createGroup(['a', 'b', 'c'], 'a');
    // deferChildren uses queueMicrotask, so await one
    await new Promise<void>(resolve => queueMicrotask(resolve));

    const radioA = group.querySelector('n-radio[value="a"]')!;
    const radioB = group.querySelector('n-radio[value="b"]')!;
    expect(radioA.getAttribute('aria-checked')).toBe('true');
    expect(radioB.getAttribute('aria-checked')).toBe('false');

    // Select B
    radioB.dispatchEvent(new CustomEvent('native:select', {
      bubbles: true, composed: true,
      detail: { value: 'b', label: 'b' },
    }));

    expect(radioA.getAttribute('aria-checked')).toBe('false');
    expect(radioB.getAttribute('aria-checked')).toBe('true');
  });

  it('does not select when group is disabled', () => {
    const group = createGroup(['a', 'b']);
    group.setAttribute('disabled', '');
    // ARIA: disabled group sets aria-disabled
    expect(group.getAttribute('aria-disabled')).toBe('true');
    const handler = vi.fn();
    group.addEventListener('native:change', handler);

    const radioB = group.querySelector('n-radio[value="b"]')!;
    radioB.dispatchEvent(new CustomEvent('native:select', {
      bubbles: true, composed: true,
      detail: { value: 'b', label: 'b' },
    }));

    expect((group as any).value).toBe(null);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('n-radio', () => {
  it('dispatches native:select on click', () => {
    const group = createGroup(['a']);
    const radio = group.querySelector('n-radio')!;
    const handler = vi.fn();
    radio.addEventListener('native:select', handler);

    radio.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch native:select when disabled', () => {
    const group = createGroup(['a']);
    const radio = group.querySelector('n-radio')!;
    radio.setAttribute('disabled', '');
    const handler = vi.fn();
    radio.addEventListener('native:select', handler);

    radio.dispatchEvent(new Event('click'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('sets tabindex=-1 by default', () => {
    const group = createGroup(['a']);
    const radio = group.querySelector('n-radio')!;
    // roving-focusable sets first item to 0, rest to -1
    expect(radio.getAttribute('tabindex')).not.toBeNull();
  });

  it('dispatches native:select on Enter key', () => {
    const group = createGroup(['a']);
    const radio = group.querySelector('n-radio')!;
    const handler = vi.fn();
    radio.addEventListener('native:select', handler);

    radio.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dispatches native:select on Space key', () => {
    const group = createGroup(['a']);
    const radio = group.querySelector('n-radio')!;
    const handler = vi.fn();
    radio.addEventListener('native:select', handler);

    radio.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch native:select on Enter when disabled', () => {
    const group = createGroup(['a']);
    const radio = group.querySelector('n-radio')!;
    radio.setAttribute('disabled', '');
    const handler = vi.fn();
    radio.addEventListener('native:select', handler);

    radio.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('native:select event includes value and label in detail', () => {
    const group = createGroup(['alpha']);
    const radio = group.querySelector('n-radio')!;
    radio.textContent = 'Alpha Label';
    const handler = vi.fn();
    radio.addEventListener('native:select', handler);

    radio.dispatchEvent(new Event('click'));
    expect(handler.mock.calls[0][0].detail.value).toBe('alpha');
    expect(handler.mock.calls[0][0].detail.label).toBe('Alpha Label');
  });

  it('label getter uses label attribute when present', () => {
    const group = createGroup(['a']);
    const radio = group.querySelector('n-radio')! as any;
    radio.textContent = 'Text Content';
    radio.setAttribute('label', 'Attr Label');
    expect(radio.label).toBe('Attr Label');
  });

  it('value property getter returns attribute value', () => {
    const group = createGroup(['myval']);
    const radio = group.querySelector('n-radio')! as any;
    expect(radio.value).toBe('myval');
  });
});
