// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../index.ts';

function create(): HTMLElement {
  const el = document.createElement('n-sidebar');
  const aside = document.createElement('aside');
  aside.setAttribute('slot', 'sidebar');
  el.appendChild(aside);
  const main = document.createElement('main');
  el.appendChild(main);
  document.body.appendChild(el);
  return el;
}

/** Create a collapsed sidebar with nav groups for flyout coordinator tests.
 *  WHY: async — sidebar defers #syncFlyoutMode to a microtask so child
 *  nav-group setup() completes before flyout listeners are attached. */
async function createCollapsedWithGroups(): Promise<{
  sidebar: HTMLElement;
  group1: HTMLElement;
  group2: HTMLElement;
}> {
  const sidebar = document.createElement('n-sidebar');
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

  return { sidebar, group1, group2 };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-sidebar', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-sidebar')).toBeDefined();
  });

  it('sets data-ready on setup', () => {
    const el = create();
    expect(el.dataset.ready).toBe('');
  });

  it('survives setup without resize handle', () => {
    const el = create();
    // No .layout-resize-handle present — should not throw
    expect(el.dataset.ready).toBe('');
  });
});

describe('n-sidebar-item', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-sidebar-item')).toBeDefined();
  });

  it('passive mode — no listbox child means no popover wired', () => {
    const el = document.createElement('n-sidebar-item');
    el.innerHTML = '<n-button>Click</n-button>';
    document.body.appendChild(el);
    // Should not throw — passive wrapper
    expect(el.querySelector('n-button')).toBeTruthy();
  });

  it('active mode — listbox child wires popover', () => {
    const el = document.createElement('n-sidebar-item');
    el.innerHTML =
      '<span>Label</span>' +
      '<n-listbox popover="manual"><n-option value="a">A</n-option></n-listbox>';
    document.body.appendChild(el);
    const listbox = el.querySelector('n-listbox');
    expect(listbox).toBeTruthy();
    // PopoverController wires anchor-name style on the element
    expect(el.style.anchorName || el.getAttribute('style')).toBeTruthy();
  });
});

// ── Flyout coordinator ──

describe('n-sidebar flyout coordinator', () => {
  it('collapsed sidebar intercepts summary click to open flyout', async () => {
    const { group1 } = await createCollapsedWithGroups();
    const flyout = group1.querySelector('n-listbox.nav-group-flyout')!;

    group1.querySelector('summary')!.click();
    expect(flyout.querySelectorAll('n-option').length).toBe(1);
  });

  it('opening one group closes the other (mutual exclusion)', async () => {
    const { group1, group2 } = await createCollapsedWithGroups();
    const flyout1 = group1.querySelector('n-listbox.nav-group-flyout')!;
    const flyout2 = group2.querySelector('n-listbox.nav-group-flyout')!;

    group1.querySelector('summary')!.click();
    expect(flyout1.querySelectorAll('n-option').length).toBe(1);

    group2.querySelector('summary')!.click();
    expect(flyout2.querySelectorAll('n-option').length).toBe(1);
    expect(flyout1.querySelectorAll('n-option').length).toBe(0);
  });

  it('clicking same summary again closes its flyout', async () => {
    const { group1 } = await createCollapsedWithGroups();
    const flyout = group1.querySelector('n-listbox.nav-group-flyout')!;

    group1.querySelector('summary')!.click();
    expect(flyout.querySelectorAll('n-option').length).toBe(1);

    group1.querySelector('summary')!.click();
    expect(flyout.querySelectorAll('n-option').length).toBe(0);
  });

  it('uncollapsing closes any open flyout', async () => {
    const { sidebar, group1 } = await createCollapsedWithGroups();
    const flyout = group1.querySelector('n-listbox.nav-group-flyout')!;

    group1.querySelector('summary')!.click();
    expect(flyout.querySelectorAll('n-option').length).toBe(1);

    sidebar.removeAttribute('collapsed');
    expect(flyout.querySelectorAll('n-option').length).toBe(0);
  });
});
