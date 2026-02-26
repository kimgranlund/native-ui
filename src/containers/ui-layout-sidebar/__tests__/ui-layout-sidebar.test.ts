// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../ui-layout-sidebar.ts';

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

describe('ui-layout-sidebar-trigger', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-layout-sidebar-trigger')).toBeDefined();
  });
});
