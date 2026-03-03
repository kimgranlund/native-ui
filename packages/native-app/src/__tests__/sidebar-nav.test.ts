// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../index.ts';

// ── Helpers ──

function createNav(opts: { items?: string[]; disabled?: boolean } = {}): HTMLElement {
  const el = document.createElement('n-sidebar-nav');
  for (const val of opts.items ?? ['a', 'b', 'c']) {
    const item = document.createElement('n-sidebar-nav-item');
    item.setAttribute('value', val);
    item.textContent = val.toUpperCase();
    el.appendChild(item);
  }
  if (opts.disabled) el.setAttribute('disabled', '');
  document.body.appendChild(el);
  return el;
}

function createGroupedNav(): HTMLElement {
  const el = document.createElement('n-sidebar-nav');

  const group = document.createElement('n-sidebar-group');
  const header = document.createElement('n-sidebar-group-header');
  header.textContent = 'Section';
  group.appendChild(header);

  const item1 = document.createElement('n-sidebar-nav-item');
  item1.setAttribute('value', 'x');
  item1.textContent = 'X';
  group.appendChild(item1);

  const item2 = document.createElement('n-sidebar-nav-item');
  item2.setAttribute('value', 'y');
  item2.textContent = 'Y';
  group.appendChild(item2);

  el.appendChild(group);
  document.body.appendChild(el);
  return el;
}

async function createCollapsedSidebar(): Promise<{ sidebar: HTMLElement; nav: HTMLElement; group: HTMLElement }> {
  const sidebar = document.createElement('native-app');
  sidebar.setAttribute('collapsed', '');
  const slot = document.createElement('div');
  slot.setAttribute('slot', 'sidebar');
  sidebar.appendChild(slot);

  const nav = document.createElement('n-sidebar-nav');
  const group = document.createElement('n-sidebar-group');
  const header = document.createElement('n-sidebar-group-header');
  header.textContent = 'Section';
  group.appendChild(header);

  const item1 = document.createElement('n-sidebar-nav-item');
  item1.setAttribute('value', 'a');
  item1.textContent = 'A';
  group.appendChild(item1);

  const item2 = document.createElement('n-sidebar-nav-item');
  item2.setAttribute('value', 'b');
  item2.textContent = 'B';
  group.appendChild(item2);

  nav.appendChild(group);
  slot.appendChild(nav);
  document.body.appendChild(sidebar);

  // WHY: Flush microtask so sidebar's deferred #syncFlyoutMode() runs
  await Promise.resolve();

  return { sidebar, nav, group };
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ── Registration ──

describe('n-sidebar-nav registration', () => {
  it('all four elements are registered', () => {
    expect(customElements.get('n-sidebar-nav')).toBeDefined();
    expect(customElements.get('n-sidebar-nav-item')).toBeDefined();
    expect(customElements.get('n-sidebar-group')).toBeDefined();
    expect(customElements.get('n-sidebar-group-header')).toBeDefined();
  });
});

// ── n-sidebar-nav-item ──

describe('n-sidebar-nav-item', () => {
  it('value property reflects to attribute', () => {
    const nav = createNav();
    const item = nav.querySelector('n-sidebar-nav-item[value="a"]') as any;
    item.value = 'z';
    expect(item.getAttribute('value')).toBe('z');
  });

  it('label getter returns textContent when no label attribute', () => {
    const nav = createNav();
    const item = nav.querySelector('n-sidebar-nav-item[value="a"]') as any;
    expect(item.label).toBe('A');
  });

  it('label getter returns label attribute when set', () => {
    const nav = createNav();
    const item = nav.querySelector('n-sidebar-nav-item[value="a"]') as any;
    item.label = 'Custom';
    expect(item.label).toBe('Custom');
    expect(item.getAttribute('label')).toBe('Custom');
  });

  it('click dispatches native:select event', () => {
    const nav = createNav();
    const handler = vi.fn();
    nav.addEventListener('native:select', handler);

    const item = nav.querySelector('n-sidebar-nav-item[value="b"]') as HTMLElement;
    item.click();

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.value).toBe('b');
    expect(detail.label).toBe('B');
  });

  it('disabled item does not dispatch native:select', () => {
    const nav = createNav();
    const handler = vi.fn();
    nav.addEventListener('native:select', handler);

    const item = nav.querySelector('n-sidebar-nav-item[value="a"]') as any;
    item.disabled = true;
    item.click();

    expect(handler).not.toHaveBeenCalled();
  });

  it('disabled property sets aria-disabled attribute', () => {
    const nav = createNav();
    const item = nav.querySelector('n-sidebar-nav-item[value="a"]') as any;

    item.disabled = true;
    expect(item.getAttribute('aria-disabled')).toBe('true');

    item.disabled = false;
    expect(item.hasAttribute('aria-disabled')).toBe(false);
  });
});

