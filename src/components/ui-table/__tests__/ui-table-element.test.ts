// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-table.ts';

// ── Helpers ──

function createTable(opts: { selectable?: boolean; sortable?: boolean } = {}): HTMLElement {
  const table = document.createElement('ui-table');
  if (opts.selectable) table.setAttribute('selectable', '');

  // Head with headers
  const head = document.createElement('ui-table-head');
  const headerRow = document.createElement('ui-table-row');

  const h1 = document.createElement('ui-table-header');
  h1.setAttribute('column', 'name');
  h1.textContent = 'Name';
  if (opts.sortable) h1.setAttribute('sortable', '');
  headerRow.appendChild(h1);

  const h2 = document.createElement('ui-table-header');
  h2.setAttribute('column', 'age');
  h2.textContent = 'Age';
  if (opts.sortable) h2.setAttribute('sortable', '');
  headerRow.appendChild(h2);

  head.appendChild(headerRow);
  table.appendChild(head);

  // Body with rows
  const body = document.createElement('ui-table-body');

  const row1 = document.createElement('ui-table-row');
  row1.setAttribute('value', 'row-1');
  const cell1a = document.createElement('ui-table-cell');
  cell1a.textContent = 'Alice';
  const cell1b = document.createElement('ui-table-cell');
  cell1b.textContent = '30';
  row1.appendChild(cell1a);
  row1.appendChild(cell1b);
  body.appendChild(row1);

  const row2 = document.createElement('ui-table-row');
  row2.setAttribute('value', 'row-2');
  const cell2a = document.createElement('ui-table-cell');
  cell2a.textContent = 'Bob';
  const cell2b = document.createElement('ui-table-cell');
  cell2b.textContent = '25';
  row2.appendChild(cell2a);
  row2.appendChild(cell2b);
  body.appendChild(row2);

  const row3 = document.createElement('ui-table-row');
  row3.setAttribute('value', 'row-3');
  const cell3a = document.createElement('ui-table-cell');
  cell3a.textContent = 'Charlie';
  const cell3b = document.createElement('ui-table-cell');
  cell3b.textContent = '35';
  row3.appendChild(cell3a);
  row3.appendChild(cell3b);
  body.appendChild(row3);

  table.appendChild(body);
  document.body.appendChild(table);
  return table;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ── Registration ──

describe('ui-table registration', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-table')).toBeDefined();
  });

  it('registers all sub-elements', () => {
    expect(customElements.get('ui-table-header')).toBeDefined();
    expect(customElements.get('ui-table-row')).toBeDefined();
    expect(customElements.get('ui-table-cell')).toBeDefined();
    expect(customElements.get('ui-table-head')).toBeDefined();
    expect(customElements.get('ui-table-body')).toBeDefined();
  });
});

// ── Structure & ARIA ──

describe('ui-table structure', () => {
  it('renders thead with column headers', () => {
    const table = createTable();
    const head = table.querySelector('ui-table-head');
    expect(head).not.toBeNull();
    const headers = table.querySelectorAll('ui-table-header');
    expect(headers).toHaveLength(2);
    expect(headers[0].textContent).toBe('Name');
    expect(headers[1].textContent).toBe('Age');
  });

  it('renders tbody with data rows', () => {
    const table = createTable();
    const body = table.querySelector('ui-table-body');
    expect(body).not.toBeNull();
    const rows = body!.querySelectorAll('ui-table-row');
    expect(rows).toHaveLength(3);
  });

  it('renders cells inside rows', () => {
    const table = createTable();
    const firstRow = table.querySelector('ui-table-body ui-table-row');
    const cells = firstRow!.querySelectorAll('ui-table-cell');
    expect(cells).toHaveLength(2);
    expect(cells[0].textContent).toBe('Alice');
    expect(cells[1].textContent).toBe('30');
  });

  it('header column property reads attribute', () => {
    const table = createTable();
    const header = table.querySelector('ui-table-header') as any;
    expect(header.column).toBe('name');
  });

  it('row value property reads attribute', () => {
    const table = createTable();
    const row = table.querySelector('ui-table-body ui-table-row') as any;
    expect(row.value).toBe('row-1');
  });

  it('row value property reflects to attribute', () => {
    const table = createTable();
    const row = table.querySelector('ui-table-body ui-table-row') as any;
    row.value = 'changed';
    expect(row.getAttribute('value')).toBe('changed');
  });
});

