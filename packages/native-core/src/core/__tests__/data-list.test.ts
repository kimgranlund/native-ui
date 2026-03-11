// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { DataListController, createDataList } from '../data-list.ts';
import type { DataItem } from '../data-list.ts';
import { effect } from '../../reactivity/effect.ts';

const ITEMS: DataItem[] = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
];

// ── Group 1: Default state ──

describe('DataListController — default state', () => {
  it('starts with empty data', () => {
    const list = new DataListController();
    expect(list.data.value).toEqual([]);
  });

  it('query defaults to empty string', () => {
    const list = new DataListController();
    expect(list.query.value).toBe('');
  });

  it('view is empty when data is empty', () => {
    const list = new DataListController();
    expect(list.view.value).toEqual([]);
  });

  it('empty computed is true when view is empty', () => {
    const list = new DataListController();
    expect(list.empty.value).toBe(true);
  });

  it('activeIndex defaults to -1', () => {
    const list = new DataListController();
    expect(list.activeIndex.value).toBe(-1);
  });

  it('activeIndex can be customized via initialActiveIndex', () => {
    const list = new DataListController({ initialActiveIndex: 0 });
    expect(list.activeIndex.value).toBe(0);
  });

  it('activeItem is null when activeIndex is -1', () => {
    const list = new DataListController();
    expect(list.activeItem.value).toBeNull();
  });

  it('value is null', () => {
    const list = new DataListController();
    expect(list.value.value).toBeNull();
  });

  it('selected is empty Set', () => {
    const list = new DataListController();
    expect(list.selected.value.size).toBe(0);
  });
});

// ── Group 2: Data signal ──

describe('DataListController — data signal', () => {
  it('setting data.value populates view', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    expect(list.view.value).toHaveLength(5);
  });

  it('view reflects data identity when no filter/sort', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    expect(list.view.value).toBe(list.data.value);
  });

  it('changing data triggers view recomputation', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    expect(list.view.value).toHaveLength(5);
    list.data.value = ITEMS.slice(0, 2);
    expect(list.view.value).toHaveLength(2);
  });

  it('empty becomes false when data has items', () => {
    const list = new DataListController();
    expect(list.empty.value).toBe(true);
    list.data.value = ITEMS;
    expect(list.empty.value).toBe(false);
  });
});

// ── Group 3: Filtering ──

describe('DataListController — filtering', () => {
  it('filtered returns all items when query is empty', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    expect(list.filtered.value).toHaveLength(5);
  });

  it('filtered narrows by query (default case-insensitive label match)', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.query.value = 'united';
    expect(list.filtered.value).toHaveLength(2);
    expect(list.filtered.value.map(i => i.value)).toEqual(['us', 'uk']);
  });

  it('filtered returns empty array when nothing matches', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.query.value = 'zzz';
    expect(list.filtered.value).toHaveLength(0);
  });

  it('filtered recovers when query is cleared', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.query.value = 'zzz';
    expect(list.filtered.value).toHaveLength(0);
    list.query.value = '';
    expect(list.filtered.value).toHaveLength(5);
  });

  it('custom filterFn is used when provided', () => {
    const list = new DataListController({
      filterFn: (item, q) => item.value.startsWith(q),
    });
    list.data.value = ITEMS;
    list.query.value = 'u';
    expect(list.filtered.value.map(i => i.value)).toEqual(['us', 'uk']);
  });

  it('view updates reactively when query changes', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    expect(list.view.value).toHaveLength(5);
    list.query.value = 'france';
    expect(list.view.value).toHaveLength(1);
    expect(list.view.value[0].value).toBe('fr');
  });
});

// ── Group 4: Sorting ──

