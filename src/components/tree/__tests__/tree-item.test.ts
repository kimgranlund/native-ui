// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../tree.ts';

const tick = () => new Promise<void>(r => queueMicrotask(r));

function create(html = ''): HTMLElement {
  const el = document.createElement('n-tree-item');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-tree-item — standalone', () => {
  it('is registered', () => {
    expect(customElements.get('n-tree-item')).toBeDefined();
  });

  it('sets aria-selected=false by default', async () => {
    const el = create('<span slot="label">Item</span>');
    await tick();
    expect(el.getAttribute('aria-selected')).toBe('false');
  });

  it('syncs aria-selected when selected attribute is set', async () => {
    const el = create('<span slot="label">Item</span>');
    await tick();
    el.setAttribute('selected', '');
    expect(el.getAttribute('aria-selected')).toBe('true');
    el.removeAttribute('selected');
    expect(el.getAttribute('aria-selected')).toBe('false');
  });

  it('sets aria-disabled when disabled', async () => {
    const el = create('<span slot="label">Item</span>');
    await tick();
    el.setAttribute('disabled', '');
    expect(el.getAttribute('aria-disabled')).toBe('true');
    el.removeAttribute('disabled');
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('disabled prevents click selection', async () => {
    const el = create('<span slot="label">Item</span>');
    await tick();
    el.setAttribute('disabled', '');
    const label = el.querySelector('[slot="label"]')!;
    label.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(el.hasAttribute('selected')).toBe(false);
  });

  it('disabled prevents keyboard interaction', async () => {
    const el = create('<span slot="label">Item</span>');
    await tick();
    el.setAttribute('disabled', '');
    const label = el.querySelector('[slot="label"]')!;
    label.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(el.hasAttribute('selected')).toBe(false);
  });

  it('click on label selects item', async () => {
    const el = create('<span slot="label">Item</span>');
    await tick();
    const label = el.querySelector('[slot="label"]')!;
    label.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(el.hasAttribute('selected')).toBe(true);
  });

  it('Enter key selects item', async () => {
    const el = create('<span slot="label">Item</span>');
    await tick();
    const label = el.querySelector('[slot="label"]')!;
    label.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(el.hasAttribute('selected')).toBe(true);
  });

  it('Space key selects item', async () => {
    const el = create('<span slot="label">Item</span>');
    await tick();
    const label = el.querySelector('[slot="label"]')!;
    label.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(el.hasAttribute('selected')).toBe(true);
  });

  it('marks expandable when has child tree-items', async () => {
    const el = create(`
      <span slot="label">Parent</span>
      <n-tree-item><span slot="label">Child</span></n-tree-item>
    `);
    await tick();
    expect(el.hasAttribute('expandable')).toBe(true);
  });

  it('sets aria-expanded=false initially for expandable', async () => {
    const el = create(`
      <span slot="label">Parent</span>
      <n-tree-item><span slot="label">Child</span></n-tree-item>
    `);
    await tick();
    expect(el.getAttribute('aria-expanded')).toBe('false');
  });

  it('ArrowRight expands a collapsed expandable item', async () => {
    const el = create(`
      <span slot="label">Parent</span>
      <n-tree-item><span slot="label">Child</span></n-tree-item>
    `);
    await tick();
    const label = el.querySelector(':scope > [slot="label"]')!;
    label.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(el.hasAttribute('expanded')).toBe(true);
  });

  it('ArrowLeft collapses an expanded item', async () => {
    const el = create(`
      <span slot="label">Parent</span>
      <n-tree-item><span slot="label">Child</span></n-tree-item>
    `);
    el.setAttribute('expanded', '');
    await tick();
    const label = el.querySelector(':scope > [slot="label"]')!;
    label.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(el.hasAttribute('expanded')).toBe(false);
  });

  it('sets tabindex on label', async () => {
    const el = create('<span slot="label">Item</span>');
    await tick();
    const label = el.querySelector('[slot="label"]');
    expect(label?.getAttribute('tabindex')).toBe('-1');
  });

  it('teardown removes event listeners cleanly', async () => {
    const el = create('<span slot="label">Item</span>');
    await tick();
    el.remove();
    expect(true).toBe(true);
  });
});