// ── n-sidebar-nav selection ──

describe('n-sidebar-nav selection', () => {
  it('starts with null value', () => {
    const nav = createNav();
    expect((nav as any).value).toBeNull();
  });

  it('value updates on item click', () => {
    const nav = createNav();
    const item = nav.querySelector('n-sidebar-nav-item[value="b"]') as HTMLElement;
    item.click();
    expect((nav as any).value).toBe('b');
    // ARIA: selected item gets aria-current="page"
    expect(item.getAttribute('aria-current')).toBe('page');
    // ARIA: other items do not have aria-current
    const otherItem = nav.querySelector('n-sidebar-nav-item[value="a"]') as HTMLElement;
    expect(otherItem.hasAttribute('aria-current')).toBe(false);
  });

  it('dispatches native:change on selection', () => {
    const nav = createNav();
    const handler = vi.fn();
    nav.addEventListener('native:change', handler);

    const item = nav.querySelector('n-sidebar-nav-item[value="a"]') as HTMLElement;
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

// ── n-sidebar-nav disabled ──

describe('n-sidebar-nav disabled', () => {
  it('disabled property sets aria-disabled', () => {
    const nav = createNav();
    (nav as any).disabled = true;
    expect(nav.getAttribute('aria-disabled')).toBe('true');

    (nav as any).disabled = false;
    expect(nav.hasAttribute('aria-disabled')).toBe(false);
  });
});

// ── n-sidebar-group ──

describe('n-sidebar-group', () => {
  it('stamps details/summary inside group', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')!;
    expect(group.querySelector('details')).not.toBeNull();
    expect(group.querySelector('summary')).not.toBeNull();
  });

  it('moves header into summary', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')!;
    const summary = group.querySelector('summary')!;
    expect(summary.querySelector('n-sidebar-group-header')).not.toBeNull();
  });

  it('moves items into details', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')!;
    const details = group.querySelector('details')!;
    const items = details.querySelectorAll('n-sidebar-nav-item');
    expect(items.length).toBe(2);
  });

  it('defaults to closed (matches <details> pattern)', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')! as any;
    expect(group.open).toBe(false);
    expect(group.querySelector('details')!.open).toBe(false);
  });

  it('opens when [open] attribute is set', () => {
    const el = document.createElement('n-sidebar-nav');
    const group = document.createElement('n-sidebar-group');
    group.setAttribute('open', '');
    const header = document.createElement('n-sidebar-group-header');
    header.textContent = 'Section';
    group.appendChild(header);
    el.appendChild(group);
    document.body.appendChild(el);

    expect((group as any).open).toBe(true);
    expect(group.querySelector('details')!.open).toBe(true);
  });

  it('open property toggles details and attribute', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')! as any;

    group.open = false;
    expect(group.hasAttribute('open')).toBe(false);

    group.open = true;
    expect(group.hasAttribute('open')).toBe(true);
  });

  it('items inside groups are selectable via click', () => {
    const nav = createGroupedNav();
    const handler = vi.fn();
    nav.addEventListener('native:change', handler);

    const item = nav.querySelector('n-sidebar-nav-item[value="x"]') as HTMLElement;
    item.click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe('x');
    expect((nav as any).value).toBe('x');
    // ARIA: selected item in group gets aria-current="page"
    expect(item.getAttribute('aria-current')).toBe('page');
  });
});

// ── n-sidebar-group flyout public API ──

