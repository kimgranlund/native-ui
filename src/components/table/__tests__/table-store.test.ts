import { describe, it, expect } from 'vitest';
import { TableStore } from '../store/table-store.ts';

describe('TableStore', () => {
  // ── Initial state ──

  it('starts with no sort column and direction "none"', () => {
    const store = new TableStore();
    expect(store.sortColumn.value).toBe(null);
    expect(store.sortDirection.value).toBe('none');
  });

  it('starts with empty selection', () => {
    const store = new TableStore();
    expect(store.selected.value.size).toBe(0);
  });

  it('accepts initial sort options', () => {
    const store = new TableStore({ sortColumn: 'name', sortDirection: 'asc' });
    expect(store.sortColumn.value).toBe('name');
    expect(store.sortDirection.value).toBe('asc');
  });

  // ── Sort ──

  it('toggleSort sets column to asc on first toggle', () => {
    const store = new TableStore();
    store.toggleSort('name');
    expect(store.sortColumn.value).toBe('name');
    expect(store.sortDirection.value).toBe('asc');
  });

  it('toggleSort cycles asc → desc → none', () => {
    const store = new TableStore();
    store.toggleSort('name');
    expect(store.sortDirection.value).toBe('asc');

    store.toggleSort('name');
    expect(store.sortDirection.value).toBe('desc');

    store.toggleSort('name');
    expect(store.sortDirection.value).toBe('none');
    expect(store.sortColumn.value).toBe(null);
  });

  it('toggleSort on different column resets to asc', () => {
    const store = new TableStore();
    store.toggleSort('name');
    store.toggleSort('name'); // desc
    store.toggleSort('age');
    expect(store.sortColumn.value).toBe('age');
    expect(store.sortDirection.value).toBe('asc');
  });

  // ── Selection ──

  it('select adds a row value', () => {
    const store = new TableStore();
    store.select('row-1');
    expect(store.isSelected('row-1')).toBe(true);
  });

  it('select multiple rows', () => {
    const store = new TableStore();
    store.select('row-1');
    store.select('row-2');
    expect(store.isSelected('row-1')).toBe(true);
    expect(store.isSelected('row-2')).toBe(true);
    expect(store.selected.value.size).toBe(2);
  });

  it('deselect removes a row value', () => {
    const store = new TableStore();
    store.select('row-1');
    store.select('row-2');
    store.deselect('row-1');
    expect(store.isSelected('row-1')).toBe(false);
    expect(store.isSelected('row-2')).toBe(true);
  });

  it('toggle adds then removes', () => {
    const store = new TableStore();
    store.toggle('row-1');
    expect(store.isSelected('row-1')).toBe(true);
    store.toggle('row-1');
    expect(store.isSelected('row-1')).toBe(false);
  });

  it('selectAll replaces the entire selection', () => {
    const store = new TableStore();
    store.select('row-1');
    store.selectAll(['row-2', 'row-3', 'row-4']);
    expect(store.isSelected('row-1')).toBe(false);
    expect(store.isSelected('row-2')).toBe(true);
    expect(store.isSelected('row-3')).toBe(true);
    expect(store.isSelected('row-4')).toBe(true);
    expect(store.selected.value.size).toBe(3);
  });

  it('clearSelection empties the set', () => {
    const store = new TableStore();
    store.select('row-1');
    store.select('row-2');
    store.clearSelection();
    expect(store.selected.value.size).toBe(0);
  });
});
