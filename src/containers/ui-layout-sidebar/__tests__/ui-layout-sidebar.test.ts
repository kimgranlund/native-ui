// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../ui-layout-sidebar.ts';
import '../../../components/ui-nav/ui-nav.ts';

function create(): HTMLElement {
  const el = document.createElement('ui-layout-sidebar');
  const aside = document.createElement('aside');
  aside.setAttribute('slot', 'sidebar');
  el.appendChild(aside);
  const main = document.createElement('main');
  el.appendChild(main);
  document.body.appendChild(el);
  return el;
}

/** Create a collapsed sidebar with nav groups for flyout coordinator tests. */
function createCollapsedWithGroups(): {
  sidebar: HTMLElement;
  group1: HTMLElement;
  group2: HTMLElement;
} {
  const sidebar = document.createElement('ui-layout-sidebar');
  sidebar.setAttribute('collapsed', '');
  const slot = document.createElement('div');
  slot.setAttribute('slot', 'sidebar');
  sidebar.appendChild(slot);

  const nav = document.createElement('ui-nav');

  const group1 = document.createElement('ui-nav-group');
  const h1 = document.createElement('ui-nav-group-header');
  h1.textContent = 'G1';
  group1.appendChild(h1);
  const i1 = document.createElement('ui-nav-item');
  i1.setAttribute('value', 'a');
  i1.textContent = 'A';
  group1.appendChild(i1);

  const group2 = document.createElement('ui-nav-group');
  const h2 = document.createElement('ui-nav-group-header');
  h2.textContent = 'G2';
  group2.appendChild(h2);
  const i2 = document.createElement('ui-nav-item');
  i2.setAttribute('value', 'b');
  i2.textContent = 'B';
  group2.appendChild(i2);

  nav.appendChild(group1);
  nav.appendChild(group2);
  slot.appendChild(nav);
  document.body.appendChild(sidebar);

  return { sidebar, group1, group2 };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-layout-sidebar', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-layout-sidebar')).toBeDefined();
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

describe('ui-layout-sidebar-item', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-layout-sidebar-item')).toBeDefined();
  });

  it('passive mode — no listbox child means no popover wired', () => {
    const el = document.createElement('ui-layout-sidebar-item');
    el.innerHTML = '<ui-button>Click</ui-button>';
    document.body.appendChild(el);
    // Should not throw — passive wrapper
    expect(el.querySelector('ui-button')).toBeTruthy();
  });

  it('active mode — listbox child wires popover', () => {
    const el = document.createElement('ui-layout-sidebar-item');
    el.innerHTML =
      '<span>Label</span>' +
      '<ui-listbox popover="manual"><ui-option value="a">A</ui-option></ui-listbox>';
    document.body.appendChild(el);
    const listbox = el.querySelector('ui-listbox');
    expect(listbox).toBeTruthy();
    // PopoverController wires anchor-name style on the element
    expect(el.style.anchorName || el.getAttribute('style')).toBeTruthy();
  });
});

// ── Flyout coordinator ──

describe('ui-layout-sidebar flyout coordinator', () => {
  it('collapsed sidebar intercepts summary click to open flyout', () => {
    const { group1 } = createCollapsedWithGroups();
    const flyout = group1.querySelector('ui-listbox.nav-group-flyout')!;

    group1.querySelector('summary')!.click();
    expect(flyout.querySelectorAll('ui-option').length).toBe(1);
  });

  it('opening one group closes the other (mutual exclusion)', () => {
    const { group1, group2 } = createCollapsedWithGroups();
    const flyout1 = group1.querySelector('ui-listbox.nav-group-flyout')!;
    const flyout2 = group2.querySelector('ui-listbox.nav-group-flyout')!;

    group1.querySelector('summary')!.click();
    expect(flyout1.querySelectorAll('ui-option').length).toBe(1);

    group2.querySelector('summary')!.click();
    expect(flyout2.querySelectorAll('ui-option').length).toBe(1);
    expect(flyout1.querySelectorAll('ui-option').length).toBe(0);
  });

  it('clicking same summary again closes its flyout', () => {
    const { group1 } = createCollapsedWithGroups();
    const flyout = group1.querySelector('ui-listbox.nav-group-flyout')!;

    group1.querySelector('summary')!.click();
    expect(flyout.querySelectorAll('ui-option').length).toBe(1);

    group1.querySelector('summary')!.click();
    expect(flyout.querySelectorAll('ui-option').length).toBe(0);
  });

  it('uncollapsing closes any open flyout', () => {
    const { sidebar, group1 } = createCollapsedWithGroups();
    const flyout = group1.querySelector('ui-listbox.nav-group-flyout')!;

    group1.querySelector('summary')!.click();
    expect(flyout.querySelectorAll('ui-option').length).toBe(1);

    sidebar.removeAttribute('collapsed');
    expect(flyout.querySelectorAll('ui-option').length).toBe(0);
  });
});
