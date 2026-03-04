// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../calendar.ts';
// WHY: calendar stamps n-button + n-icon internally — ensure they're defined in test env
import '../../button/button.ts';
import '../../../icons/icon.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('n-calendar');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

/** Create a calendar and navigate its store to a specific year/month (0-indexed). */
function createAt(year: number, month: number, attrs: Record<string, string> = {}): HTMLElement {
  const el = create(attrs);
  const store = (el as any).store;
  store.focusedYear.value = year;
  store.focusedMonth.value = month;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-calendar element', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-calendar')).toBeDefined();
  });

  it('renders internal structure on setup', () => {
    const el = create();
    expect(el.querySelector('.cal-header')).not.toBeNull();
    expect(el.querySelector('n-button[data-role="prev"]')).not.toBeNull();
    expect(el.querySelector('n-button[data-role="next"]')).not.toBeNull();
    expect(el.querySelector('n-button[data-role="title"]')).not.toBeNull();
    expect(el.querySelector('.cal-weekdays')).not.toBeNull();
    expect(el.querySelector('.cal-grid')).not.toBeNull();
  });

  it('renders 42 day cells in day view', () => {
    const el = create();
    const cells = el.querySelectorAll('.cal-grid n-button');
    // A 6-week grid always has 42 cells
    expect(cells.length).toBe(42);
  });

  it('renders weekday headers', () => {
    const el = create();
    const weekdays = el.querySelectorAll('.cal-weekday');
    expect(weekdays.length).toBe(7);
    expect(weekdays[0].textContent).toBe('Su');
    expect(weekdays[6].textContent).toBe('Sa');
  });

  it('value property reflects date', () => {
    const el = create({ value: '2025-06-15' });
    expect((el as any).value).toBe('2025-06-15');
  });

  it('value property is null by default', () => {
    const el = create();
    expect((el as any).value).toBeNull();
  });

  it('value setter updates attribute', () => {
    const el = create();
    (el as any).value = '2025-01-10';
    expect(el.getAttribute('value')).toBe('2025-01-10');
  });

  it('value setter clears attribute when set to null', () => {
    const el = create({ value: '2025-01-10' });
    (el as any).value = null;
    expect(el.hasAttribute('value')).toBe(false);
  });

  it('renders title for focused month', () => {
    // Navigate to a known month via the store
    const el = createAt(2025, 2); // March 2025
    const title = el.querySelector('n-button[data-role="title"]') as HTMLElement;
    expect(title.textContent).toBe('March 2025');
  });

  it('navigates to previous month', () => {
    const el = createAt(2025, 2); // March 2025
    const prev = el.querySelector('n-button[data-role="prev"]') as HTMLElement;
    prev.click();
    const title = el.querySelector('n-button[data-role="title"]') as HTMLElement;
    expect(title.textContent).toBe('February 2025');
  });

  it('navigates to next month', () => {
    const el = createAt(2025, 2); // March 2025
    const next = el.querySelector('n-button[data-role="next"]') as HTMLElement;
    next.click();
    const title = el.querySelector('n-button[data-role="title"]') as HTMLElement;
    expect(title.textContent).toBe('April 2025');
  });

  it('marks the selected date with data-selected', () => {
    // Navigate to March 2025 and set value to a date in that month
    const el = createAt(2025, 2, { value: '2025-03-15' });
    const selected = el.querySelector('[data-selected]') as HTMLElement;
    expect(selected).not.toBeNull();
    expect(selected.dataset.date).toBe('2025-03-15');
    expect(selected.textContent).toBe('15');
  });

  it('marks outside-month days with data-outside', () => {
    // March 2025 starts on Saturday, so there will be leading days from Feb
    const el = createAt(2025, 2);
    const outsideDays = el.querySelectorAll('[data-outside]');
    expect(outsideDays.length).toBeGreaterThan(0);
  });
});