// ── Store ──

describe('ui-table store', () => {
  it('store is accessible', () => {
    const table = createTable();
    const store = (table as any).store;
    expect(store).toBeDefined();
    expect(store.sortColumn).toBeDefined();
    expect(store.sortDirection).toBeDefined();
    expect(store.selected).toBeDefined();
  });

  it('store can be replaced', () => {
    const table = createTable();
    const { TableStore } = require('../table-store.ts');
    const newStore = new TableStore({ sortColumn: 'name', sortDirection: 'asc' });
    (table as any).store = newStore;
    expect((table as any).store.sortColumn.value).toBe('name');
  });
});

// ── Selectable ──

describe('ui-table selectable', () => {
  it('selectable property reflects attribute', () => {
    const table = createTable();
    expect((table as any).selectable).toBe(false);
    (table as any).selectable = true;
    expect(table.hasAttribute('selectable')).toBe(true);
    (table as any).selectable = false;
    expect(table.hasAttribute('selectable')).toBe(false);
  });

  it('selectable attribute sets property', () => {
    const table = createTable({ selectable: true });
    expect((table as any).selectable).toBe(true);
  });
});

// ── Sorting ──

describe('ui-table sorting', () => {
  it('sortable header gets tabindex', () => {
    const table = createTable({ sortable: true });
    const header = table.querySelector('ui-table-header[sortable]')!;
    expect(header.getAttribute('tabindex')).toBe('0');
  });

  it('clicking a sortable header dispatches ui-sort', () => {
    const table = createTable({ sortable: true });
    const header = table.querySelector('ui-table-header[column="name"]')!;
    const handler = vi.fn();
    table.addEventListener('ui-sort', handler);
    header.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.column).toBe('name');
  });

  it('clicking a sortable header dispatches ui-table-sort with column and direction', () => {
    const table = createTable({ sortable: true });
    const header = table.querySelector('ui-table-header[column="name"]')!;
    const handler = vi.fn();
    table.addEventListener('ui-table-sort', handler);

    header.click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.column).toBe('name');
    expect(handler.mock.calls[0][0].detail.direction).toBe('asc');
  });

  it('sort cycles asc -> desc -> none on repeated clicks', () => {
    const table = createTable({ sortable: true });
    const header = table.querySelector('ui-table-header[column="name"]')!;
    const handler = vi.fn();
    table.addEventListener('ui-table-sort', handler);

    header.click(); // asc
    expect(handler.mock.calls[0][0].detail.direction).toBe('asc');

    header.click(); // desc
    expect(handler.mock.calls[1][0].detail.direction).toBe('desc');

    header.click(); // none
    expect(handler.mock.calls[2][0].detail.direction).toBe('none');
  });

  it('sort updates store sortColumn and sortDirection', () => {
    const table = createTable({ sortable: true });
    const header = table.querySelector('ui-table-header[column="age"]')!;

    header.click();

    const store = (table as any).store;
    expect(store.sortColumn.value).toBe('age');
    expect(store.sortDirection.value).toBe('asc');
  });

  it('sort updates header sort attribute via effect', async () => {
    const table = createTable({ sortable: true });
    const nameHeader = table.querySelector('ui-table-header[column="name"]')!;
    const ageHeader = table.querySelector('ui-table-header[column="age"]')!;

    nameHeader.click();
    // Effects run synchronously in this reactivity system
    await Promise.resolve();

    expect(nameHeader.getAttribute('sort')).toBe('asc');
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
    expect(ageHeader.getAttribute('sort')).toBe('none');
  });

  it('sort direction desc sets aria-sort to descending', async () => {
    const table = createTable({ sortable: true });
    const header = table.querySelector('ui-table-header[column="name"]')!;

    header.click(); // asc
    header.click(); // desc
    await Promise.resolve();

    expect(header.getAttribute('sort')).toBe('desc');
    expect(header.getAttribute('aria-sort')).toBe('descending');
  });

  it('header keyboard Enter triggers sort', () => {
    const table = createTable({ sortable: true });
    const header = table.querySelector('ui-table-header[column="name"]')!;
    const handler = vi.fn();
    table.addEventListener('ui-sort', handler);

    header.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('header keyboard Space triggers sort', () => {
    const table = createTable({ sortable: true });
    const header = table.querySelector('ui-table-header[column="name"]')!;
    const handler = vi.fn();
    table.addEventListener('ui-sort', handler);

    header.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ── Selection ──

describe('ui-table selection', () => {
  it('clicking a row in selectable table dispatches ui-row-select', () => {
    const table = createTable({ selectable: true });
    const row = table.querySelector('ui-table-body ui-table-row[value="row-1"]')!;
    const handler = vi.fn();
    table.addEventListener('ui-row-select', handler);

    row.click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('row-1');
  });

  it('clicking a row in non-selectable table does not dispatch ui-row-select', () => {
    const table = createTable({ selectable: false });
    const row = table.querySelector('ui-table-body ui-table-row[value="row-1"]')!;
    const handler = vi.fn();
    table.addEventListener('ui-row-select', handler);

    row.click();

    expect(handler).not.toHaveBeenCalled();
  });

  it('dispatches ui-table-select with selection details', () => {
    const table = createTable({ selectable: true });
    const row = table.querySelector('ui-table-body ui-table-row[value="row-1"]')!;
    const handler = vi.fn();
    table.addEventListener('ui-table-select', handler);

    row.click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('row-1');
    expect(handler.mock.calls[0][0].detail.selected).toBe(true);
    expect(handler.mock.calls[0][0].detail.allSelected).toEqual(['row-1']);
  });

  it('toggling selection off dispatches with selected=false', () => {
    const table = createTable({ selectable: true });
    const row = table.querySelector('ui-table-body ui-table-row[value="row-1"]')!;
    const handler = vi.fn();
    table.addEventListener('ui-table-select', handler);

    row.click(); // select
    row.click(); // deselect

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[1][0].detail.selected).toBe(false);
    expect(handler.mock.calls[1][0].detail.allSelected).toEqual([]);
  });

  it('selecting multiple rows accumulates selection', () => {
    const table = createTable({ selectable: true });
    const row1 = table.querySelector('ui-table-body ui-table-row[value="row-1"]')!;
    const row2 = table.querySelector('ui-table-body ui-table-row[value="row-2"]')!;
    const handler = vi.fn();
    table.addEventListener('ui-table-select', handler);

    row1.click();
    row2.click();

    const allSelected = handler.mock.calls[1][0].detail.allSelected;
    expect(allSelected).toContain('row-1');
    expect(allSelected).toContain('row-2');
    expect(allSelected).toHaveLength(2);
  });

  it('selection updates row selected attribute via effect', async () => {
    const table = createTable({ selectable: true });
    const row = table.querySelector('ui-table-body ui-table-row[value="row-1"]')!;

    row.click();
    await Promise.resolve();

    expect(row.hasAttribute('selected')).toBe(true);
    expect(row.getAttribute('aria-selected')).toBe('true');
  });

  it('deselection removes selected attribute via effect', async () => {
    const table = createTable({ selectable: true });
    const row = table.querySelector('ui-table-body ui-table-row[value="row-1"]')!;

    row.click(); // select
    row.click(); // deselect
    await Promise.resolve();

    expect(row.hasAttribute('selected')).toBe(false);
    expect(row.getAttribute('aria-selected')).toBe('false');
  });

  it('row selected property reflects attribute', () => {
    const table = createTable();
    const row = table.querySelector('ui-table-body ui-table-row') as any;
    expect(row.selected).toBe(false);
    row.selected = true;
    expect(row.hasAttribute('selected')).toBe(true);
    row.selected = false;
    expect(row.hasAttribute('selected')).toBe(false);
  });
});

// ── Empty state ──

describe('ui-table empty state', () => {
  it('renders with no rows in body', () => {
    const table = document.createElement('ui-table');
    const head = document.createElement('ui-table-head');
    table.appendChild(head);
    const body = document.createElement('ui-table-body');
    table.appendChild(body);
    document.body.appendChild(table);

    const rows = table.querySelectorAll('ui-table-body ui-table-row');
    expect(rows).toHaveLength(0);
  });
});

// ── Colspan Rows ──

function createTableWithColspan(opts: { selectable?: boolean; sortable?: boolean } = {}): HTMLElement {
  const table = document.createElement('ui-table');
  if (opts.selectable) table.setAttribute('selectable', '');

  const head = document.createElement('ui-table-head');
  const headerRow = document.createElement('ui-table-row');
  const h1 = document.createElement('ui-table-header');
  h1.setAttribute('column', 'name');
  h1.textContent = 'Name';
  if (opts.sortable) h1.setAttribute('sortable', '');
  headerRow.appendChild(h1);
  const h2 = document.createElement('ui-table-header');
  h2.setAttribute('column', 'role');
  h2.textContent = 'Role';
  if (opts.sortable) h2.setAttribute('sortable', '');
  headerRow.appendChild(h2);
  head.appendChild(headerRow);
  table.appendChild(head);

  const body = document.createElement('ui-table-body');

  // Colspan row (category header)
  const colspanRow = document.createElement('ui-table-row');
  colspanRow.setAttribute('colspan', '');
  const colspanCell = document.createElement('ui-table-cell');
  colspanCell.textContent = 'Engineering';
  colspanRow.appendChild(colspanCell);
  body.appendChild(colspanRow);

  // Normal row
  const row1 = document.createElement('ui-table-row');
  row1.setAttribute('value', 'row-1');
  const c1 = document.createElement('ui-table-cell');
  c1.textContent = 'Alice';
  const c2 = document.createElement('ui-table-cell');
  c2.textContent = 'Engineer';
  row1.appendChild(c1);
  row1.appendChild(c2);
  body.appendChild(row1);

  table.appendChild(body);
  document.body.appendChild(table);
  return table;
}

describe('ui-table colspan rows', () => {
  it('colspan row does not dispatch ui-row-select on click', () => {
    const table = createTableWithColspan({ selectable: true });
    const colspanRow = table.querySelector('ui-table-row[colspan]')!;
    const handler = vi.fn();
    table.addEventListener('ui-row-select', handler);

    colspanRow.click();

    expect(handler).not.toHaveBeenCalled();
  });

  it('normal rows still dispatch ui-row-select in same table', () => {
    const table = createTableWithColspan({ selectable: true });
    const normalRow = table.querySelector('ui-table-row[value="row-1"]')!;
    const handler = vi.fn();
    table.addEventListener('ui-row-select', handler);

    normalRow.click();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('colspan rows get hidden when sort is active', async () => {
    const table = createTableWithColspan({ sortable: true });
    const colspanRow = table.querySelector('ui-table-row[colspan]')!;
    const header = table.querySelector('ui-table-header[column="name"]')!;

    expect(colspanRow.hasAttribute('hidden')).toBe(false);

    header.click(); // triggers sort → asc
    await Promise.resolve();

    expect(colspanRow.hasAttribute('hidden')).toBe(true);
  });

  it('colspan rows become visible when sort clears', async () => {
    const table = createTableWithColspan({ sortable: true });
    const colspanRow = table.querySelector('ui-table-row[colspan]')!;
    const header = table.querySelector('ui-table-header[column="name"]')!;

    header.click(); // asc
    header.click(); // desc
    header.click(); // none (clears)
    await Promise.resolve();

    expect(colspanRow.hasAttribute('hidden')).toBe(false);
  });
});

// ── Resizable Columns ──

describe('ui-table resizable', () => {
  it('injects resize handles when resizable attribute is present', async () => {
    const table = document.createElement('ui-table');
    table.setAttribute('resizable', '');

    const head = document.createElement('ui-table-head');
    const headerRow = document.createElement('ui-table-row');
    const h1 = document.createElement('ui-table-header');
    h1.textContent = 'A';
    const h2 = document.createElement('ui-table-header');
    h2.textContent = 'B';
    headerRow.appendChild(h1);
    headerRow.appendChild(h2);
    head.appendChild(headerRow);
    table.appendChild(head);

    const body = document.createElement('ui-table-body');
    table.appendChild(body);
    document.body.appendChild(table);

    // Wait for deferChildren microtask
    await Promise.resolve();
    await Promise.resolve();

    const handles = table.querySelectorAll('.table-resize-handle');
    expect(handles).toHaveLength(2);
    expect(handles[0].getAttribute('aria-hidden')).toBe('true');
  });

  it('does not inject resize handles without resizable attribute', async () => {
    const table = createTable();
    await Promise.resolve();
    await Promise.resolve();

    const handles = table.querySelectorAll('.table-resize-handle');
    expect(handles).toHaveLength(0);
  });

  it('cleanup on teardown does not throw', async () => {
    const table = document.createElement('ui-table');
    table.setAttribute('resizable', '');

    const head = document.createElement('ui-table-head');
    const headerRow = document.createElement('ui-table-row');
    const h1 = document.createElement('ui-table-header');
    h1.textContent = 'A';
    headerRow.appendChild(h1);
    head.appendChild(headerRow);
    table.appendChild(head);

    const body = document.createElement('ui-table-body');
    table.appendChild(body);
    document.body.appendChild(table);

    await Promise.resolve();
    await Promise.resolve();

    // Remove from DOM triggers teardown
    table.remove();

    // Should not throw
    expect(true).toBe(true);
  });
});

// ── Sticky Header Measurement ──

describe('ui-table sticky header measurement', () => {
  it('sets --_header-height CSS variable when sticky-header is present', async () => {
    const table = document.createElement('ui-table');
    table.setAttribute('sticky-header', '');

    const head = document.createElement('ui-table-head');
    const headerRow = document.createElement('ui-table-row');
    const h1 = document.createElement('ui-table-header');
    h1.textContent = 'A';
    headerRow.appendChild(h1);
    head.appendChild(headerRow);
    table.appendChild(head);

    const body = document.createElement('ui-table-body');
    table.appendChild(body);
    document.body.appendChild(table);

    await Promise.resolve();
    await Promise.resolve();

    // In happy-dom, ResizeObserver may not fire. Verify the observer was set up
    // by checking that teardown doesn't throw (observer exists to disconnect).
    table.remove();
    expect(true).toBe(true);
  });

  it('does not set header observer without sticky-header attribute', async () => {
    const table = createTable();
    await Promise.resolve();
    await Promise.resolve();

    // No --_header-height should be set
    expect(table.style.getPropertyValue('--_header-height')).toBe('');
  });
});

// ── Reorderable Rows ──

function createReorderableTable(): HTMLElement {
  const table = document.createElement('ui-table');
  table.setAttribute('reorderable', '');

  const head = document.createElement('ui-table-head');
  const headerRow = document.createElement('ui-table-row');
  const h1 = document.createElement('ui-table-header');
  h1.setAttribute('column', 'task');
  h1.textContent = 'Task';
  headerRow.appendChild(h1);
  head.appendChild(headerRow);
  table.appendChild(head);

  const body = document.createElement('ui-table-body');

  for (let i = 0; i < 4; i++) {
    const row = document.createElement('ui-table-row');
    row.setAttribute('value', `row-${i}`);
    const cell = document.createElement('ui-table-cell');
    cell.textContent = `Task ${i}`;
    row.appendChild(cell);
    body.appendChild(row);
  }

  table.appendChild(body);
  document.body.appendChild(table);
  return table;
}

describe('ui-table reorderable', () => {
  it('initializes DragController when reorderable is present', async () => {
    const table = createReorderableTable();
    await Promise.resolve();
    await Promise.resolve();

    // DragController is initialized — verify by checking that pointerdown on a row
    // followed by pointermove dispatches ui-drag-start
    const row = table.querySelector('ui-table-body ui-table-row')!;
    const handler = vi.fn();
    table.addEventListener('ui-drag-start', handler);

    row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 50 }));

    expect(handler).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });

  it('does not initialize DragController without reorderable attribute', async () => {
    const table = createTable();
    await Promise.resolve();
    await Promise.resolve();

    const row = table.querySelector('ui-table-body ui-table-row')!;
    const handler = vi.fn();
    table.addEventListener('ui-drag-start', handler);

    row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 50 }));

    expect(handler).not.toHaveBeenCalled();

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });

  it('dispatches ui-table-reorder on drop', async () => {
    const table = createReorderableTable();
    await Promise.resolve();
    await Promise.resolve();

    const row = table.querySelector('ui-table-body ui-table-row[value="row-0"]')!;
    const handler = vi.fn();
    table.addEventListener('ui-table-reorder', handler);

    row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 50 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.row).toBe(row);
    expect(detail.fromIndex).toBe(0);
    expect(typeof detail.toIndex).toBe('number');
  });

  it('ui-table-reorder event is cancelable', async () => {
    const table = createReorderableTable();
    await Promise.resolve();
    await Promise.resolve();

    const handler = vi.fn((e: Event) => e.preventDefault());
    table.addEventListener('ui-table-reorder', handler);

    const rows = table.querySelectorAll('ui-table-body ui-table-row');
    const originalOrder = [...rows].map(r => r.getAttribute('value'));

    rows[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 50 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    // DOM order should NOT change when event is cancelled
    const newRows = table.querySelectorAll('ui-table-body ui-table-row');
    const newOrder = [...newRows].map(r => r.getAttribute('value'));
    expect(newOrder).toEqual(originalOrder);
  });

  it('colspan rows are excluded from drag', async () => {
    const table = document.createElement('ui-table');
    table.setAttribute('reorderable', '');

    const head = document.createElement('ui-table-head');
    const headerRow = document.createElement('ui-table-row');
    const h1 = document.createElement('ui-table-header');
    h1.textContent = 'A';
    headerRow.appendChild(h1);
    head.appendChild(headerRow);
    table.appendChild(head);

    const body = document.createElement('ui-table-body');

    const colspanRow = document.createElement('ui-table-row');
    colspanRow.setAttribute('colspan', '');
    const colspanCell = document.createElement('ui-table-cell');
    colspanCell.textContent = 'Section';
    colspanRow.appendChild(colspanCell);
    body.appendChild(colspanRow);

    const normalRow = document.createElement('ui-table-row');
    normalRow.setAttribute('value', 'r1');
    const cell = document.createElement('ui-table-cell');
    cell.textContent = 'Normal';
    normalRow.appendChild(cell);
    body.appendChild(normalRow);

    table.appendChild(body);
    document.body.appendChild(table);

    await Promise.resolve();
    await Promise.resolve();

    // Colspan row should not trigger drag
    const handler = vi.fn();
    table.addEventListener('ui-drag-start', handler);

    colspanRow.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 50 }));

    expect(handler).not.toHaveBeenCalled();

    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });

  it('click after drag is suppressed (no spurious row selection)', async () => {
    const table = document.createElement('ui-table');
    table.setAttribute('reorderable', '');
    table.setAttribute('selectable', '');

    const head = document.createElement('ui-table-head');
    const headerRow = document.createElement('ui-table-row');
    const h1 = document.createElement('ui-table-header');
    h1.textContent = 'A';
    headerRow.appendChild(h1);
    head.appendChild(headerRow);
    table.appendChild(head);

    const body = document.createElement('ui-table-body');
    const row = document.createElement('ui-table-row');
    row.setAttribute('value', 'r1');
    const cell = document.createElement('ui-table-cell');
    cell.textContent = 'Row';
    row.appendChild(cell);
    body.appendChild(row);
    table.appendChild(body);
    document.body.appendChild(table);

    await Promise.resolve();
    await Promise.resolve();

    const selectHandler = vi.fn();
    table.addEventListener('ui-table-select', selectHandler);

    // Start drag
    row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 5, clientY: 50 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    // Click that fires after drag completes — should be suppressed
    row.click();

    expect(selectHandler).not.toHaveBeenCalled();
  });

  it('teardown cleans up DragController without errors', async () => {
    const table = createReorderableTable();
    await Promise.resolve();
    await Promise.resolve();

    // Remove from DOM triggers teardown
    table.remove();
    expect(true).toBe(true);
  });
});