describe('n-sidebar-group flyout API', () => {
  it('stamps flyout n-listbox popover in setup', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')!;
    const flyout = group.querySelector('n-listbox.nav-group-flyout[popover]');
    expect(flyout).not.toBeNull();
  });

  it('flyout is empty by default', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')!;
    const flyout = group.querySelector('n-listbox.nav-group-flyout')!;
    expect(flyout.querySelectorAll('n-option').length).toBe(0);
  });

  it('flyoutOpen is false by default', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')! as any;
    expect(group.flyoutOpen).toBe(false);
  });

  it('openFlyout() stamps n-option items and sets flyoutOpen', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')! as any;
    const flyout = group.querySelector('n-listbox.nav-group-flyout')!;

    group.openFlyout();

    expect(group.flyoutOpen).toBe(true);
    expect(flyout.querySelectorAll('n-option').length).toBe(2);
    const options = flyout.querySelectorAll('n-option');
    expect(options[0].textContent).toBe('X');
    expect(options[1].textContent).toBe('Y');
  });

  it('closeFlyout() clears flyout and resets flyoutOpen', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')! as any;
    const flyout = group.querySelector('n-listbox.nav-group-flyout')!;

    group.openFlyout();
    expect(flyout.querySelectorAll('n-option').length).toBe(2);

    group.closeFlyout();
    expect(group.flyoutOpen).toBe(false);
    expect(flyout.querySelectorAll('n-option').length).toBe(0);
  });

  it('native:dismiss clears flyout', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')! as any;
    const flyout = group.querySelector('n-listbox.nav-group-flyout')!;

    group.openFlyout();
    expect(flyout.querySelectorAll('n-option').length).toBe(2);

    group.dispatchEvent(new CustomEvent('native:dismiss', { bubbles: true }));
    expect(flyout.querySelectorAll('n-option').length).toBe(0);
  });

  it('flyout option click dispatches native:select (bubbles to nav) and closes flyout', async () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')! as any;
    const flyout = group.querySelector('n-listbox.nav-group-flyout')!;
    const selectHandler = vi.fn();
    const changeHandler = vi.fn();
    nav.addEventListener('native:select', selectHandler);
    nav.addEventListener('native:change', changeHandler);

    group.openFlyout();

    const opt = flyout.querySelector('n-option') as HTMLElement;
    opt.click();

    expect(selectHandler).toHaveBeenCalled();
    expect(selectHandler.mock.calls[0][0].detail.value).toBe('x');

    expect(changeHandler).toHaveBeenCalled();
    expect(changeHandler.mock.calls[0][0].detail.value).toBe('x');

    // Flyout closes after selection (deferred to microtask)
    await Promise.resolve();
    expect(flyout.querySelectorAll('n-option').length).toBe(0);
  });
});

// ── n-sidebar-group flyout (sidebar coordinator) ──