describe('DataListController — sorting', () => {
  it('sorted preserves insertion order when sortFn is null', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    expect(list.sorted.value.map(i => i.value)).toEqual(['us', 'ca', 'uk', 'de', 'fr']);
  });

  it('sorted applies sortFn when provided', () => {
    const list = new DataListController({
      sortFn: (a, b) => a.label.localeCompare(b.label),
    });
    list.data.value = ITEMS;
    expect(list.sorted.value.map(i => i.label)).toEqual([
      'Canada', 'France', 'Germany', 'United Kingdom', 'United States',
    ]);
  });

  it('sort does not mutate filtered array', () => {
    const list = new DataListController({
      sortFn: (a, b) => a.label.localeCompare(b.label),
    });
    list.data.value = ITEMS;
    // filtered should be in original order
    expect(list.filtered.value.map(i => i.value)).toEqual(['us', 'ca', 'uk', 'de', 'fr']);
    // sorted should be alphabetical
    expect(list.sorted.value[0].label).toBe('Canada');
  });

  it('view reflects sorted order', () => {
    const list = new DataListController({
      sortFn: (a, b) => a.label.localeCompare(b.label),
    });
    list.data.value = ITEMS;
    expect(list.view.value[0].label).toBe('Canada');
    expect(list.view.value[4].label).toBe('United States');
  });
});

// ── Group 5: Pipeline chain ──

describe('DataListController — pipeline chain', () => {
  it('filter then sort produces correct view', () => {
    const list = new DataListController({
      sortFn: (a, b) => a.label.localeCompare(b.label),
    });
    list.data.value = ITEMS;
    list.query.value = 'an';
    // Matches: Canada, France, Germany (all contain "an")
    expect(list.view.value.map(i => i.label)).toEqual(['Canada', 'France', 'Germany']);
  });

  it('changing data with active filter recomputes entire chain', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.query.value = 'united';
    expect(list.view.value).toHaveLength(2);
    // Add another "United" item
    list.data.value = [...ITEMS, { value: 'ae', label: 'United Arab Emirates' }];
    expect(list.view.value).toHaveLength(3);
  });

  it('changing query with active sort recomputes entire chain', () => {
    const list = new DataListController({
      sortFn: (a, b) => a.label.localeCompare(b.label),
    });
    list.data.value = ITEMS;
    list.query.value = 'an';
    expect(list.view.value.map(i => i.label)).toEqual(['Canada', 'France', 'Germany']);
    list.query.value = '';
    expect(list.view.value).toHaveLength(5);
    expect(list.view.value[0].label).toBe('Canada');
  });
});

// ── Group 6: moveActive ──

describe('DataListController — moveActive', () => {
  it('moves forward by delta', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 0;
    list.moveActive(1);
    expect(list.activeIndex.value).toBe(1);
  });

  it('wraps forward past end', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 4;
    list.moveActive(1);
    expect(list.activeIndex.value).toBe(0);
  });

  it('wraps backward past start', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 0;
    list.moveActive(-1);
    expect(list.activeIndex.value).toBe(4);
  });

  it('from -1 forward lands on 0', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.moveActive(1);
    expect(list.activeIndex.value).toBe(0);
  });

  it('no-op when view is empty', () => {
    const list = new DataListController();
    list.moveActive(1);
    expect(list.activeIndex.value).toBe(-1);
  });

  it('moves by larger deltas', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 0;
    list.moveActive(3);
    expect(list.activeIndex.value).toBe(3);
  });
});

// ── Group 7: selectActive ──

describe('DataListController — selectActive', () => {
  it('selects item at activeIndex', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 2;
    list.selectActive();
    expect(list.value.value).toBe('uk');
  });

  it('no-op when activeIndex is -1', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.selectActive();
    expect(list.value.value).toBeNull();
  });

  it('no-op when activeIndex is out of range', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 99;
    list.selectActive();
    expect(list.value.value).toBeNull();
  });

  it('sets value to item.value', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 0;
    list.selectActive();
    expect(list.value.value).toBe('us');
  });
});

// ── Group 8: Single selection ──

describe('DataListController — single selection', () => {
  it('select sets value', () => {
    const list = new DataListController();
    list.select('us');
    expect(list.value.value).toBe('us');
  });

  it('select replaces previous value', () => {
    const list = new DataListController();
    list.select('us');
    list.select('ca');
    expect(list.value.value).toBe('ca');
  });

  it('deselect is no-op in single mode', () => {
    const list = new DataListController();
    list.select('us');
    list.deselect('us');
    expect(list.value.value).toBe('us');
  });

  it('toggle selects in single mode', () => {
    const list = new DataListController();
    list.toggle('us');
    expect(list.value.value).toBe('us');
    // Toggle again still selects (no deselect in single mode)
    list.toggle('us');
    expect(list.value.value).toBe('us');
  });

  it('clearSelection clears value', () => {
    const list = new DataListController();
    list.select('us');
    list.clearSelection();
    expect(list.value.value).toBeNull();
  });
});

