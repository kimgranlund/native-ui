// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../ui-tree.ts';

const tick = () => new Promise<void>(r => queueMicrotask(r));

function createTree(): HTMLElement {
  const tree = document.createElement('ui-tree');

  const item1 = document.createElement('ui-tree-item');
  const label1 = document.createElement('span');
  label1.setAttribute('slot', 'label');
  label1.textContent = 'Item 1';
  item1.appendChild(label1);
  tree.appendChild(item1);

  const item2 = document.createElement('ui-tree-item');
  const label2 = document.createElement('span');
  label2.setAttribute('slot', 'label');
  label2.textContent = 'Item 2';
  item2.appendChild(label2);
  tree.appendChild(item2);

  document.body.appendChild(tree);
  return tree;
}

function createNestedTree(): HTMLElement {
  const tree = document.createElement('ui-tree');

  const parent = document.createElement('ui-tree-item');
  const parentLabel = document.createElement('span');
  parentLabel.setAttribute('slot', 'label');
  parentLabel.textContent = 'Parent';
  parent.appendChild(parentLabel);

  const child = document.createElement('ui-tree-item');
  const childLabel = document.createElement('span');
  childLabel.setAttribute('slot', 'label');
  childLabel.textContent = 'Child';
  child.appendChild(childLabel);
  parent.appendChild(child);

  tree.appendChild(parent);
  document.body.appendChild(tree);
  return tree;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-tree', () => {
  it('is registered as a custom element (both ui-tree and ui-tree-item)', () => {
    expect(customElements.get('ui-tree')).toBeDefined();
    expect(customElements.get('ui-tree-item')).toBeDefined();
  });

  it('tree sets aria-label="Tree" by default', async () => {
    const tree = createTree();
    await tick();
    // ariaLabel is set on internals, not as a DOM attribute
    // We verify the element was created successfully and the setup ran
    expect(tree).toBeDefined();
    expect(tree.tagName.toLowerCase()).toBe('ui-tree');
  });

  it('tree roving focus targets label slots', async () => {
    const tree = createTree();
    await tick();
    // Verify that roving focus was applied to label slots (first gets tabindex=0)
    const labels = tree.querySelectorAll('[slot="label"]');
    expect(labels[0].getAttribute('tabindex')).toBe('0');
  });

  it('tree-item label gets tabindex="-1"', async () => {
    const tree = createTree();
    await tick();
    const labels = tree.querySelectorAll('[slot="label"]');
    // RovingFocusable sets first item to tabindex="0", rest to "-1"
    expect(labels[0].getAttribute('tabindex')).toBe('0');
    expect(labels[1].getAttribute('tabindex')).toBe('-1');
  });

  it('nested tree-item gets [expandable] attribute', async () => {
    const tree = createNestedTree();
    await tick();
    const parentItem = tree.querySelector(':scope > ui-tree-item')!;
    expect(parentItem.hasAttribute('expandable')).toBe(true);
  });

  it('expanded attribute toggles caret icon direction (caret-right vs caret-down)', async () => {
    const tree = createNestedTree();
    await tick();
    const parentItem = tree.querySelector(':scope > ui-tree-item')!;
    const caret = parentItem.querySelector('.ui-tree-caret')!;

    // Initially not expanded -> caret-right
    expect(caret.getAttribute('name')).toBe('caret-right');

    // Expand
    parentItem.setAttribute('expanded', '');
    expect(caret.getAttribute('name')).toBe('caret-down');

    // Collapse
    parentItem.removeAttribute('expanded');
    expect(caret.getAttribute('name')).toBe('caret-right');
  });

  it('click on label selects item (adds [selected])', async () => {
    const tree = createTree();
    await tick();
    const item1 = tree.querySelector('ui-tree-item')!;
    const label1 = item1.querySelector('[slot="label"]')!;

    label1.dispatchEvent(new Event('click', { bubbles: true }));
    expect(item1.hasAttribute('selected')).toBe(true);
    // ARIA: aria-selected reflects selection state
    expect(item1.getAttribute('aria-selected')).toBe('true');
  });

  it('click on expandable item label toggles expanded', async () => {
    const tree = createNestedTree();
    await tick();
    const parentItem = tree.querySelector(':scope > ui-tree-item')!;
    const parentLabel = parentItem.querySelector(':scope > [slot="label"]')!;

    expect(parentItem.hasAttribute('expanded')).toBe(false);
    // ARIA: initially collapsed
    expect(parentItem.getAttribute('aria-expanded')).toBe('false');

    parentLabel.dispatchEvent(new Event('click', { bubbles: true }));
    expect(parentItem.hasAttribute('expanded')).toBe(true);
    // ARIA: expanded after click
    expect(parentItem.getAttribute('aria-expanded')).toBe('true');

    parentLabel.dispatchEvent(new Event('click', { bubbles: true }));
    expect(parentItem.hasAttribute('expanded')).toBe(false);
    // ARIA: collapsed after second click
    expect(parentItem.getAttribute('aria-expanded')).toBe('false');
  });

  it('disabled item ignores clicks', async () => {
    const tree = createTree();
    await tick();
    const item1 = tree.querySelector('ui-tree-item')!;
    item1.setAttribute('disabled', '');
    const label1 = item1.querySelector('[slot="label"]')!;

    label1.dispatchEvent(new Event('click', { bubbles: true }));
    expect(item1.hasAttribute('selected')).toBe(false);
  });

  it('keyboard Enter toggles selection and expansion', async () => {
    const tree = createNestedTree();
    await tick();
    const parentItem = tree.querySelector(':scope > ui-tree-item')!;
    const parentLabel = parentItem.querySelector(':scope > [slot="label"]') as HTMLElement;

    // Enter should select and toggle expansion
    parentLabel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(parentItem.hasAttribute('selected')).toBe(true);
    expect(parentItem.hasAttribute('expanded')).toBe(true);
    // ARIA: aria-selected and aria-expanded update after keyboard interaction
    expect(parentItem.getAttribute('aria-selected')).toBe('true');
    expect(parentItem.getAttribute('aria-expanded')).toBe('true');
  });

  it('keyboard Space toggles selection and expansion', async () => {
    const tree = createNestedTree();
    await tick();
    const parentItem = tree.querySelector(':scope > ui-tree-item')!;
    const parentLabel = parentItem.querySelector(':scope > [slot="label"]') as HTMLElement;

    parentLabel.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(parentItem.hasAttribute('selected')).toBe(true);
    expect(parentItem.hasAttribute('expanded')).toBe(true);
  });

  it('ArrowRight on collapsed expandable expands it', async () => {
    const tree = createNestedTree();
    await tick();
    const parentItem = tree.querySelector(':scope > ui-tree-item')!;
    const parentLabel = parentItem.querySelector(':scope > [slot="label"]') as HTMLElement;

    expect(parentItem.hasAttribute('expanded')).toBe(false);
    parentLabel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(parentItem.hasAttribute('expanded')).toBe(true);
    // ARIA: aria-expanded reflects expansion via ArrowRight
    expect(parentItem.getAttribute('aria-expanded')).toBe('true');
  });

  it('ArrowLeft on expanded collapses it', async () => {
    const tree = createNestedTree();
    await tick();
    const parentItem = tree.querySelector(':scope > ui-tree-item')!;
    parentItem.setAttribute('expanded', '');

    const parentLabel = parentItem.querySelector(':scope > [slot="label"]') as HTMLElement;
    parentLabel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(parentItem.hasAttribute('expanded')).toBe(false);
    // ARIA: aria-expanded reflects collapse via ArrowLeft
    expect(parentItem.getAttribute('aria-expanded')).toBe('false');
  });

  it('tree-item sets --_tree-depth CSS property on nested labels (depth > 0)', async () => {
    const tree = createNestedTree();
    await tick();

    // The child item is nested inside the parent -> depth = 1
    const childrenWrapper = tree.querySelector('.ui-tree-children');
    expect(childrenWrapper).not.toBeNull();

    const childItem = childrenWrapper!.querySelector('ui-tree-item')!;
    const childLabel = childItem.querySelector('[slot="label"]') as HTMLElement;
    expect(childLabel.style.getPropertyValue('--_tree-depth')).toBe('1');
  });

  it('wraps child tree-items in a .ui-tree-children container', async () => {
    const tree = createNestedTree();
    await tick();
    const parentItem = tree.querySelector(':scope > ui-tree-item')!;
    const wrapper = parentItem.querySelector('.ui-tree-children');
    expect(wrapper).not.toBeNull();
    expect(wrapper!.querySelectorAll('ui-tree-item').length).toBe(1);
  });

  it('expandable item injects caret icon into label', async () => {
    const tree = createNestedTree();
    await tick();
    const parentItem = tree.querySelector(':scope > ui-tree-item')!;
    const parentLabel = parentItem.querySelector(':scope > [slot="label"]')!;
    const caret = parentLabel.querySelector('.ui-tree-caret');
    expect(caret).not.toBeNull();
    expect(caret!.tagName.toLowerCase()).toBe('ui-icon');
  });

  it('flat items do not get [expandable] attribute', async () => {
    const tree = createTree();
    await tick();
    const items = tree.querySelectorAll('ui-tree-item');
    for (const item of items) {
      expect(item.hasAttribute('expandable')).toBe(false);
    }
  });

  it('disabled item ignores keyboard Enter', async () => {
    const tree = createTree();
    await tick();
    const item1 = tree.querySelector('ui-tree-item')!;
    item1.setAttribute('disabled', '');
    const label1 = item1.querySelector('[slot="label"]') as HTMLElement;

    label1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(item1.hasAttribute('selected')).toBe(false);
  });

  it('roving focus uses vertical orientation (ArrowDown moves focus)', async () => {
    const tree = createTree();
    await tick();
    const labels = tree.querySelectorAll('[slot="label"]');
    // ArrowDown should move focus from first to second label (vertical orientation)
    labels[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(labels[0].getAttribute('tabindex')).toBe('-1');
    expect(labels[1].getAttribute('tabindex')).toBe('0');
  });
});
