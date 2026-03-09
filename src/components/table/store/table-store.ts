import { signal } from '../../../reactivity/signal.ts';
import { batch } from '../../../reactivity/batch.ts';
import type { Signal } from '../../../reactivity/types.ts';
import type { SortDirection } from '../../../traits/sort/sort-controller.ts';

export interface TableStoreOptions {
  sortColumn?: string;
  sortDirection?: SortDirection;
  selectable?: boolean;
}

export class TableStore {
  readonly sortColumn: Signal<string | null>;
  readonly sortDirection: Signal<SortDirection>;
  readonly selected: Signal<Set<string>>;
  readonly columnWidths: Signal<number[]>;

  constructor(options: TableStoreOptions = {}) {
    this.sortColumn = signal(options.sortColumn ?? null);
    this.sortDirection = signal(options.sortDirection ?? 'none');
    this.selected = signal(new Set<string>());
    this.columnWidths = signal<number[]>([]);
  }

  toggleSort(column: string): void {
    batch(() => {
      if (this.sortColumn.value === column) {
        // WHY: Cycle through asc → desc → none
        const dir = this.sortDirection.value;
        this.sortDirection.value = dir === 'asc' ? 'desc' : dir === 'desc' ? 'none' : 'asc';
        if (this.sortDirection.value === 'none') {
          this.sortColumn.value = null;
        }
      } else {
        this.sortColumn.value = column;
        this.sortDirection.value = 'asc';
      }
    });
  }

  select(rowValue: string): void {
    const next = new Set(this.selected.value);
    next.add(rowValue);
    this.selected.value = next;
  }

  deselect(rowValue: string): void {
    const next = new Set(this.selected.value);
    next.delete(rowValue);
    this.selected.value = next;
  }

  toggle(rowValue: string): void {
    if (this.selected.value.has(rowValue)) {
      this.deselect(rowValue);
    } else {
      this.select(rowValue);
    }
  }

  selectAll(rowValues: string[]): void {
    this.selected.value = new Set(rowValues);
  }

  clearSelection(): void {
    this.selected.value = new Set();
  }

  isSelected(rowValue: string): boolean {
    return this.selected.value.has(rowValue);
  }
}

export function createTableStore(options: TableStoreOptions = {}): TableStore {
  return new TableStore(options);
}