// ── Group 9: Multiple selection ──

describe('DataListController — multiple selection', () => {
  it('select adds to selected set and sets value', () => {
    const list = new DataListController({ multiple: true });
    list.select('us');
    list.select('ca');
    expect(list.selected.value.has('us')).toBe(true);
    expect(list.selected.value.has('ca')).toBe(true);
    expect(list.value.value).toBe('ca');
  });

  it('deselect removes from selected set', () => {
    const list = new DataListController({ multiple: true });
    list.select('us');
    list.select('ca');
    list.deselect('us');
    expect(list.selected.value.has('us')).toBe(false);
    expect(list.selected.value.has('ca')).toBe(true);
  });

  it('deselect clears value if it matches', () => {
    const list = new DataListController({ multiple: true });
    list.select('us');
    list.deselect('us');
    expect(list.value.value).toBeNull();
  });

  it('deselect does not clear value if it does not match', () => {
    const list = new DataListController({ multiple: true });
    list.select('us');
    list.select('ca');
    list.deselect('us');
    // value was 'ca' (most recent select), not 'us'
    expect(list.value.value).toBe('ca');
  });

  it('toggle adds then removes', () => {
    const list = new DataListController({ multiple: true });
    list.toggle('us');
    expect(list.selected.value.has('us')).toBe(true);
    list.toggle('us');
    expect(list.selected.value.has('us')).toBe(false);
  });

  it('clearSelection clears both value and selected', () => {
    const list = new DataListController({ multiple: true });
    list.select('us');
    list.select('ca');
    list.clearSelection();
    expect(list.value.value).toBeNull();
    expect(list.selected.value.size).toBe(0);
  });
});

// ── Group 10: selectAll ──

describe('DataListController — selectAll', () => {
  it('selects all items in view', () => {
    const list = new DataListController({ multiple: true });
    list.data.value = ITEMS;
    list.selectAll();
    expect(list.selected.value.size).toBe(5);
    expect(list.selected.value.has('us')).toBe(true);
    expect(list.selected.value.has('fr')).toBe(true);
  });

  it('only selects filtered items when query is active', () => {
    const list = new DataListController({ multiple: true });
    list.data.value = ITEMS;
    list.query.value = 'united';
    list.selectAll();
    expect(list.selected.value.size).toBe(2);
    expect(list.selected.value.has('us')).toBe(true);
    expect(list.selected.value.has('uk')).toBe(true);
    expect(list.selected.value.has('ca')).toBe(false);
  });

  it('no-op in single mode', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.selectAll();
    expect(list.selected.value.size).toBe(0);
  });
});

// ── Group 11: clearSelection vs reset ──

describe('DataListController — clearSelection', () => {
  it('preserves data and query', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.query.value = 'united';
    list.select('us');
    list.clearSelection();
    expect(list.data.value).toHaveLength(5);
    expect(list.query.value).toBe('united');
    expect(list.value.value).toBeNull();
  });
});

describe('DataListController — reset', () => {
  it('clears data, query, activeIndex, value, selected', () => {
    const list = new DataListController({ multiple: true });
    list.data.value = ITEMS;
    list.query.value = 'test';
    list.activeIndex.value = 2;
    list.select('us');
    list.reset();
    expect(list.data.value).toEqual([]);
    expect(list.query.value).toBe('');
    expect(list.activeIndex.value).toBe(-1);
    expect(list.value.value).toBeNull();
    expect(list.selected.value.size).toBe(0);
  });

  it('view becomes empty after reset', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    expect(list.view.value).toHaveLength(5);
    list.reset();
    expect(list.view.value).toHaveLength(0);
    expect(list.empty.value).toBe(true);
  });

  it('does not reset filterFn or sortFn', () => {
    const customFilter = (item: DataItem, q: string) => item.value === q;
    const list = new DataListController({ filterFn: customFilter });
    list.data.value = ITEMS;
    list.reset();
    // Re-populate after reset, custom filter should still be active
    list.data.value = ITEMS;
    list.query.value = 'us';
    expect(list.filtered.value).toHaveLength(1);
    expect(list.filtered.value[0].value).toBe('us');
  });
});

