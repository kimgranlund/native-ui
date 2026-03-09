import { signal, computed, batch } from '../../../reactivity/index.ts';
import type { Signal, ReadonlySignal } from '../../../reactivity/types.ts';

export type CalendarView = 'day' | 'month' | 'year';

export interface CalendarStoreOptions {
  value?: string;
  min?: string;
  max?: string;
  rangeStart?: string;
  rangeEnd?: string;
}

function parseDate(str: string | null): Date | null {
  if (!str) return null;
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export class CalendarStore {
  readonly view: Signal<CalendarView>;
  readonly focusedYear: Signal<number>;
  readonly focusedMonth: Signal<number>;
  readonly value: Signal<string | null>;
  readonly rangeStart: Signal<string | null>;
  readonly rangeEnd: Signal<string | null>;
  readonly min: Signal<string | null>;
  readonly max: Signal<string | null>;

  // WHY: Computed grid of day cells for the focused month view
  readonly days: ReadonlySignal<DayCell[]>;
  readonly months: ReadonlySignal<MonthCell[]>;
  readonly years: ReadonlySignal<YearCell[]>;
  readonly title: ReadonlySignal<string>;

  constructor(options: CalendarStoreOptions = {}) {
    const now = new Date();
    const initial = parseDate(options.value ?? null) ?? now;

    this.view = signal<CalendarView>('day');
    this.focusedYear = signal(initial.getFullYear());
    this.focusedMonth = signal(initial.getMonth());
    this.value = signal(options.value ?? null);
    this.rangeStart = signal(options.rangeStart ?? null);
    this.rangeEnd = signal(options.rangeEnd ?? null);
    this.min = signal(options.min ?? null);
    this.max = signal(options.max ?? null);

    this.days = computed(() => this.#computeDays());
    this.months = computed(() => this.#computeMonths());
    this.years = computed(() => this.#computeYears());
    this.title = computed(() => this.#computeTitle());
  }

  // ── Navigation ──

  prevMonth(): void {
    batch(() => {
      if (this.focusedMonth.value === 0) {
        this.focusedMonth.value = 11;
        this.focusedYear.value--;
      } else {
        this.focusedMonth.value--;
      }
    });
  }

  nextMonth(): void {
    batch(() => {
      if (this.focusedMonth.value === 11) {
        this.focusedMonth.value = 0;
        this.focusedYear.value++;
      } else {
        this.focusedMonth.value++;
      }
    });
  }

  prevYear(): void {
    this.focusedYear.value--;
  }

  nextYear(): void {
    this.focusedYear.value++;
  }

  prevDecade(): void {
    this.focusedYear.value -= 10;
  }

  nextDecade(): void {
    this.focusedYear.value += 10;
  }

  // ── Selection ──

  selectDate(iso: string): void {
    this.value.value = iso;
  }

  selectMonth(month: number): void {
    batch(() => {
      this.focusedMonth.value = month;
      this.view.value = 'day';
    });
  }

  selectYear(year: number): void {
    batch(() => {
      this.focusedYear.value = year;
      this.view.value = 'month';
    });
  }

  // ── Range ──

  setRange(start: string | null, end: string | null): void {
    batch(() => {
      this.rangeStart.value = start;
      this.rangeEnd.value = end;
    });
  }

  // ── Validation ──

  isDateDisabled(iso: string): boolean {
    const minDate = parseDate(this.min.value);
    const maxDate = parseDate(this.max.value);
    const d = parseDate(iso);
    if (!d) return true;
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  }

  // ── Private Computations ──

  #computeDays(): DayCell[] {
    const year = this.focusedYear.value;
    const month = this.focusedMonth.value;
    const selected = parseDate(this.value.value);
    const today = new Date();
    const rangeStartDate = parseDate(this.rangeStart.value);
    const rangeEndDate = parseDate(this.rangeEnd.value);

    // WHY: Start grid from the Sunday of the week containing the 1st
    const first = new Date(year, month, 1);
    const startDay = first.getDay(); // 0=Sun
    const gridStart = new Date(year, month, 1 - startDay);

    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const iso = toISO(d);
      const inMonth = d.getMonth() === month;
      const isToday = isSameDay(d, today);
      const isSelected = selected ? isSameDay(d, selected) : false;
      const isDisabled = this.isDateDisabled(iso);

      let inRange = false;
      let isRangeStart = false;
      let isRangeEnd = false;

      if (rangeStartDate && rangeEndDate) {
        const lo = rangeStartDate <= rangeEndDate ? rangeStartDate : rangeEndDate;
        const hi = rangeStartDate <= rangeEndDate ? rangeEndDate : rangeStartDate;
        inRange = d >= lo && d <= hi;
        isRangeStart = isSameDay(d, lo);
        isRangeEnd = isSameDay(d, hi);
      }

      cells.push({
        date: iso,
        day: d.getDate(),
        inMonth,
        isToday,
        isSelected,
        isDisabled,
        inRange,
        isRangeStart,
        isRangeEnd,
      });
    }
    return cells;
  }

  #computeMonths(): MonthCell[] {
    const year = this.focusedYear.value;
    const currentMonth = this.focusedMonth.value;
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return names.map((name, i) => ({
      month: i,
      name,
      isCurrent: i === currentMonth && year === new Date().getFullYear(),
      isSelected: i === currentMonth,
    }));
  }

  #computeYears(): YearCell[] {
    const focused = this.focusedYear.value;
    const decadeStart = Math.floor(focused / 10) * 10;
    const thisYear = new Date().getFullYear();

    const cells: YearCell[] = [];
    for (let y = decadeStart - 1; y <= decadeStart + 10; y++) {
      cells.push({
        year: y,
        inDecade: y >= decadeStart && y < decadeStart + 10,
        isCurrent: y === thisYear,
        isSelected: y === focused,
      });
    }
    return cells;
  }

  #computeTitle(): string {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    switch (this.view.value) {
      case 'day':
        return `${monthNames[this.focusedMonth.value]} ${this.focusedYear.value}`;
      case 'month':
        return `${this.focusedYear.value}`;
      case 'year': {
        const decadeStart = Math.floor(this.focusedYear.value / 10) * 10;
        return `${decadeStart}–${decadeStart + 9}`;
      }
    }
  }
}

export interface DayCell {
  date: string;      // ISO string
  day: number;       // day of month
  inMonth: boolean;  // belongs to focused month
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  inRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
}

export interface MonthCell {
  month: number;
  name: string;
  isCurrent: boolean;
  isSelected: boolean;
}

export interface YearCell {
  year: number;
  inDecade: boolean;
  isCurrent: boolean;
  isSelected: boolean;
}

export function createCalendarStore(options: CalendarStoreOptions = {}): CalendarStore {
  return new CalendarStore(options);
}
