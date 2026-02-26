// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-command.ts';

function create(attrs: Record<string, string> = {}, text = 'Item'): HTMLElement {
  const el = document.createElement('ui-command-item');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  el.textContent = text;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-command-item', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-command-item')).toBeDefined();
  });

  it('value property reflects to attribute', () => {
    const el = create({ value: 'cmd1' }) as any;
    expect(el.value).toBe('cmd1');
    el.value = 'cmd2';
    expect(el.getAttribute('value')).toBe('cmd2');
  });

  it('value attribute syncs to property', () => {
    const el = create() as any;
    el.setAttribute('value', 'new-val');
    expect(el.value).toBe('new-val');
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

  it('keywords property reflects to attribute', () => {
    const el = create() as any;
    el.keywords = 'search filter';
    expect(el.getAttribute('keywords')).toBe('search filter');
  });

  it('keywords setter removes attribute when empty', () => {
    const el = create({ keywords: 'old' }) as any;
    el.keywords = '';
    expect(el.hasAttribute('keywords')).toBe(false);
  });

  it('label getter returns textContent', () => {
    const el = create({}, 'My Command') as any;
    expect(el.label).toBe('My Command');
  });

  it('searchText aggregates label, value, and keywords', () => {
    const el = create({ value: 'copy', keywords: 'duplicate clone' }, 'Copy Text') as any;
    const search = el.searchText;
    expect(search).toContain('copy text');
    expect(search).toContain('copy');
    expect(search).toContain('duplicate clone');
  });

  it('dispatches ui-select on click', () => {
    const el = create({ value: 'cmd1' }, 'Do Something');
    const handler = vi.fn();
    el.addEventListener('ui-select', handler);

    el.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('cmd1');
    expect(handler.mock.calls[0][0].detail.label).toBe('Do Something');
  });

  it('does not dispatch ui-select when disabled', () => {
    const el = create({ value: 'cmd1', disabled: '' });
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
