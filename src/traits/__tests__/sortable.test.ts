// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { UIElement } from '../../core/ui-element.ts';
import { SortController } from '../sort-controller.ts';
import { define } from '../../core/define.ts';

class SortTestEl extends UIElement {
  disabled = false;
  #ctrl: SortController | null = null;
  #initialSelector = '';
  #initialDisabled = false;

  setup() {
    super.setup();
    this.#ctrl = new SortController(this, {
      selector: this.#initialSelector,
      disabled: this.#initialDisabled,
    });
  }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }

  get sortableSelector(): string { return this.#ctrl?.selector ?? this.#initialSelector; }
  set sortableSelector(val: string) {
    this.#initialSelector = val;
    if (this.#ctrl) this.#ctrl.selector = val;
  }

  get sortableDisabled(): boolean { return this.#ctrl?.disabled ?? this.#initialDisabled; }
  set sortableDisabled(val: boolean) {
    this.#initialDisabled = val;
    if (this.#ctrl) this.#ctrl.disabled = val;
  }

  get sortColumn() { return this.#ctrl?.sortColumn ?? null; }
  get sortDirection() { return this.#ctrl?.sortDirection ?? 'none'; }
}

if (!customElements.get('sort-test')) {
  define('sort-test', SortTestEl);
}

function create(columns: string[] = ['Name', 'Age', 'Email']): SortTestEl {
  const el = document.createElement('sort-test') as SortTestEl;
  el.sortableSelector = '.header';
  for (const col of columns) {
    const header = document.createElement('div');
    header.className = 'header';
    header.textContent = col;
    el.appendChild(header);
  }
  document.body.appendChild(el);
  return el;
}

function headers(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('.header')];
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Sortable', () => {
  it('defaults to no active sort', () => {
    const el = create();
    expect(el.sortColumn).toBeNull();
    expect(el.sortDirection).toBe('none');
  });

  it('clicking a header sets sort to asc', () => {
    const el = create();
    headers(el)[0].click();
    expect(el.sortColumn).toBe('Name');
    expect(el.sortDirection).toBe('asc');
  });

  it('dispatches ui-sort event on click', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-sort', handler);
    headers(el)[0].click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.column).toBe('Name');
    expect(handler.mock.calls[0][0].detail.direction).toBe('asc');
  });

  it('cycles asc → desc → none on same column', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-sort', handler);

    headers(el)[0].click(); // asc
    expect(el.sortDirection).toBe('asc');

    headers(el)[0].click(); // desc
    expect(el.sortDirection).toBe('desc');

    headers(el)[0].click(); // none
    expect(el.sortDirection).toBe('none');

    headers(el)[0].click(); // asc again
    expect(el.sortDirection).toBe('asc');

    expect(handler).toHaveBeenCalledTimes(4);
  });

  it('switching columns resets to asc', () => {
    const el = create();
    headers(el)[0].click(); // Name asc
    headers(el)[0].click(); // Name desc
    headers(el)[1].click(); // Age asc (new column)
    expect(el.sortColumn).toBe('Age');
    expect(el.sortDirection).toBe('asc');
  });

  it('sets aria-sort on active header and removes from others', () => {
    const el = create();
    headers(el)[0].click(); // Name asc
    expect(headers(el)[0].getAttribute('aria-sort')).toBe('ascending');
    expect(headers(el)[1].hasAttribute('aria-sort')).toBe(false);

    headers(el)[0].click(); // Name desc
    expect(headers(el)[0].getAttribute('aria-sort')).toBe('descending');

    headers(el)[0].click(); // Name none
    expect(headers(el)[0].hasAttribute('aria-sort')).toBe(false);
  });

  it('uses data-column attribute when present', () => {
    const el = document.createElement('sort-test') as SortTestEl;
    el.sortableSelector = '.header';
    const header = document.createElement('div');
    header.className = 'header';
    header.dataset.column = 'user_name';
    header.textContent = 'User Name';
    el.appendChild(header);
    document.body.appendChild(el);

    header.click();
    expect(el.sortColumn).toBe('user_name');
  });

  it('does nothing when sortableDisabled', () => {
    const el = create();
    el.sortableDisabled = true;
    const handler = vi.fn();
    el.addEventListener('ui-sort', handler);
    headers(el)[0].click();
    expect(handler).not.toHaveBeenCalled();
    expect(el.sortColumn).toBeNull();
  });

  it('does nothing with empty sortableSelector', () => {
    const el = document.createElement('sort-test') as SortTestEl;
    el.sortableSelector = '';
    document.body.appendChild(el);
    // setup() should not throw
    expect(el.sortColumn).toBeNull();
  });

  it('teardown removes click handlers', () => {
    const el = create();
    el.teardown();
    const handler = vi.fn();
    el.addEventListener('ui-sort', handler);
    headers(el)[0].click();
    expect(handler).not.toHaveBeenCalled();
  });
});
