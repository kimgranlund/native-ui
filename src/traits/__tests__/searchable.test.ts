// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { UIElement } from '../../core/ui-element.ts';
import { SearchController } from '../search-controller.ts';
import { define } from '../../core/define.ts';

// ── Trait tests ──

class SearchTestEl extends UIElement {
  disabled = false;
  #ctrl: SearchController | null = null;

  _pendingSelector = '';

  get searchableSelector(): string { return this.#ctrl?.selector ?? this._pendingSelector; }
  set searchableSelector(v: string) { if (this.#ctrl) this.#ctrl.selector = v; else this._pendingSelector = v; }

  get searchableQuery(): string { return this.#ctrl?.query ?? ''; }
  set searchableQuery(v: string) { this.#ctrl?.filter(v); }

  get searchableTextField(): string { return this.#ctrl?.textField ?? 'textContent'; }
  set searchableTextField(v: string) { if (this.#ctrl) this.#ctrl.textField = v; }

  get searchableDisabled(): boolean { return this.#ctrl?.disabled ?? false; }
  set searchableDisabled(v: boolean) { if (this.#ctrl) this.#ctrl.disabled = v; }

  setup() {
    super.setup();
    this.#ctrl = new SearchController(this, { selector: this._pendingSelector || '.item' });
  }

  teardown() {
    this.#ctrl?.destroy();
    this.#ctrl = null;
    super.teardown();
  }
}

if (!customElements.get('search-test')) {
  define('search-test', SearchTestEl);
}

function create(texts = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']): SearchTestEl {
  const el = document.createElement('search-test') as SearchTestEl;
  el.searchableSelector = '.item';
  for (const text of texts) {
    const item = document.createElement('div');
    item.className = 'item';
    item.textContent = text;
    el.appendChild(item);
  }
  document.body.appendChild(el);
  return el;
}

function items(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('.item')];
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Searchable', () => {
  it('defaults searchableQuery to empty string', () => {
    const el = create();
    expect(el.searchableQuery).toBe('');
  });

  it('defaults searchableTextField to textContent', () => {
    const el = create();
    expect(el.searchableTextField).toBe('textContent');
  });

  it('filters items by query', () => {
    const el = create();
    el.searchableQuery = 'an';
    // "Banana" and "Elderberry" don't match "an"? No — "Banana" has "an", so match. Let me check.
    // Apple: no, Banana: yes (ban), Cherry: no, Date: no, Elderberry: no
    // Actually lowercase: "banana" includes "an" → yes
    const matched = items(el).filter(i => i.hasAttribute('search-match'));
    const hidden = items(el).filter(i => i.hasAttribute('search-hidden'));
    expect(matched.length).toBe(1); // only Banana
    expect(hidden.length).toBe(4);
  });

  it('dispatches ui-search event', () => {
    const el = create();
    const handler = vi.fn();
    el.addEventListener('ui-search', handler);
    el.searchableQuery = 'berry';
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.query).toBe('berry');
    expect(handler.mock.calls[0][0].detail.matchCount).toBe(1); // Elderberry
    expect(handler.mock.calls[0][0].detail.total).toBe(5);
  });

  it('shows all items when query is empty', () => {
    const el = create();
    el.searchableQuery = 'apple';
    el.searchableQuery = '';
    const hidden = items(el).filter(i => i.hasAttribute('search-hidden'));
    expect(hidden).toHaveLength(0);
  });

  it('search is case-insensitive', () => {
    const el = create();
    el.searchableQuery = 'APPLE';
    const matched = items(el).filter(i => i.hasAttribute('search-match'));
    expect(matched).toHaveLength(1);
    expect(matched[0].textContent).toBe('Apple');
  });

  it('does nothing when searchableDisabled', () => {
    const el = create();
    el.searchableDisabled = true;
    el.searchableQuery = 'apple';
    // When disabled, filter shows all
    const hidden = items(el).filter(i => i.hasAttribute('search-hidden'));
    expect(hidden).toHaveLength(0);
  });

  it('static highlight wraps matches in <mark>', () => {
    // Access static method via the controller
    const result = SearchController.highlight('Hello World', 'World');
    expect(result).toBe('Hello <mark>World</mark>');
  });

  it('teardown clears search state', () => {
    const el = create();
    el.searchableQuery = 'apple';
    el.teardown();
    // After teardown, attributes should be cleared
    const hidden = items(el).filter(i => i.hasAttribute('search-hidden'));
    const matched = items(el).filter(i => i.hasAttribute('search-match'));
    expect(hidden).toHaveLength(0);
    expect(matched).toHaveLength(0);
  });
});

// ── SearchController standalone tests ──

function createHost(texts = ['Apple', 'Banana', 'Cherry']): HTMLElement {
  const el = document.createElement('div');
  for (const text of texts) {
    const item = document.createElement('div');
    item.className = 'item';
    item.textContent = text;
    el.appendChild(item);
  }
  document.body.appendChild(el);
  return el;
}

describe('SearchController', () => {
  it('filter returns matches and hidden', () => {
    const host = createHost();
    const ctrl = new SearchController(host, { selector: '.item' });
    const result = ctrl.filter('an');
    expect(result.matches).toHaveLength(1); // Banana
    expect(result.hidden).toHaveLength(2);
    expect(result.total).toBe(3);
    ctrl.destroy();
  });

  it('filter sets search-match and search-hidden attributes', () => {
    const host = createHost();
    const ctrl = new SearchController(host, { selector: '.item' });
    ctrl.filter('cherry');
    const all = items(host);
    expect(all[0].hasAttribute('search-hidden')).toBe(true);
    expect(all[2].hasAttribute('search-match')).toBe(true);
    ctrl.destroy();
  });

  it('clear removes all search attributes', () => {
    const host = createHost();
    const ctrl = new SearchController(host, { selector: '.item' });
    ctrl.filter('apple');
    ctrl.clear();
    for (const item of items(host)) {
      expect(item.hasAttribute('search-hidden')).toBe(false);
      expect(item.hasAttribute('search-match')).toBe(false);
    }
    expect(ctrl.query).toBe('');
    ctrl.destroy();
  });

  it('uses custom textField attribute', () => {
    const host = document.createElement('div');
    const item = document.createElement('div');
    item.className = 'item';
    item.setAttribute('data-label', 'Custom Label');
    item.textContent = 'Visible Text';
    host.appendChild(item);
    document.body.appendChild(host);

    const ctrl = new SearchController(host, { selector: '.item', textField: 'data-label' });
    ctrl.filter('custom');
    expect(item.hasAttribute('search-match')).toBe(true);
    ctrl.filter('visible');
    // "Visible" is in textContent but not in data-label
    expect(item.hasAttribute('search-hidden')).toBe(true);
    ctrl.destroy();
  });

  it('highlight escapes regex special characters', () => {
    const result = SearchController.highlight('price: $10.00', '$10');
    expect(result).toBe('price: <mark>$10</mark>.00');
  });

  it('highlight returns text unchanged with empty query', () => {
    const result = SearchController.highlight('Hello', '');
    expect(result).toBe('Hello');
  });

  it('dispatches ui-search event on filter', () => {
    const host = createHost();
    const ctrl = new SearchController(host, { selector: '.item' });
    const handler = vi.fn();
    host.addEventListener('ui-search', handler);
    ctrl.filter('ban');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.query).toBe('ban');
    ctrl.destroy();
  });

  it('respects disabled — shows all items', () => {
    const host = createHost();
    const ctrl = new SearchController(host, { selector: '.item', disabled: true });
    ctrl.filter('zzz');
    const hidden = items(host).filter(i => i.hasAttribute('search-hidden'));
    expect(hidden).toHaveLength(0);
    ctrl.destroy();
  });
});
