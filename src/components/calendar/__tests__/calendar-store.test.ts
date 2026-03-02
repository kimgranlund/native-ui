import { describe, it, expect } from 'vitest';
import { CalendarStore } from '../calendar-store.ts';

describe('CalendarStore', () => {
  // ── Initial state ──

  it('defaults to day view', () => {
    const store = new CalendarStore();
    expect(store.view.value).toBe('day');
  });

  it('uses current date when no value provided', () => {
    const store = new CalendarStore();
    const now = new Date();
    expect(store.focusedYear.value).toBe(now.getFullYear());
    expect(store.focusedMonth.value).toBe(now.getMonth());
    expect(store.value.value).toBe(null);
  });

  it('parses initial value into focused year/month', () => {
    const store = new CalendarStore({ value: '2025-03-15' });
    expect(store.focusedYear.value).toBe(2025);
    expect(store.focusedMonth.value).toBe(2); // March = 2
    expect(store.value.value).toBe('2025-03-15');
  });

  // ── Navigation ──

  it('prevMonth decrements month', () => {
    const store = new CalendarStore({ value: '2025-06-15' });
    store.prevMonth();
    expect(store.focusedMonth.value).toBe(4); // May
    expect(store.focusedYear.value).toBe(2025);
  });

  it('prevMonth wraps from January to December of previous year', () => {
    const store = new CalendarStore({ value: '2025-01-15' });
    store.prevMonth();
    expect(store.focusedMonth.value).toBe(11); // December
    expect(store.focusedYear.value).toBe(2024);
  });

  it('nextMonth increments month', () => {
    const store = new CalendarStore({ value: '2025-06-15' });
    store.nextMonth();
    expect(store.focusedMonth.value).toBe(6); // July
    expect(store.focusedYear.value).toBe(2025);
  });

  it('nextMonth wraps from December to January of next year', () => {
    const store = new CalendarStore({ value: '2025-12-15' });
    store.nextMonth();
    expect(store.focusedMonth.value).toBe(0); // January
    expect(store.focusedYear.value).toBe(2026);
  });

  it('prevYear / nextYear adjusts year', () => {
    const store = new CalendarStore({ value: '2025-06-15' });
    store.prevYear();
    expect(store.focusedYear.value).toBe(2024);
    store.nextYear();
    store.nextYear();
    expect(store.focusedYear.value).toBe(2026);
  });

  it('prevDecade / nextDecade adjusts by 10', () => {
    const store = new CalendarStore({ value: '2025-06-15' });
    store.prevDecade();
    expect(store.focusedYear.value).toBe(2015);
    store.nextDecade();
    store.nextDecade();
    expect(store.focusedYear.value).toBe(2035);
  });

  // ── Selection ──

  it('selectDate updates value', () => {
    const store = new CalendarStore();
    store.selectDate('2025-07-04');
    expect(store.value.value).toBe('2025-07-04');
  });

  it('selectMonth sets month and switches to day view', () => {
    const store = new CalendarStore({ value: '2025-06-15' });
    store.view.value = 'month';
    store.selectMonth(9); // October
    expect(store.focusedMonth.value).toBe(9);
    expect(store.view.value).toBe('day');
  });

  it('selectYear sets year and switches to month view', () => {
    const store = new CalendarStore({ value: '2025-06-15' });
    store.view.value = 'year';
    store.selectYear(2030);
    expect(store.focusedYear.value).toBe(2030);
    expect(store.view.value).toBe('month');
  });

  // ── Range ──

  it('setRange updates rangeStart and rangeEnd', () => {
    const store = new CalendarStore();
    store.setRange('2025-03-10', '2025-03-20');
    expect(store.rangeStart.value).toBe('2025-03-10');
    expect(store.rangeEnd.value).toBe('2025-03-20');
  });

  // ── Day grid computation ──

  it('produces 42 day cells', () => {
    const store = new CalendarStore({ value: '2025-03-15' });
    expect(store.days.value.length).toBe(42);
  });

  it('marks cells in the focused month', () => {
    const store = new CalendarStore({ value: '2025-03-15' });
    const marchCells = store.days.value.filter(d => d.inMonth);
    expect(marchCells.length).toBe(31); // March has 31 days
  });

  it('marks the selected date', () => {
    const store = new CalendarStore({ value: '2025-03-15' });
    const selected = store.days.value.filter(d => d.isSelected);
    expect(selected.length).toBe(1);
    expect(selected[0].date).toBe('2025-03-15');
  });

  it('starts grid from Sunday of the week containing the 1st', () => {
    // March 2025: 1st is a Saturday → grid starts Feb 23 (Sunday)
    const store = new CalendarStore({ value: '2025-03-15' });
    const first = store.days.value[0];
    expect(first.date).toBe('2025-02-23');
  });

  it('marks range cells correctly', () => {
    const store = new CalendarStore({
      value: '2025-03-15',
      rangeStart: '2025-03-10',
      rangeEnd: '2025-03-14',
    });
    const inRange = store.days.value.filter(d => d.inRange);
    expect(inRange.length).toBe(5); // 10, 11, 12, 13, 14
    expect(inRange[0].isRangeStart).toBe(true);
    expect(inRange[inRange.length - 1].isRangeEnd).toBe(true);
  });

  it('handles reversed range (end before start)', () => {
    const store = new CalendarStore({
      value: '2025-03-15',
      rangeStart: '2025-03-14',
      rangeEnd: '2025-03-10',
    });
    const inRange = store.days.value.filter(d => d.inRange);
    expect(inRange.length).toBe(5);
    // isRangeStart should be on the earlier date regardless
    expect(inRange[0].date).toBe('2025-03-10');
    expect(inRange[0].isRangeStart).toBe(true);
  });

  // ── Validation ──

  it('isDateDisabled returns true for dates before min', () => {
    const store = new CalendarStore({ min: '2025-03-10' });
    expect(store.isDateDisabled('2025-03-09')).toBe(true);
    expect(store.isDateDisabled('2025-03-10')).toBe(false);
  });

  it('isDateDisabled returns true for dates after max', () => {
    const store = new CalendarStore({ max: '2025-03-20' });
    expect(store.isDateDisabled('2025-03-21')).toBe(true);
    expect(store.isDateDisabled('2025-03-20')).toBe(false);
  });

  it('marks disabled cells in day grid', () => {
    const store = new CalendarStore({
      value: '2025-03-15',
      min: '2025-03-10',
      max: '2025-03-20',
    });
    const disabled = store.days.value.filter(d => d.isDisabled);
    const enabled = store.days.value.filter(d => !d.isDisabled);
    expect(enabled.length).toBe(11); // March 10-20 inclusive
    expect(disabled.length).toBe(31); // 42 - 11
  });

  // ── Month grid ──

  it('produces 12 month cells', () => {
    const store = new CalendarStore({ value: '2025-06-15' });
    expect(store.months.value.length).toBe(12);
    expect(store.months.value[0].name).toBe('Jan');
    expect(store.months.value[11].name).toBe('Dec');
  });

  it('marks the focused month as selected', () => {
    const store = new CalendarStore({ value: '2025-06-15' });
    const selected = store.months.value.filter(m => m.isSelected);
    expect(selected.length).toBe(1);
    expect(selected[0].month).toBe(5); // June
  });

  // ── Year grid ──

  it('produces 12 year cells (decade -1 to +10)', () => {
    const store = new CalendarStore({ value: '2025-06-15' });
    expect(store.years.value.length).toBe(12);
    expect(store.years.value[0].year).toBe(2019); // 2020 decade - 1
    expect(store.years.value[11].year).toBe(2030); // 2020 + 10
  });

  it('marks years in the decade', () => {
    const store = new CalendarStore({ value: '2025-06-15' });
    const inDecade = store.years.value.filter(y => y.inDecade);
    expect(inDecade.length).toBe(10);
    expect(inDecade[0].year).toBe(2020);
    expect(inDecade[9].year).toBe(2029);
  });

  it('marks focused year as selected', () => {
    const store = new CalendarStore({ value: '2025-06-15' });
    const selected = store.years.value.filter(y => y.isSelected);
    expect(selected.length).toBe(1);
    expect(selected[0].year).toBe(2025);
  });

  // ── Title ──

  it('title shows month and year in day view', () => {
    const store = new CalendarStore({ value: '2025-03-15' });
    expect(store.title.value).toBe('March 2025');
  });

  it('title shows year in month view', () => {
    const store = new CalendarStore({ value: '2025-03-15' });
    store.view.value = 'month';
    expect(store.title.value).toBe('2025');
  });

  it('title shows decade range in year view', () => {
    const store = new CalendarStore({ value: '2025-03-15' });
    store.view.value = 'year';
    expect(store.title.value).toBe('2020–2029');
  });
});