// ── Group 12: setFilter / setSort ──

describe('DataListController — setFilter', () => {
  it('replaces filterFn and triggers recomputation', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.query.value = 'can';
    // Default filter: label.toLowerCase().includes('can') — matches "Canada"
    expect(list.filtered.value).toHaveLength(1);
    expect(list.filtered.value[0].value).toBe('ca');
    // Switch to value-startsWith filter
    list.setFilter((item, q) => item.value.startsWith(q));
    // No values start with 'can' — none match
    expect(list.filtered.value).toHaveLength(0);
  });

  it('new filterFn applies to existing data + query', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.query.value = 'a';
    // Default: label.includes('a') — matches Canada, France, Germany, United States (states has 'a')
    const defaultCount = list.filtered.value.length;
    // Switch to value-startsWith filter
    list.setFilter((item, q) => item.value.startsWith(q));
    // No values start with 'a': none match
    expect(list.filtered.value).toHaveLength(0);
    expect(defaultCount).toBeGreaterThan(0);
  });
});

describe('DataListController — setSort', () => {
  it('replaces sortFn and triggers recomputation', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    expect(list.view.value[0].value).toBe('us');
    list.setSort((a, b) => a.label.localeCompare(b.label));
    expect(list.view.value[0].label).toBe('Canada');
  });

  it('setting null removes sorting', () => {
    const list = new DataListController({
      sortFn: (a, b) => a.label.localeCompare(b.label),
    });
    list.data.value = ITEMS;
    expect(list.view.value[0].label).toBe('Canada');
    list.setSort(null);
    expect(list.view.value[0].value).toBe('us');
  });
});

// ── Group 13: empty computed ──

describe('DataListController — empty', () => {
  it('true when data is empty', () => {
    const list = new DataListController();
    expect(list.empty.value).toBe(true);
  });

  it('false when data has items', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    expect(list.empty.value).toBe(false);
  });

  it('true when filter removes all items', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.query.value = 'zzzzz';
    expect(list.empty.value).toBe(true);
  });

  it('false when filter is cleared', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.query.value = 'zzzzz';
    expect(list.empty.value).toBe(true);
    list.query.value = '';
    expect(list.empty.value).toBe(false);
  });
});

// ── Group 14: activeItem computed ──

describe('DataListController — activeItem', () => {
  it('returns item at activeIndex in view', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 2;
    expect(list.activeItem.value).toEqual({ value: 'uk', label: 'United Kingdom' });
  });

  it('returns null when activeIndex is -1', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    expect(list.activeItem.value).toBeNull();
  });

  it('returns null when activeIndex >= view.length', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 99;
    expect(list.activeItem.value).toBeNull();
  });

  it('updates when view changes (filter narrows)', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 0;
    expect(list.activeItem.value?.value).toBe('us');
    list.query.value = 'canada';
    // View now has only Canada at index 0
    expect(list.activeItem.value?.value).toBe('ca');
  });

  it('updates when activeIndex changes', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 0;
    expect(list.activeItem.value?.value).toBe('us');
    list.activeIndex.value = 3;
    expect(list.activeItem.value?.value).toBe('de');
  });

  it('respects sort order', () => {
    const list = new DataListController({
      sortFn: (a, b) => a.label.localeCompare(b.label),
    });
    list.data.value = ITEMS;
    list.activeIndex.value = 0;
    // Alphabetically first is Canada
    expect(list.activeItem.value?.label).toBe('Canada');
  });
});

// ── Group 15: Reactivity ──

