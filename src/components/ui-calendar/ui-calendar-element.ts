import { signal } from '../../reactivity/signal.ts';
import { batch } from '../../reactivity/batch.ts';
import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { CalendarStore } from './calendar-store.ts';
import { FormAssociable } from '../../core/form-associable.ts';

/**
 * Calendar date picker with day/month/year views and optional range selection.
 * @attr {string} value - Selected date in ISO format (YYYY-MM-DD)
 * @attr {string} min - Minimum selectable date in ISO format
 * @attr {string} max - Maximum selectable date in ISO format
 * @attr {boolean} disabled - Disables interaction
 * @attr {string} name - Form field name
 * @attr {boolean} range - Enables range selection mode
 * @fires ui-change - Fired on single date selection with `{ value }` detail
 * @fires ui-range-select - Fired on range commit with `{ start, end }` detail
 */
export class UICalendar extends FormAssociable(UIElement) {
  static observedAttributes = ['value', 'min', 'max', 'disabled', 'name', 'range', 'required'];

  #internals: ElementInternals;
  #store = new CalendarStore();
  #disabled = signal(false);
  #required = signal(false);
  #initialValue: string | null = null;

  // WHY: Track focused cell index for keyboard navigation within the grid
  #focusedIndex = signal(0);

  // WHY: 3-phase range cycle: idle → selecting (hover previews) → committed → idle
  #rangePhase: 'idle' | 'selecting' | 'committed' = 'idle';

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'group';
    this.setAttribute('tabindex', '0');
  }

  get store(): CalendarStore {
    return this.#store;
  }

  get value(): string | null {
    return this.#store.value.value;
  }

  set value(val: string | null) {
    this.#store.value.value = val;
    if (val) {
      this.setAttribute('value', val);
    } else {
      this.removeAttribute('value');
    }
  }

  get disabled(): boolean {
    return this.#disabled.value;
  }

  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  // ── Required ──

  get required(): boolean { return this.#required.value; }
  set required(val: boolean) {
    this.#required.value = val;
    this.toggleAttribute('required', val);
  }

  get range(): boolean {
    return this.hasAttribute('range');
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'value':
        this.#store.value.value = val;
        break;
      case 'min':
        this.#store.min.value = val;
        break;
      case 'max':
        this.#store.max.value = val;
        break;
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
      case 'required':
        this.#required.value = val !== null;
        break;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();
    this.#initialValue = this.getAttribute('value');

    // WHY: Initialize store from attributes — batch to avoid 3 intermediate recomputes
    const val = this.getAttribute('value');
    const min = this.getAttribute('min');
    const max = this.getAttribute('max');
    batch(() => {
      if (val) this.#store.value.value = val;
      if (min) this.#store.min.value = min;
      if (max) this.#store.max.value = max;
    });

    // Stamp internal structure
    this.#stamp();

    this.addEventListener('keydown', this.#onKeyDown);

    // WHY: Single effect re-renders the calendar whenever store state changes
    this.addEffect(() => this.#render());

    // WHY: Sync form value
    this.addEffect(() => {
      this.#internals.setFormValue(this.#store.value.value);
    });

    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals, { manageTabindex: true }));

    // Validity: required constraint
    this.#required.value = this.hasAttribute('required');
    this.addEffect(() => {
      const val = this.#store.value.value;
      if (this.#required.value && (val === null || val === '')) {
        this.#internals.setValidity({ valueMissing: true }, 'Please select a date.', this);
      } else {
        this.#internals.setValidity({});
      }
    });
  }

  teardown(): void {
    this.querySelector('.cal-prev')?.removeEventListener('click', this.#onPrevClick);
    this.querySelector('.cal-next')?.removeEventListener('click', this.#onNextClick);
    this.querySelector('.cal-title')?.removeEventListener('click', this.#onTitleClickHandler);
    const grid = this.querySelector('.cal-grid');
    grid?.removeEventListener('click', this.#onGridClickHandler);
    grid?.removeEventListener('pointermove', this.#onGridPointerMoveHandler);
    this.removeEventListener('keydown', this.#onKeyDown);
    super.teardown();
  }

  override onFormDisabled(disabled: boolean): void {
    this.#disabled.value = disabled;
  }

  override onFormReset(): void {
    this.#store.value.value = this.#initialValue;
    if (this.#initialValue) {
      this.setAttribute('value', this.#initialValue);
    } else {
      this.removeAttribute('value');
    }
  }

  #stamp(): void {
    this.innerHTML = `
      <div class="cal-header">
        <button type="button" class="cal-prev" aria-label="Previous" tabindex="-1"></button>
        <button type="button" class="cal-title" tabindex="-1"></button>
        <button type="button" class="cal-next" aria-label="Next" tabindex="-1"></button>
      </div>
      <div class="cal-weekdays"></div>
      <div class="cal-grid" role="grid"></div>
    `;

    const prev = this.querySelector('.cal-prev') as HTMLElement | null;
    const next = this.querySelector('.cal-next') as HTMLElement | null;
    const title = this.querySelector('.cal-title') as HTMLElement | null;

    prev?.addEventListener('click', this.#onPrevClick);
    next?.addEventListener('click', this.#onNextClick);
    title?.addEventListener('click', this.#onTitleClickHandler);

    const grid = this.querySelector('.cal-grid') as HTMLElement | null;
    grid?.addEventListener('click', this.#onGridClickHandler);
    grid?.addEventListener('pointermove', this.#onGridPointerMoveHandler);
  }

  #render(): void {
    const view = this.#store.view.value;
    const title = this.querySelector('.cal-title') as HTMLElement | null;
    const weekdays = this.querySelector('.cal-weekdays') as HTMLElement | null;
    const grid = this.querySelector('.cal-grid') as HTMLElement | null;
    if (!title || !weekdays || !grid) return;

    title.textContent = this.#store.title.value;

    if (view === 'day') {
      this.setAttribute('view', 'day');
      weekdays.innerHTML = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
        .map(d => `<span class="cal-weekday">${d}</span>`)
        .join('');

      const days = this.#store.days.value;
      grid.innerHTML = days.map((cell, i) => {
        let attrs = `class="cal-cell" data-date="${cell.date}" data-index="${i}" tabindex="-1"`;
        if (!cell.inMonth) attrs += ' data-outside';
        if (cell.isToday) attrs += ' data-today';
        if (cell.isSelected) attrs += ' data-selected';
        if (cell.isDisabled) attrs += ' disabled';
        if (cell.inRange) attrs += ' data-in-range';
        if (cell.isRangeStart) attrs += ' data-range-start';
        if (cell.isRangeEnd) attrs += ' data-range-end';

        return `<button type="button" ${attrs}>${cell.day}</button>`;
      }).join('');

    } else if (view === 'month') {
      this.setAttribute('view', 'month');
      weekdays.innerHTML = '';

      const months = this.#store.months.value;
      grid.innerHTML = months.map(cell => {
        let attrs = `class="cal-cell" data-month="${cell.month}" tabindex="-1"`;
        if (cell.isCurrent) attrs += ' data-today';
        if (cell.isSelected) attrs += ' data-selected';

        return `<button type="button" ${attrs}>${cell.name}</button>`;
      }).join('');

    } else {
      this.setAttribute('view', 'year');
      weekdays.innerHTML = '';

      const years = this.#store.years.value;
      grid.innerHTML = years.map(cell => {
        let attrs = `class="cal-cell" data-year="${cell.year}" tabindex="-1"`;
        if (!cell.inDecade) attrs += ' data-outside';
        if (cell.isCurrent) attrs += ' data-today';
        if (cell.isSelected) attrs += ' data-selected';

        return `<button type="button" ${attrs}>${cell.year}</button>`;
      }).join('');
    }
  }

  #onPrevClick = (): void => { this.#onPrev(); };
  #onNextClick = (): void => { this.#onNext(); };
  #onTitleClickHandler = (): void => { this.#onTitleClick(); };
  #onGridClickHandler = (e: Event): void => { this.#onGridClick(e as MouseEvent); };
  #onGridPointerMoveHandler = (e: Event): void => { this.#onGridPointerMove(e as PointerEvent); };

  #onPrev(): void {
    const view = this.#store.view.value;
    if (view === 'day') this.#store.prevMonth();
    else if (view === 'month') this.#store.prevYear();
    else this.#store.prevDecade();
  }

  #onNext(): void {
    const view = this.#store.view.value;
    if (view === 'day') this.#store.nextMonth();
    else if (view === 'month') this.#store.nextYear();
    else this.#store.nextDecade();
  }

  #onTitleClick(): void {
    const view = this.#store.view.value;
    if (view === 'day') this.#store.view.value = 'month';
    else if (view === 'month') this.#store.view.value = 'year';
  }

  #onGridClick(e: MouseEvent): void {
    if (this.#disabled.value) return;
    const btn = (e.target as HTMLElement).closest('.cal-cell') as HTMLElement | null;
    if (!btn || btn.hasAttribute('disabled')) return;

    const date = btn.dataset.date;
    const month = btn.dataset.month;
    const year = btn.dataset.year;

    if (date) {
      this.#selectDate(date);
    } else if (month !== undefined) {
      this.#store.selectMonth(Number(month));
    } else if (year !== undefined) {
      this.#store.selectYear(Number(year));
    }
  }

  #selectDate(iso: string): void {
    if (this.range) {
      // WHY: 3-phase range cycle:
      // idle → click picks start, enter "selecting" phase
      // selecting → click commits end, enter "committed" phase
      // committed → click clears everything, back to "idle"
      if (this.#rangePhase === 'idle') {
        this.#store.selectDate(iso);
        this.#store.setRange(iso, null);
        this.setAttribute('value', iso);
        this.#rangePhase = 'selecting';
      } else if (this.#rangePhase === 'selecting') {
        const start = this.#store.rangeStart.value;
        if (!start) return;
        this.#store.setRange(start, iso);
        this.#rangePhase = 'committed';
        this.dispatchEvent(new CustomEvent('ui-range-select', {
          bubbles: true,
          composed: true,
          detail: { start: this.#store.rangeStart.value, end: this.#store.rangeEnd.value },
        }));
      } else {
        // committed → clear everything
        this.#store.value.value = null;
        this.#store.setRange(null, null);
        this.removeAttribute('value');
        this.#rangePhase = 'idle';
      }
    } else {
      this.#store.selectDate(iso);
      this.setAttribute('value', iso);
      this.dispatchEvent(new CustomEvent('ui-change', {
        bubbles: true,
        composed: true,
        detail: { value: iso },
      }));
    }
  }

  #onGridPointerMove(e: PointerEvent): void {
    if (this.#disabled.value) return;
    if (!this.range || this.#rangePhase !== 'selecting') return;
    const btn = (e.target as HTMLElement).closest('.cal-cell') as HTMLElement | null;
    if (!btn || btn.hasAttribute('disabled')) return;
    const date = btn.dataset.date;
    if (!date) return;
    // WHY: Live-preview range as user hovers — store recomputes day grid with inRange flags
    const start = this.#store.rangeStart.value;
    if (!start) return;
    this.#store.setRange(start, date);
  }

  #onKeyDown = (e: KeyboardEvent): void => {
    if (this.#disabled.value) return;

    const view = this.#store.view.value;
    if (view !== 'day') return;

    const days = this.#store.days.value;
    let idx = this.#focusedIndex.value;
    let handled = true;

    switch (e.key) {
      case 'ArrowRight': idx += 1; break;
      case 'ArrowLeft': idx -= 1; break;
      case 'ArrowDown': idx += 7; break;
      case 'ArrowUp': idx -= 7; break;
      case 'Home':
        // WHY: Jump to first day of current week
        idx = idx - (idx % 7);
        break;
      case 'End':
        idx = idx - (idx % 7) + 6;
        break;
      case 'PageDown':
        e.shiftKey ? this.#store.nextYear() : this.#store.nextMonth();
        break;
      case 'PageUp':
        e.shiftKey ? this.#store.prevYear() : this.#store.prevMonth();
        break;
      case 'Enter':
      case ' ': {
        const cell = days[idx];
        if (cell && !cell.isDisabled) {
          this.#selectDate(cell.date);
        }
        break;
      }
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      idx = Math.max(0, Math.min(41, idx));
      this.#focusedIndex.value = idx;

      // WHY: Navigate to prev/next month if focus moves outside current grid
      if (idx < 0) this.#store.prevMonth();
      if (idx > 41) this.#store.nextMonth();
    }
  };
}