describe('n-calendar disabled state', () => {
  it('disabled property toggles attribute', () => {
    const el = create();
    expect((el as any).disabled).toBe(false);

    (el as any).disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(el.getAttribute('aria-disabled')).toBe('true');

    (el as any).disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('disabled attribute sets aria-disabled', () => {
    const el = create({ disabled: '' });
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });

  it('disabled sets tabindex to -1', () => {
    const el = create();
    expect(el.getAttribute('tabindex')).toBe('0');

    (el as any).disabled = true;
    expect(el.getAttribute('tabindex')).toBe('-1');

    (el as any).disabled = false;
    expect(el.getAttribute('tabindex')).toBe('0');
  });
});

describe('n-calendar ARIA', () => {
  it('has tabindex=0 by default', () => {
    const el = create();
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('grid has role="grid"', () => {
    const el = create();
    const grid = el.querySelector('.cal-grid');
    expect(grid?.getAttribute('role')).toBe('grid');
  });

  it('prev button has aria-label', () => {
    const el = create();
    const prev = el.querySelector('n-button[data-role="prev"]');
    expect(prev?.getAttribute('aria-label')).toBe('Previous');
  });

  it('next button has aria-label', () => {
    const el = create();
    const next = el.querySelector('n-button[data-role="next"]');
    expect(next?.getAttribute('aria-label')).toBe('Next');
  });
});

describe('n-calendar date selection', () => {
  it('dispatches native:change on date click', () => {
    const el = createAt(2025, 2); // March 2025
    const handler = vi.fn();
    el.addEventListener('native:change', handler);

    // Click a specific in-month day cell
    const cell = el.querySelector('[data-date="2025-03-20"]') as HTMLElement;
    expect(cell).not.toBeNull();
    cell.click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('2025-03-20');
  });

  it('updates value after date click', () => {
    const el = createAt(2025, 2); // March 2025

    const cell = el.querySelector('[data-date="2025-03-20"]') as HTMLElement;
    cell.click();

    expect((el as any).value).toBe('2025-03-20');
    expect(el.getAttribute('value')).toBe('2025-03-20');
  });

  it('does not dispatch native:change when clicking a disabled cell', () => {
    // Navigate to March 2025 with min constraint
    const el = createAt(2025, 2, { min: '2025-03-10' });
    const handler = vi.fn();
    el.addEventListener('native:change', handler);

    // Find a disabled cell (before min date)
    const disabledCell = el.querySelector('.cal-grid n-button[disabled]') as HTMLElement;
    if (disabledCell) {
      disabledCell.click();
      expect(handler).not.toHaveBeenCalled();
    }
  });
});

describe('n-calendar min/max constraints', () => {
  it('disables dates before min', () => {
    const el = createAt(2025, 2, { min: '2025-03-10' });
    const disabledCells = el.querySelectorAll('.cal-grid n-button[disabled]');
    // Days before March 10 (and outside-month days) should be disabled
    expect(disabledCells.length).toBeGreaterThan(0);

    // March 9 should be disabled
    const mar9 = el.querySelector('[data-date="2025-03-09"]') as HTMLElement;
    expect(mar9).not.toBeNull();
    expect(mar9.hasAttribute('disabled')).toBe(true);
  });

  it('disables dates after max', () => {
    const el = createAt(2025, 2, { max: '2025-03-20' });

    // March 21 should be disabled
    const mar21 = el.querySelector('[data-date="2025-03-21"]') as HTMLElement;
    expect(mar21).not.toBeNull();
    expect(mar21.hasAttribute('disabled')).toBe(true);

    // March 20 should NOT be disabled
    const mar20 = el.querySelector('[data-date="2025-03-20"]') as HTMLElement;
    expect(mar20).not.toBeNull();
    expect(mar20.hasAttribute('disabled')).toBe(false);
  });
});

describe('n-calendar view navigation', () => {
  it('clicking title switches to month view', () => {
    const el = create();
    const title = el.querySelector('n-button[data-role="title"]') as HTMLElement;
    title.click();

    // Should now show 12 month cells
    const cells = el.querySelectorAll('.cal-grid n-button');
    expect(cells.length).toBe(12);
    expect(el.getAttribute('view')).toBe('month');
  });

  it('clicking title twice switches to year view', () => {
    const el = create();
    const title = el.querySelector('n-button[data-role="title"]') as HTMLElement;
    title.click(); // day -> month
    title.click(); // month -> year

    expect(el.getAttribute('view')).toBe('year');
    const cells = el.querySelectorAll('.cal-grid n-button');
    // A decade view shows 12 cells (decade + 1 before + 1 after)
    expect(cells.length).toBe(12);
  });
});

describe('n-calendar teardown / re-initialization', () => {
  it('survives remove + re-append with child listeners intact', () => {
    // TEST-018: Child listeners (prev/next/title/grid click, grid pointermove)
    // are on stamped children removed via innerHTML replacement in #stamp().
    // The calendar re-stamps on setup(), so listeners are re-created.
    const el = createAt(2025, 2); // March 2025
    el.remove();
    document.body.appendChild(el);

    // Store should still work — navigate with prev button
    const prev = el.querySelector('n-button[data-role="prev"]') as HTMLElement;
    prev.click();
    const title = el.querySelector('n-button[data-role="title"]') as HTMLElement;
    expect(title.textContent).toBe('February 2025');
  });

  it('date click dispatches after re-initialization', () => {
    const el = createAt(2025, 2);
    el.remove();
    document.body.appendChild(el);

    const handler = vi.fn();
    el.addEventListener('native:change', handler);

    const cell = el.querySelector('[data-date="2025-03-20"]') as HTMLElement;
    cell.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('keydown listener does not double-fire after re-init', () => {
    const el = createAt(2025, 2);
    el.remove();
    document.body.appendChild(el);

    // Press Enter on a cell — should only dispatch one native:change
    const handler = vi.fn();
    el.addEventListener('native:change', handler);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('n-calendar form integration', () => {
  it('formResetCallback restores initial value', () => {
    const el = create({ value: '2025-03-15' });

    // Change value
    (el as any).value = '2025-03-20';
    expect((el as any).value).toBe('2025-03-20');

    // Reset form
    (el as any).formResetCallback();
    expect((el as any).value).toBe('2025-03-15');
    expect(el.getAttribute('value')).toBe('2025-03-15');
  });

  it('formResetCallback clears value when no initial value', () => {
    const el = create();
    (el as any).value = '2025-03-15';

    (el as any).formResetCallback();
    expect((el as any).value).toBeNull();
    expect(el.hasAttribute('value')).toBe(false);
  });
});
