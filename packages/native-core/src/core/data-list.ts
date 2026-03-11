import { signal } from '../reactivity/signal.ts';
import { computed } from '../reactivity/computed.ts';
import { batch } from '../reactivity/batch.ts';
import type { Signal, ReadonlySignal } from '../reactivity/types.ts';

export interface DataItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DataListOptions<T extends DataItem> {
  filterFn?: (item: T, query: string) => boolean;
  sortFn?: ((a: T, b: T) => number) | null;
  multiple?: boolean;
  initialActiveIndex?: number;
}

// WHY: Default filter is case-insensitive label.includes(query)
function defaultFilter<T extends DataItem>(item: T, query: string): boolean {
  return item.label.toLowerCase().includes(query.toLowerCase());
}

export class DataListController<T extends DataItem> {

  // ── Source signals ──

  readonly data: Signal<T[]>;
  readonly query: Signal<string>;

  // ── Pipeline function signals (reactive so setFilter/setSort trigger recomputation) ──

  readonly #filterFn: Signal<(item: T, query: string) => boolean>;
  readonly #sortFn: Signal<((a: T, b: T) => number) | null>;

  // ── Pipeline computed outputs ──

  readonly filtered: ReadonlySignal<T[]>;
  readonly sorted: ReadonlySignal<T[]>;

  // ── Cursor ──

  readonly activeIndex: Signal<number>;
  readonly activeItem: ReadonlySignal<T | null>;

  // ── Selection ──

  readonly value: Signal<string | null>;
  readonly selected: Signal<Set<string>>;
  readonly #multiple: Signal<boolean>;

  // ── Derived ──

  readonly selectedItem: ReadonlySignal<T | null>;
  readonly empty: ReadonlySignal<boolean>;

  constructor(options: DataListOptions<T> = {}) {
    this.data = signal<T[]>([]);
    this.query = signal('');
    this.#filterFn = signal(options.filterFn ?? defaultFilter);
    this.#sortFn = signal(options.sortFn ?? null);
    this.#multiple = signal(options.multiple ?? false);
    this.activeIndex = signal(options.initialActiveIndex ?? -1);
    this.value = signal<string | null>(null);
    this.selected = signal<Set<string>>(new Set());

    // ── Pipeline computeds ──

    this.filtered = computed(() => {
      const items = this.data.value;
      const q = this.query.value;
      const fn = this.#filterFn.value;
      // WHY: When query is empty, return data as-is (no allocation, no filter overhead).
      if (!q) return items;
      return items.filter(item => fn(item, q));
    });

    this.sorted = computed(() => {
      const items = this.filtered.value;
      const fn = this.#sortFn.value;
      // WHY: When sortFn is null, return filtered identity (preserve insertion order).
      // Spread into new array to avoid mutating the filtered computed's cached array.
      if (!fn) return items;
      return [...items].sort(fn);
    });

    this.activeItem = computed(() => {
      const items = this.view.value;
      const idx = this.activeIndex.value;
      return idx >= 0 && idx < items.length ? items[idx] : null;
    });

    // WHY: Looks up the selected item from data by value. Returns null if no
    // selection or item not found. Consumers use this for label display.
    this.selectedItem = computed(() => {
      const val = this.value.value;
      if (val === null) return null;
      return this.data.value.find(item => item.value === val) ?? null;
    });

    this.empty = computed(() => this.view.value.length === 0);
  }

  // ── View alias ──

  // WHY: `view` is the single output signal consumers should read. It's an alias
  // for `sorted` — the final stage of the pipeline.
  get view(): ReadonlySignal<T[]> {
    return this.sorted;
  }

  // ── Multiple selection mode ──

  get multiple(): boolean {
    return this.#multiple.value;
  }

  set multiple(val: boolean) {
    this.#multiple.value = val;
  }

  // ── Query ──

  setQuery(text: string, resetIndex?: number): void {
    // WHY: Batch because we change two signals atomically.
    batch(() => {
      this.query.value = text;
      // WHY: Reset cursor when query changes — the filtered list is about to change.
      // Optional resetIndex lets callers choose where cursor lands (e.g. 0 for command palette).
      this.activeIndex.value = resetIndex ?? -1;
    });
  }

  // ── Cursor navigation ──

  moveActive(delta: number, itemCount?: number): void {
    // WHY: Optional itemCount lets DOM-driven components (listbox, command) pass
    // their own visible-item count instead of relying on the data pipeline.
    const len = itemCount ?? this.view.value.length;
    // WHY: No-op on empty list prevents division by zero in modulo.
    if (len === 0) return;
    const idx = this.activeIndex.value;

    // WHY: When using the data pipeline (no external itemCount), skip disabled items.
    // DOM-driven components handle disabled skipping themselves via CSS selectors.
    if (itemCount == null) {
      const items = this.view.value;
      let next = (idx + delta + len) % len;
      // WHY: Guard against infinite loop when all items are disabled.
      let steps = 0;
      while (items[next]?.disabled && steps < len) {
        next = (next + delta + len) % len;
        steps++;
      }
      this.activeIndex.value = next;
      return;
    }

    // WHY: From -1, forward (+1) lands on index 0: (-1 + 1 + len) % len = 0.
    this.activeIndex.value = (idx + delta + len) % len;
  }

  // ── Selection ──

  selectActive(): void {
    const item = this.activeItem.value;
    if (!item) return;
    this.select(item.value);
  }

  select(val: string): void {
    if (this.#multiple.value) {
      // WHY: Create new Set to trigger signal notification (Object.is check).
      const next = new Set(this.selected.value);
      next.add(val);
      batch(() => {
        this.selected.value = next;
        this.value.value = val;
      });
    } else {
      this.value.value = val;
    }
  }

  deselect(val: string): void {
    if (!this.#multiple.value) return;
    const next = new Set(this.selected.value);
    next.delete(val);
    batch(() => {
      this.selected.value = next;
      // WHY: Clear value if it was the deselected item.
      if (this.value.value === val) {
        this.value.value = null;
      }
    });
  }

  toggle(val: string): void {
    if (this.#multiple.value && this.selected.value.has(val)) {
      this.deselect(val);
    } else {
      this.select(val);
    }
  }

  selectAll(): void {
    if (!this.#multiple.value) return;
    // WHY: Select all items currently in view, not all in data.
    const viewItems = this.view.value;
    this.selected.value = new Set(viewItems.map(item => item.value));
  }

  clearSelection(): void {
    // WHY: Only clears selection state. Data, query, filter, sort remain untouched.
    batch(() => {
      this.value.value = null;
      this.selected.value = new Set();
    });
  }

  reset(): void {
    // WHY: Full reset — clears user state back to initial. Uses batch to prevent
    // cascading intermediate states.
    batch(() => {
      this.data.value = [];
      this.query.value = '';
      this.activeIndex.value = -1;
      this.value.value = null;
      this.selected.value = new Set();
    });
  }

  // ── Runtime pipeline reconfiguration ──

  setFilter(fn: (item: T, query: string) => boolean): void {
    this.#filterFn.value = fn;
  }

  setSort(fn: ((a: T, b: T) => number) | null): void {
    this.#sortFn.value = fn;
  }
}

export function createDataList<T extends DataItem>(
  options?: DataListOptions<T>,
): DataListController<T> {
  return new DataListController<T>(options);
}
