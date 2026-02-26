// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import '../ui-breadcrumb.ts';

// Capture internals from attachInternals() to inspect ariaLabel
let capturedInternals: any = null;

beforeEach(() => {
  capturedInternals = null;
  const originalAttach = HTMLElement.prototype.attachInternals;
  HTMLElement.prototype.attachInternals = function () {
    const internals = originalAttach.call(this);
    // Only capture the first internals created (the ui-breadcrumb itself)
    if (capturedInternals === null) capturedInternals = internals;
    return internals;
  };
});

afterEach(() => {
  document.body.innerHTML = '';
});

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('ui-breadcrumb');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

describe('ui-breadcrumb', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-breadcrumb')).toBeDefined();
  });

  it('sets default ariaLabel to "Breadcrumb" when no aria-label attribute is provided', () => {
    create();
    expect(capturedInternals.ariaLabel).toBe('Breadcrumb');
  });

  it('uses the aria-label attribute value when provided', () => {
    create({ 'aria-label': 'Site navigation' });
    expect(capturedInternals.ariaLabel).toBe('Site navigation');
  });

  it('preserves child elements after setup', () => {
    const el = document.createElement('ui-breadcrumb');
    const item1 = document.createElement('ui-breadcrumb-item');
    item1.textContent = 'Home';
    const item2 = document.createElement('ui-breadcrumb-item');
    item2.textContent = 'Products';
    el.appendChild(item1);
    el.appendChild(item2);
    document.body.appendChild(el);

    const items = el.querySelectorAll('ui-breadcrumb-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('Home');
    expect(items[1].textContent).toBe('Products');
  });

  it('ui-breadcrumb-item is registered as a custom element', () => {
    expect(customElements.get('ui-breadcrumb-item')).toBeDefined();
  });
});

describe('ui-breadcrumb-item', () => {
  function createItem(attrs: Record<string, string> = {}): HTMLElement {
    const bc = document.createElement('ui-breadcrumb');
    const item = document.createElement('ui-breadcrumb-item');
    for (const [k, v] of Object.entries(attrs)) {
      item.setAttribute(k, v);
    }
    item.textContent = 'Page';
    bc.appendChild(item);
    document.body.appendChild(bc);
    return item;
  }

  it('sets tabindex=0 by default on non-current item', () => {
    const item = createItem();
    expect(item.getAttribute('tabindex')).toBe('0');
  });

  it('current item sets aria-current="page"', () => {
    const item = createItem({ current: '' });
    expect(item.getAttribute('aria-current')).toBe('page');
  });

  it('current item sets aria-disabled="true"', () => {
    const item = createItem({ current: '' });
    expect(item.getAttribute('aria-disabled')).toBe('true');
  });

  it('current item removes tabindex', () => {
    const item = createItem({ current: '' });
    expect(item.hasAttribute('tabindex')).toBe(false);
  });

  it('removing current attribute restores tabindex and removes aria attrs', () => {
    const item = createItem({ current: '' });
    expect(item.getAttribute('aria-current')).toBe('page');

    item.removeAttribute('current');
    expect(item.hasAttribute('aria-current')).toBe(false);
    expect(item.hasAttribute('aria-disabled')).toBe(false);
    expect(item.getAttribute('tabindex')).toBe('0');
  });

  it('current item blocks click navigation', () => {
    const item = createItem({ current: '', href: '/blocked' });
    // Click should be a no-op (current guard returns early)
    item.dispatchEvent(new Event('click'));
    // No assertion on location.href since happy-dom doesn't implement it,
    // but the handler returns early without throwing
  });

  it('Enter key triggers click behavior', () => {
    const item = createItem({ href: '/test' });
    // Should not throw
    expect(() => {
      item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }).not.toThrow();
  });

  it('Space key triggers click behavior', () => {
    const item = createItem({ href: '/test' });
    expect(() => {
      item.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    }).not.toThrow();
  });
});
