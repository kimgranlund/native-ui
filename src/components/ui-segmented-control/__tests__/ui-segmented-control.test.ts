// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-segmented-control.ts';

function create(opts: { value?: string; disabled?: boolean } = {}): HTMLElement {
  const el = document.createElement('ui-segmented-control');
  if (opts.disabled) el.setAttribute('disabled', '');
  if (opts.value) el.setAttribute('value', opts.value);

  const seg1 = document.createElement('ui-segment');
  seg1.setAttribute('value', 'a');
  seg1.textContent = 'Option A';
  el.appendChild(seg1);

  const seg2 = document.createElement('ui-segment');
  seg2.setAttribute('value', 'b');
  seg2.textContent = 'Option B';
  el.appendChild(seg2);

  const seg3 = document.createElement('ui-segment');
  seg3.setAttribute('value', 'c');
  seg3.textContent = 'Option C';
  el.appendChild(seg3);

  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-segmented-control', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-segmented-control')).toBeDefined();
  });

  it('ui-segment is registered as a custom element', () => {
    expect(customElements.get('ui-segment')).toBeDefined();
  });

  it('starts with null value', () => {
    const el = create();
    expect((el as any).value).toBeNull();
  });

  it('value attribute sets initial value', () => {
    const el = create({ value: 'b' });
    expect((el as any).value).toBe('b');
  });

  it('value setter reflects to attribute', () => {
    const el = create();
    (el as any).value = 'a';
    expect(el.getAttribute('value')).toBe('a');
  });

  it('value setter with null removes attribute', () => {
    const el = create({ value: 'a' });
    expect(el.getAttribute('value')).toBe('a');

    (el as any).value = null;
    expect(el.hasAttribute('value')).toBe(false);
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

    (el as any).name = 'segment-group';
    expect(el.getAttribute('name')).toBe('segment-group');
  });

  it('dispatches ui-change when segment is selected via ui-select event', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

    const seg1 = el.querySelector('ui-segment[value="a"]')!;
    seg1.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true,
      composed: true,
      detail: { value: 'a', label: 'Option A' },
    }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: 'a', label: 'Option A' });
  });

  it('updates value when segment selected', () => {
    const el = create();
    expect((el as any).value).toBeNull();

    const seg2 = el.querySelector('ui-segment[value="b"]')!;
    seg2.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true,
      composed: true,
      detail: { value: 'b', label: 'Option B' },
    }));

    expect((el as any).value).toBe('b');
    expect(el.getAttribute('value')).toBe('b');
  });

  it('does not update value when disabled', () => {
    const el = create({ disabled: true });
    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

    const seg1 = el.querySelector('ui-segment[value="a"]')!;
    seg1.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true,
      composed: true,
      detail: { value: 'a', label: 'Option A' },
    }));

    expect(handler).not.toHaveBeenCalled();
    expect((el as any).value).toBeNull();
  });

  it('formResetCallback restores initial value', () => {
    const el = create({ value: 'b' });
    expect((el as any).value).toBe('b');

    // Change value
    (el as any).value = 'c';
    expect((el as any).value).toBe('c');

    // Reset restores initial
    (el as any).formResetCallback();
    expect((el as any).value).toBe('b');
    expect(el.getAttribute('value')).toBe('b');
  });

  it('formResetCallback restores null when no initial value', () => {
    const el = create();
    (el as any).value = 'a';
    expect((el as any).value).toBe('a');

    (el as any).formResetCallback();
    expect((el as any).value).toBeNull();
    expect(el.hasAttribute('value')).toBe(false);
  });
});

describe('ui-segment', () => {
  it('value property reflects to attribute', () => {
    const seg = document.createElement('ui-segment');
    document.body.appendChild(seg);

    (seg as any).value = 'test';
    expect(seg.getAttribute('value')).toBe('test');
  });

  it('disabled property toggles attribute and aria-disabled', () => {
    const seg = document.createElement('ui-segment');
    document.body.appendChild(seg);

    expect((seg as any).disabled).toBe(false);
    expect(seg.hasAttribute('aria-disabled')).toBe(false);

    (seg as any).disabled = true;
    expect(seg.hasAttribute('disabled')).toBe(true);
    expect(seg.getAttribute('aria-disabled')).toBe('true');

    (seg as any).disabled = false;
    expect(seg.hasAttribute('disabled')).toBe(false);
    expect(seg.hasAttribute('aria-disabled')).toBe(false);
  });

  it('label getter returns textContent when no label attribute', () => {
    const seg = document.createElement('ui-segment');
    seg.textContent = 'My Label';
    document.body.appendChild(seg);

    expect((seg as any).label).toBe('My Label');
  });

  it('label getter prefers label attribute over textContent', () => {
    const seg = document.createElement('ui-segment');
    seg.setAttribute('label', 'Attr Label');
    seg.textContent = 'Text Label';
    document.body.appendChild(seg);

    expect((seg as any).label).toBe('Attr Label');
  });

  it('dispatches ui-select on ui-press', () => {
    const seg = document.createElement('ui-segment');
    seg.setAttribute('value', 'x');
    seg.textContent = 'Segment X';
    document.body.appendChild(seg);

    const handler = vi.fn();
    seg.addEventListener('ui-select', handler);

    seg.dispatchEvent(new Event('ui-press', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: 'x', label: 'Segment X' });
  });

  it('does not dispatch ui-select when disabled', () => {
    const seg = document.createElement('ui-segment');
    seg.setAttribute('value', 'x');
    seg.setAttribute('disabled', '');
    document.body.appendChild(seg);

    const handler = vi.fn();
    seg.addEventListener('ui-select', handler);

    seg.dispatchEvent(new Event('ui-press', { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });
});
