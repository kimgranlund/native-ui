// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-table.ts';

function createHeader(attrs: Record<string, string> = {}): HTMLElement {
  const table = document.createElement('ui-table');
  const head = document.createElement('ui-table-head');
  const row = document.createElement('ui-table-row');
  const header = document.createElement('ui-table-header');
  for (const [k, v] of Object.entries(attrs)) {
    header.setAttribute(k, v);
  }
  header.textContent = 'Name';
  row.appendChild(header);
  head.appendChild(row);
  table.appendChild(head);
  document.body.appendChild(table);
  return header;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-table-header', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-table-header')).toBeDefined();
  });

  it('column getter reads attribute', () => {
    const h = createHeader({ column: 'name' }) as any;
    expect(h.column).toBe('name');
  });

  it('sortable getter reads attribute', () => {
    const h = createHeader() as any;
    expect(h.sortable).toBe(false);
    h.setAttribute('sortable', '');
    expect(h.sortable).toBe(true);
  });

  it('sort property reflects to attribute', () => {
    const h = createHeader({ sortable: '' }) as any;
    expect(h.sort).toBe('none');
    h.sort = 'asc';
    expect(h.getAttribute('sort')).toBe('asc');
  });

  it('sortable header gets tabindex=0', () => {
    const h = createHeader({ sortable: '', column: 'name' });
    expect(h.getAttribute('tabindex')).toBe('0');
  });

  it('non-sortable header has no tabindex', () => {
    const h = createHeader({ column: 'name' });
    expect(h.hasAttribute('tabindex')).toBe(false);
  });

  it('dispatches ui-sort on click when sortable', () => {
    const h = createHeader({ sortable: '', column: 'age' });
    const handler = vi.fn();
    h.addEventListener('ui-sort', handler);

    h.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.column).toBe('age');
  });

  it('does not dispatch ui-sort on click when not sortable', () => {
    const h = createHeader({ column: 'age' });
    const handler = vi.fn();
    h.addEventListener('ui-sort', handler);

    h.dispatchEvent(new Event('click'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('dispatches ui-sort on Enter key', () => {
    const h = createHeader({ sortable: '', column: 'name' });
    const handler = vi.fn();
    h.addEventListener('ui-sort', handler);

    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dispatches ui-sort on Space key', () => {
    const h = createHeader({ sortable: '', column: 'name' });
    const handler = vi.fn();
    h.addEventListener('ui-sort', handler);

    h.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ui-sort event bubbles and is composed', () => {
    const h = createHeader({ sortable: '', column: 'x' });
    let event: CustomEvent | null = null;
    h.addEventListener('ui-sort', (e) => { event = e as CustomEvent; });

    h.dispatchEvent(new Event('click'));
    expect(event!.bubbles).toBe(true);
    expect(event!.composed).toBe(true);
  });
});
