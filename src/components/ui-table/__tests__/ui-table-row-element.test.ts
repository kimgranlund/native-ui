// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-table.ts';

function createRow(attrs: Record<string, string> = {}, selectable = false): HTMLElement {
  const table = document.createElement('ui-table');
  if (selectable) table.setAttribute('selectable', '');
  const body = document.createElement('ui-table-body');
  const row = document.createElement('ui-table-row');
  for (const [k, v] of Object.entries(attrs)) {
    row.setAttribute(k, v);
  }
  body.appendChild(row);
  table.appendChild(body);
  document.body.appendChild(table);
  return row;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-table-row', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-table-row')).toBeDefined();
  });

  it('value property reads from attribute', () => {
    const row = createRow({ value: 'row-1' }) as any;
    expect(row.value).toBe('row-1');
  });

  it('value property reflects to attribute', () => {
    const row = createRow() as any;
    row.value = 'row-2';
    expect(row.getAttribute('value')).toBe('row-2');
  });

  it('selected property reflects to attribute', () => {
    const row = createRow() as any;
    expect(row.selected).toBe(false);
    row.selected = true;
    expect(row.hasAttribute('selected')).toBe(true);
    row.selected = false;
    expect(row.hasAttribute('selected')).toBe(false);
  });

  it('dispatches ui-row-select on click when table is selectable', () => {
    const row = createRow({ value: 'row-1' }, true);
    const handler = vi.fn();
    row.addEventListener('ui-row-select', handler);

    row.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('row-1');
  });

  it('does not dispatch ui-row-select when table is not selectable', () => {
    const row = createRow({ value: 'row-1' }, false);
    const handler = vi.fn();
    row.addEventListener('ui-row-select', handler);

    row.dispatchEvent(new Event('click'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('ui-row-select event bubbles and is composed', () => {
    const row = createRow({ value: 'x' }, true);
    let event: CustomEvent | null = null;
    row.addEventListener('ui-row-select', (e) => { event = e as CustomEvent; });

    row.dispatchEvent(new Event('click'));
    expect(event!.bubbles).toBe(true);
    expect(event!.composed).toBe(true);
  });

  it('selected property is false by default', () => {
    const row = createRow() as any;
    expect(row.selected).toBe(false);
    expect(row.hasAttribute('selected')).toBe(false);
  });
});