describe('DataListController — reactivity', () => {
  it('effect tracks view changes', () => {
    const list = new DataListController();
    const results: number[] = [];
    const dispose = effect(() => {
      results.push(list.view.value.length);
    });
    list.data.value = ITEMS;
    list.query.value = 'united';
    expect(results).toEqual([0, 5, 2]);
    dispose();
  });

  it('batch in setQuery prevents double effect execution', () => {
    const list = new DataListController();
    list.data.value = ITEMS;

    const fn = vi.fn(() => {
      list.query.value;
      list.activeIndex.value;
    });
    const dispose = effect(fn);
    fn.mockClear();

    list.setQuery('test');
    // Should fire exactly once (batched), not twice
    expect(fn).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('signal same-value skip: setting activeIndex to same value does not trigger effect', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 0;

    const fn = vi.fn(() => list.activeIndex.value);
    const dispose = effect(fn);
    fn.mockClear();

    list.activeIndex.value = 0;
    expect(fn).not.toHaveBeenCalled();
    dispose();
  });

  it('new Set() in select always triggers selected notification', () => {
    const list = new DataListController({ multiple: true });
    const results: number[] = [];
    const dispose = effect(() => {
      results.push(list.selected.value.size);
    });
    list.select('us');
    list.select('ca');
    expect(results).toEqual([0, 1, 2]);
    dispose();
  });
});

// ── Group 16: multiple getter/setter ──

describe('DataListController — multiple getter/setter', () => {
  it('defaults to false', () => {
    const list = new DataListController();
    expect(list.multiple).toBe(false);
  });

  it('can be set via constructor option', () => {
    const list = new DataListController({ multiple: true });
    expect(list.multiple).toBe(true);
  });

  it('can be toggled at runtime', () => {
    const list = new DataListController();
    expect(list.multiple).toBe(false);
    list.multiple = true;
    expect(list.multiple).toBe(true);
    list.multiple = false;
    expect(list.multiple).toBe(false);
  });

  it('switching to multiple enables multi-select behavior', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    // Single mode: select replaces, no selected set
    list.select('us');
    list.select('ca');
    expect(list.value.value).toBe('ca');
    expect(list.selected.value.size).toBe(0);

    // Switch to multiple
    list.multiple = true;
    list.select('us');
    list.select('uk');
    expect(list.selected.value.has('us')).toBe(true);
    expect(list.selected.value.has('uk')).toBe(true);
  });

  it('switching from multiple to single disables deselect', () => {
    const list = new DataListController({ multiple: true });
    list.data.value = ITEMS;
    list.select('us');
    list.select('ca');
    expect(list.selected.value.size).toBe(2);

    // Switch to single mode
    list.multiple = false;
    // deselect is no-op in single mode
    list.deselect('us');
    expect(list.value.value).toBe('ca');
  });
});

// ── Group 17: moveActive with external itemCount ──

describe('DataListController — moveActive with itemCount', () => {
  it('uses external itemCount when provided', () => {
    const list = new DataListController();
    // No data in the pipeline — view.length is 0
    list.activeIndex.value = 0;
    list.moveActive(1, 5);
    expect(list.activeIndex.value).toBe(1);
  });

  it('wraps using external itemCount', () => {
    const list = new DataListController();
    list.activeIndex.value = 4;
    list.moveActive(1, 5);
    expect(list.activeIndex.value).toBe(0);
  });

  it('wraps backward using external itemCount', () => {
    const list = new DataListController();
    list.activeIndex.value = 0;
    list.moveActive(-1, 3);
    expect(list.activeIndex.value).toBe(2);
  });

  it('no-op when external itemCount is 0', () => {
    const list = new DataListController();
    list.activeIndex.value = 0;
    list.moveActive(1, 0);
    expect(list.activeIndex.value).toBe(0);
  });

  it('falls back to view.length when itemCount is not provided', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 4;
    list.moveActive(1);
    expect(list.activeIndex.value).toBe(0); // wraps around 5 items
  });
});

// ── Group 18: selectedItem computed ──

describe('DataListController — selectedItem', () => {
  it('returns null when no selection', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    expect(list.selectedItem.value).toBeNull();
  });

  it('returns the item matching value', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.select('ca');
    expect(list.selectedItem.value).toEqual({ value: 'ca', label: 'Canada' });
  });

  it('returns null when value does not match any data item', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.select('zz');
    expect(list.selectedItem.value).toBeNull();
  });

  it('updates when value changes', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.select('us');
    expect(list.selectedItem.value?.label).toBe('United States');
    list.select('fr');
    expect(list.selectedItem.value?.label).toBe('France');
  });

  it('updates when data changes', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.select('us');
    expect(list.selectedItem.value?.label).toBe('United States');
    // Replace data with different label for same value
    list.data.value = [{ value: 'us', label: 'USA' }];
    expect(list.selectedItem.value?.label).toBe('USA');
  });

  it('returns null after clearSelection', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.select('us');
    expect(list.selectedItem.value).not.toBeNull();
    list.clearSelection();
    expect(list.selectedItem.value).toBeNull();
  });
});

