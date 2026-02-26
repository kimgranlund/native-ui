// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-nav.ts';

// ── Helpers ──

function createNav(opts: { items?: string[]; disabled?: boolean } = {}): HTMLElement {
  const el = document.createElement('ui-nav');
  for (const val of opts.items ?? ['a', 'b', 'c']) {
    const item = document.createElement('ui-nav-item');
    item.setAttribute('value', val);
    item.textContent = val.toUpperCase();
    el.appendChild(item);
  }
  if (opts.disabled) el.setAttribute('disabled', '');
  document.body.appendChild(el);
  return el;
}

function createGroupedNav(): HTMLElement {
  const el = document.createElement('ui-nav');

  const group = document.createElement('ui-nav-group');
  const header = document.createElement('ui-nav-group-header');
  header.textContent = 'Section';
  group.appendChild(header);

  const item1 = document.createElement('ui-nav-item');
  item1.setAttribute('value', 'x');
  item1.textContent = 'X';
  group.appendChild(item1);

  const item2 = document.createElement('ui-nav-item');
  item2.setAttribute('value', 'y');
  item2.textContent = 'Y';
  group.appendChild(item2);

  el.appendChild(group);
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ── Registration ──

describe('ui-nav registration', () => {
  it('all four elements are registered', () => {
    expect(customElements.get('ui-nav')).toBeDefined();
    expect(customElements.get('ui-nav-item')).toBeDefined();
    expect(customElements.get('ui-nav-group')).toBeDefined();
    expect(customElements.get('ui-nav-group-header')).toBeDefined();
  });
});

// ── ui-nav-item ──

describe('ui-nav-item', () => {
  it('value property reflects to attribute', () => {
    const nav = createNav();
    const item = nav.querySelector('ui-nav-item[value="a"]') as any;
    item.value = 'z';
    expect(item.getAttribute('value')).toBe('z');
  });

  it('label getter returns textContent when no label attribute', () => {
    const nav = createNav();
    const item = nav.querySelector('ui-nav-item[value="a"]') as any;
    expect(item.label).toBe('A');
  });

  it('label getter returns label attribute when set', () => {
    const nav = createNav();
    const item = nav.querySelector('ui-nav-item[value="a"]') as any;
    item.label = 'Custom';
    expect(item.label).toBe('Custom');
    expect(item.getAttribute('label')).toBe('Custom');
  });

  it('click dispatches ui-select event', () => {
    const nav = createNav();
    const handler = vi.fn();
    nav.addEventListener('ui-select', handler);

    const item = nav.querySelector('ui-nav-item[value="b"]') as HTMLElement;
    item.click();

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.value).toBe('b');
    expect(detail.label).toBe('B');
  });

  it('disabled item does not dispatch ui-select', () => {
    const nav = createNav();
    const handler = vi.fn();
    nav.addEventListener('ui-select', handler);

    const item = nav.querySelector('ui-nav-item[value="a"]') as any;
    item.disabled = true;
    item.click();

    expect(handler).not.toHaveBeenCalled();
  });

  it('disabled property sets aria-disabled attribute', () => {
    const nav = createNav();
    const item = nav.querySelector('ui-nav-item[value="a"]') as any;

    item.disabled = true;
    expect(item.getAttribute('aria-disabled')).toBe('true');

    item.disabled = false;
    expect(item.hasAttribute('aria-disabled')).toBe(false);
  });
});

// ── ui-nav selection ──

describe('ui-nav selection', () => {
  it('starts with null value', () => {
    const nav = createNav();
    expect((nav as any).value).toBeNull();
  });

  it('value updates on item click', () => {
    const nav = createNav();
    const item = nav.querySelector('ui-nav-item[value="b"]') as HTMLElement;
    item.click();
    expect((nav as any).value).toBe('b');
    // ARIA: selected item gets aria-current="page"
    expect(item.getAttribute('aria-current')).toBe('page');
    // ARIA: other items do not have aria-current
    const otherItem = nav.querySelector('ui-nav-item[value="a"]') as HTMLElement;
    expect(otherItem.hasAttribute('aria-current')).toBe(false);
  });

  it('dispatches ui-change on selection', () => {
    const nav = createNav();
    const handler = vi.fn();
    nav.addEventListener('ui-change', handler);

    const item = nav.querySelector('ui-nav-item[value="a"]') as HTMLElement;
    item.click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('a');
  });

  it('value property setter reflects to attribute', () => {
    const nav = createNav();
    (nav as any).value = 'c';
    expect(nav.getAttribute('value')).toBe('c');
  });

  it('setting value to null removes attribute', () => {
    const nav = createNav();
    (nav as any).value = 'a';
    expect(nav.hasAttribute('value')).toBe(true);
    (nav as any).value = null;
    expect(nav.hasAttribute('value')).toBe(false);
  });
});

// ── ui-nav disabled ──

describe('ui-nav disabled', () => {
  it('disabled property sets aria-disabled', () => {
    const nav = createNav();
    (nav as any).disabled = true;
    expect(nav.getAttribute('aria-disabled')).toBe('true');

    (nav as any).disabled = false;
    expect(nav.hasAttribute('aria-disabled')).toBe(false);
  });
});

// ── ui-nav-group ──

describe('ui-nav-group', () => {
  it('stamps details/summary inside group', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('ui-nav-group')!;
    expect(group.querySelector('details')).not.toBeNull();
    expect(group.querySelector('summary')).not.toBeNull();
  });

  it('moves header into summary', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('ui-nav-group')!;
    const summary = group.querySelector('summary')!;
    expect(summary.querySelector('ui-nav-group-header')).not.toBeNull();
  });

  it('moves items into details', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('ui-nav-group')!;
    const details = group.querySelector('details')!;
    const items = details.querySelectorAll('ui-nav-item');
    expect(items.length).toBe(2);
  });

  it('defaults to open', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('ui-nav-group')! as any;
    expect(group.open).toBe(true);
    expect(group.querySelector('details')!.open).toBe(true);
  });

  it('open property toggles details and attribute', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('ui-nav-group')! as any;

    group.open = false;
    expect(group.hasAttribute('open')).toBe(false);

    group.open = true;
    expect(group.hasAttribute('open')).toBe(true);
  });

  it('items inside groups are selectable via click', () => {
    const nav = createGroupedNav();
    const handler = vi.fn();
    nav.addEventListener('ui-change', handler);

    const item = nav.querySelector('ui-nav-item[value="x"]') as HTMLElement;
    item.click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('x');
    expect((nav as any).value).toBe('x');
    // ARIA: selected item in group gets aria-current="page"
    expect(item.getAttribute('aria-current')).toBe('page');
  });
});

// ── ui-nav-group-header ──

describe('ui-nav-group-header', () => {
  it('sets aria-labelledby on parent group', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('ui-nav-group')!;
    const header = nav.querySelector('ui-nav-group-header')!;

    expect(header.id).toBeTruthy();
    expect(group.getAttribute('aria-labelledby')).toBe(header.id);
  });

  it('preserves existing id', () => {
    const el = document.createElement('ui-nav');
    const group = document.createElement('ui-nav-group');
    const header = document.createElement('ui-nav-group-header');
    header.id = 'my-header';
    header.textContent = 'Test';
    group.appendChild(header);
    el.appendChild(group);
    document.body.appendChild(el);

    expect(header.id).toBe('my-header');
    expect(group.getAttribute('aria-labelledby')).toBe('my-header');
  });
});