describe('n-sidebar-group flyout (sidebar coordinator)', () => {
  it('summary click in collapsed mode stamps n-option items into flyout', async () => {
    const { group } = await createCollapsedSidebar();
    const summary = group.querySelector('summary')!;
    const details = group.querySelector('details')!;
    const flyout = group.querySelector('n-listbox.nav-group-flyout')!;

    // Before click: source items in details, flyout empty
    expect(details.querySelectorAll('n-sidebar-nav-item').length).toBe(2);
    expect(flyout.querySelectorAll('n-option').length).toBe(0);

    summary.click();

    // After click: n-option items stamped in flyout, originals untouched
    expect(details.querySelectorAll('n-sidebar-nav-item').length).toBe(2);
    expect(flyout.querySelectorAll('n-option').length).toBe(2);

    // Flyout options mirror source text
    const options = flyout.querySelectorAll('n-option');
    expect(options[0].textContent).toBe('A');
    expect(options[1].textContent).toBe('B');
  });

  it('summary click in expanded mode does not open flyout', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')!;
    const flyout = group.querySelector('n-listbox.nav-group-flyout')!;

    const summary = group.querySelector('summary')!;
    summary.click();

    // No sidebar coordinator → summary click is native details toggle
    expect(flyout.querySelectorAll('n-option').length).toBe(0);
  });

  it('opening a flyout closes sibling flyouts', async () => {
    // Two groups in the same collapsed sidebar
    const sidebar = document.createElement('native-app');
    sidebar.setAttribute('collapsed', '');
    const slot = document.createElement('div');
    slot.setAttribute('slot', 'sidebar');
    sidebar.appendChild(slot);

    const nav = document.createElement('n-sidebar-nav');

    const group1 = document.createElement('n-sidebar-group');
    const h1 = document.createElement('n-sidebar-group-header');
    h1.textContent = 'G1';
    group1.appendChild(h1);
    const i1 = document.createElement('n-sidebar-nav-item');
    i1.setAttribute('value', 'a');
    i1.textContent = 'A';
    group1.appendChild(i1);

    const group2 = document.createElement('n-sidebar-group');
    const h2 = document.createElement('n-sidebar-group-header');
    h2.textContent = 'G2';
    group2.appendChild(h2);
    const i2 = document.createElement('n-sidebar-nav-item');
    i2.setAttribute('value', 'b');
    i2.textContent = 'B';
    group2.appendChild(i2);

    nav.appendChild(group1);
    nav.appendChild(group2);
    slot.appendChild(nav);
    document.body.appendChild(sidebar);

    // WHY: Flush microtask so sidebar's deferred #syncFlyoutMode() runs
    await Promise.resolve();

    const flyout1 = group1.querySelector('n-listbox.nav-group-flyout')!;
    const flyout2 = group2.querySelector('n-listbox.nav-group-flyout')!;

    // Open group1's flyout
    group1.querySelector('summary')!.click();
    expect(flyout1.querySelectorAll('n-option').length).toBe(1);

    // Open group2's flyout — group1's should close
    group2.querySelector('summary')!.click();
    expect(flyout2.querySelectorAll('n-option').length).toBe(1);
    expect(flyout1.querySelectorAll('n-option').length).toBe(0);
  });

  it('uncollapsing closes any open flyout', async () => {
    const { sidebar, group } = await createCollapsedSidebar();
    const flyout = group.querySelector('n-listbox.nav-group-flyout')!;

    // Open flyout in collapsed mode
    group.querySelector('summary')!.click();
    expect(flyout.querySelectorAll('n-option').length).toBe(2);

    // Uncollapse
    sidebar.removeAttribute('collapsed');

    // Flyout should be closed
    expect(flyout.querySelectorAll('n-option').length).toBe(0);
  });

  it('flyout option click dispatches native:select (bubbles to nav) and closes flyout', async () => {
    const { group, nav } = await createCollapsedSidebar();
    const summary = group.querySelector('summary')!;
    const flyout = group.querySelector('n-listbox.nav-group-flyout')!;
    const selectHandler = vi.fn();
    const changeHandler = vi.fn();
    nav.addEventListener('native:select', selectHandler);
    nav.addEventListener('native:change', changeHandler);

    // Open flyout
    summary.click();

    // Click flyout option
    const opt = flyout.querySelector('n-option') as HTMLElement;
    opt.click();

    // native:select from option bubbles to nav
    expect(selectHandler).toHaveBeenCalled();
    expect(selectHandler.mock.calls[0][0].detail.value).toBe('a');

    // native:change fires on nav (from nav's ListNavigateController)
    expect(changeHandler).toHaveBeenCalled();
    expect(changeHandler.mock.calls[0][0].detail.value).toBe('a');

    // Flyout closes after selection (deferred to microtask)
    await Promise.resolve();
    expect(flyout.querySelectorAll('n-option').length).toBe(0);
  });
});

// ── n-sidebar-group-header ──

describe('n-sidebar-group-header', () => {
  it('sets aria-labelledby on parent group', () => {
    const nav = createGroupedNav();
    const group = nav.querySelector('n-sidebar-group')!;
    const header = nav.querySelector('n-sidebar-group-header')!;

    expect(header.id).toBeTruthy();
    expect(group.getAttribute('aria-labelledby')).toBe(header.id);
  });

  it('preserves existing id', () => {
    const el = document.createElement('n-sidebar-nav');
    const group = document.createElement('n-sidebar-group');
    const header = document.createElement('n-sidebar-group-header');
    header.id = 'my-header';
    header.textContent = 'Test';
    group.appendChild(header);
    el.appendChild(group);
    document.body.appendChild(el);

    expect(header.id).toBe('my-header');
    expect(group.getAttribute('aria-labelledby')).toBe('my-header');
  });
});