// ── Group 19: setQuery with resetIndex ──

describe('DataListController — setQuery resetIndex', () => {
  it('defaults to -1 when resetIndex is not provided', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 3;
    list.setQuery('test');
    expect(list.activeIndex.value).toBe(-1);
  });

  it('resets to 0 when resetIndex is 0', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.activeIndex.value = 3;
    list.setQuery('test', 0);
    expect(list.activeIndex.value).toBe(0);
  });

  it('resets to arbitrary index', () => {
    const list = new DataListController();
    list.data.value = ITEMS;
    list.setQuery('test', 2);
    expect(list.activeIndex.value).toBe(2);
  });

  it('batches query and activeIndex changes', () => {
    const list = new DataListController();
    list.data.value = ITEMS;

    const fn = vi.fn(() => {
      list.query.value;
      list.activeIndex.value;
    });
    const dispose = effect(fn);
    fn.mockClear();

    list.setQuery('test', 0);
    expect(fn).toHaveBeenCalledTimes(1);
    dispose();
  });
});

// ── Group 20: disabled items in moveActive ──

describe('DataListController — disabled items', () => {
  const ITEMS_WITH_DISABLED: DataItem[] = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B', disabled: true },
    { value: 'c', label: 'C' },
    { value: 'd', label: 'D', disabled: true },
    { value: 'e', label: 'E' },
  ];

  it('moveActive skips disabled items forward', () => {
    const list = new DataListController();
    list.data.value = ITEMS_WITH_DISABLED;
    list.activeIndex.value = 0;
    list.moveActive(1);
    // Should skip index 1 (disabled) and land on 2
    expect(list.activeIndex.value).toBe(2);
  });

  it('moveActive skips disabled items backward', () => {
    const list = new DataListController();
    list.data.value = ITEMS_WITH_DISABLED;
    list.activeIndex.value = 2;
    list.moveActive(-1);
    // Should skip index 1 (disabled) and land on 0
    expect(list.activeIndex.value).toBe(0);
  });

  it('moveActive skips multiple consecutive disabled items', () => {
    const items: DataItem[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
      { value: 'c', label: 'C', disabled: true },
      { value: 'd', label: 'D' },
    ];
    const list = new DataListController();
    list.data.value = items;
    list.activeIndex.value = 0;
    list.moveActive(1);
    expect(list.activeIndex.value).toBe(3);
  });

  it('moveActive wraps around skipping disabled', () => {
    const list = new DataListController();
    list.data.value = ITEMS_WITH_DISABLED;
    list.activeIndex.value = 4;
    list.moveActive(1);
    // Wraps to 0 (not disabled)
    expect(list.activeIndex.value).toBe(0);
  });

  it('moveActive handles all items disabled (stops after full loop)', () => {
    const items: DataItem[] = [
      { value: 'a', label: 'A', disabled: true },
      { value: 'b', label: 'B', disabled: true },
    ];
    const list = new DataListController();
    list.data.value = items;
    list.activeIndex.value = 0;
    list.moveActive(1);
    // WHY: All items disabled — loop exhausts, cursor lands at initial candidate
    // (idx + delta) position since no enabled item was found.
    expect(list.activeIndex.value).toBe(1);
  });

  it('disabled skip only applies when using data pipeline (no itemCount)', () => {
    const list = new DataListController();
    list.data.value = ITEMS_WITH_DISABLED;
    list.activeIndex.value = 0;
    // With external itemCount, disabled skipping is bypassed
    list.moveActive(1, 5);
    expect(list.activeIndex.value).toBe(1);
  });

  it('DataItem disabled field is optional (defaults to falsy)', () => {
    const list = new DataListController();
    list.data.value = ITEMS; // original items have no disabled field
    list.activeIndex.value = 0;
    list.moveActive(1);
    expect(list.activeIndex.value).toBe(1);
  });
});

// ── Factory function ──

describe('createDataList', () => {
  it('returns a DataListController instance', () => {
    const list = createDataList();
    expect(list).toBeInstanceOf(DataListController);
  });

  it('passes options through', () => {
    const list = createDataList({ multiple: true, initialActiveIndex: 0 });
    expect(list.activeIndex.value).toBe(0);
  });
});
