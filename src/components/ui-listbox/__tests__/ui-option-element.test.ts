// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-option.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('ui-option');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-option', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-option')).toBeDefined();
  });

  it('value property reflects to attribute', () => {
    const el = create({ value: 'foo' }) as any;
    expect(el.value).toBe('foo');
    el.value = 'bar';
    expect(el.getAttribute('value')).toBe('bar');
  });

  it('value attribute syncs to property', () => {
    const el = create() as any;
    el.setAttribute('value', 'baz');
    expect(el.value).toBe('baz');
  });

  it('disabled property reflects to attribute', () => {
    const el = create() as any;
    expect(el.disabled).toBe(false);
    el.disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    el.disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  it('disabled attribute syncs to property', () => {
    const el = create({ disabled: '' }) as any;
    expect(el.disabled).toBe(true);
  });

  it('label getter returns label attribute when set', () => {
    const el = create({ value: 'a', label: 'Alpha' }) as any;
    expect(el.label).toBe('Alpha');
  });

  it('label getter falls back to textContent', () => {
    const el = create({ value: 'a' });
    el.textContent = 'Bravo';
    expect((el as any).label).toBe('Bravo');
  });

  it('label setter reflects to attribute', () => {
    const el = create() as any;
    el.label = 'Charlie';
    expect(el.getAttribute('label')).toBe('Charlie');
  });

  it('label setter removes attribute when empty', () => {
    const el = create({ label: 'X' }) as any;
    el.label = '';
    expect(el.hasAttribute('label')).toBe(false);
  });

  it('dispatches ui-select on click', () => {
    const el = create({ value: 'opt1' });
    el.textContent = 'Option One';
    const handler = vi.fn();
    el.addEventListener('ui-select', handler);

    el.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('opt1');
    expect(handler.mock.calls[0][0].detail.label).toBe('Option One');
  });

  it('does not dispatch ui-select when disabled', () => {
    const el = create({ value: 'opt1', disabled: '' });
    const handler = vi.fn();
    el.addEventListener('ui-select', handler);

    el.dispatchEvent(new Event('click'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('ui-select event bubbles and is composed', () => {
    const el = create({ value: 'x' });
    let event: CustomEvent | null = null;
    el.addEventListener('ui-select', (e) => { event = e as CustomEvent; });

    el.dispatchEvent(new Event('click'));
    expect(event!.bubbles).toBe(true);
    expect(event!.composed).toBe(true);
  });

  it('sets aria-disabled when disabled', () => {
    const el = create({ disabled: '' });
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });
});
