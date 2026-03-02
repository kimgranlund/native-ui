// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../accordion.ts';

function createAccordion(opts: { multiple?: boolean; items: { heading: string; content: string; open?: boolean }[] }): HTMLElement {
  const acc = document.createElement('n-accordion');
  if (opts.multiple) acc.setAttribute('multiple', '');

  for (const item of opts.items) {
    const el = document.createElement('n-accordion-item');
    if (item.open) el.setAttribute('open', '');
    el.innerHTML = `<span slot="heading">${item.heading}</span><p>${item.content}</p>`;
    acc.appendChild(el);
  }

  document.body.appendChild(acc);
  return acc;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-accordion', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-accordion')).toBeDefined();
    expect(customElements.get('n-accordion-item')).toBeDefined();
  });

  it('stamps details/summary inside accordion-item', () => {
    const acc = createAccordion({
      items: [{ heading: 'Title', content: 'Body' }],
    });
    const item = acc.querySelector('n-accordion-item')!;
    expect(item.querySelector('details')).not.toBeNull();
    expect(item.querySelector('summary')).not.toBeNull();
  });

  it('respects initial open attribute', () => {
    const acc = createAccordion({
      items: [{ heading: 'A', content: 'a', open: true }],
    });
    const item = acc.querySelector('n-accordion-item')! as any;
    expect(item.open).toBe(true);
    const details = item.querySelector('details')!;
    expect(details.open).toBe(true);
  });

  it('toggles open via property', () => {
    const acc = createAccordion({
      items: [{ heading: 'A', content: 'a' }],
    });
    const item = acc.querySelector('n-accordion-item')! as any;
    expect(item.open).toBe(false);

    item.open = true;
    expect(item.hasAttribute('open')).toBe(true);
    expect(item.querySelector('details')!.open).toBe(true);

    item.open = false;
    expect(item.hasAttribute('open')).toBe(false);
  });

  it('multiple=false (default): value accessor reflects multiple attribute', () => {
    const acc = createAccordion({
      items: [{ heading: 'A', content: 'a' }],
    });
    expect((acc as any).multiple).toBe(false);
    acc.setAttribute('multiple', '');
    expect((acc as any).multiple).toBe(true);
  });

  it('disabled item sets aria-disabled', () => {
    const acc = createAccordion({
      items: [{ heading: 'A', content: 'a' }],
    });
    const item = acc.querySelector('n-accordion-item')! as any;
    item.disabled = true;
    expect(item.getAttribute('aria-disabled')).toBe('true');
    item.disabled = false;
    expect(item.hasAttribute('aria-disabled')).toBe(false);
  });

  it('single mode: opening one item closes others', () => {
    const acc = createAccordion({
      items: [
        { heading: 'A', content: 'a', open: true },
        { heading: 'B', content: 'b' },
        { heading: 'C', content: 'c' },
      ],
    });
    const items = acc.querySelectorAll('n-accordion-item') as NodeListOf<any>;
    expect(items[0].open).toBe(true);

    // Open item B — should close item A
    items[1].open = true;
    // Simulate the toggle event that native <details> would fire
    const details = items[1].querySelector('details')!;
    details.dispatchEvent(new Event('toggle', { bubbles: true }));

    expect(items[1].open).toBe(true);
    expect(items[0].open).toBe(false);
  });

  it('multiple mode: allows multiple items open simultaneously', () => {
    const acc = createAccordion({
      multiple: true,
      items: [
        { heading: 'A', content: 'a', open: true },
        { heading: 'B', content: 'b' },
      ],
    });
    const items = acc.querySelectorAll('n-accordion-item') as NodeListOf<any>;

    items[1].open = true;
    const details = items[1].querySelector('details')!;
    details.dispatchEvent(new Event('toggle', { bubbles: true }));

    // Both should remain open in multiple mode
    expect(items[0].open).toBe(true);
    expect(items[1].open).toBe(true);
  });

  it('toggle event syncs open attribute back to item', () => {
    const acc = createAccordion({
      items: [{ heading: 'A', content: 'a' }],
    });
    const item = acc.querySelector('n-accordion-item')! as any;
    const details = item.querySelector('details')!;

    // Simulate native details opening (user clicks summary)
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    expect(item.open).toBe(true);
    expect(item.hasAttribute('open')).toBe(true);

    // Simulate native details closing
    details.open = false;
    details.dispatchEvent(new Event('toggle'));
    expect(item.open).toBe(false);
    expect(item.hasAttribute('open')).toBe(false);
  });

  it('disabled property reflects as attribute', () => {
    const acc = createAccordion({
      items: [{ heading: 'A', content: 'a' }],
    });
    const item = acc.querySelector('n-accordion-item')! as any;
    item.disabled = true;
    expect(item.hasAttribute('disabled')).toBe(true);
    item.disabled = false;
    expect(item.hasAttribute('disabled')).toBe(false);
  });
});
