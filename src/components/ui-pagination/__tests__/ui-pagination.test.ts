// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-pagination.ts';
import '../../ui-button/ui-button.ts';
import '../../../icons/ui-icon.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('ui-pagination');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-pagination', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-pagination')).toBeDefined();
  });

  it('defaults: total=1, value=1, siblings=1, boundaries=1', () => {
    const el = create();
    expect((el as any).total).toBe(1);
    expect((el as any).value).toBe(1);
    expect((el as any).siblings).toBe(1);
    expect((el as any).boundaries).toBe(1);
  });

  it('total property enforces a minimum of 1', () => {
    const el = create({ total: '10' });
    expect((el as any).total).toBe(10);

    (el as any).total = 0;
    expect((el as any).total).toBe(1);

    (el as any).total = -5;
    expect((el as any).total).toBe(1);
  });

  it('total attribute parses to number and enforces minimum', () => {
    const el = create({ total: '5' });
    expect((el as any).total).toBe(5);

    el.setAttribute('total', '0');
    expect((el as any).total).toBe(1);
  });

  it('value property is clamped to 1..total', () => {
    const el = create({ total: '10' });
    (el as any).value = 5;
    expect((el as any).value).toBe(5);

    (el as any).value = 0;
    expect((el as any).value).toBe(1);

    (el as any).value = 11;
    expect((el as any).value).toBe(10);
  });

  it('value attribute clamps to valid page range', () => {
    const el = create({ total: '5', value: '3' });
    expect((el as any).value).toBe(3);

    el.setAttribute('value', '99');
    expect((el as any).value).toBe(5);

    el.setAttribute('value', '-1');
    expect((el as any).value).toBe(1);
  });

  it('siblings property enforces a minimum of 0', () => {
    const el = create();
    (el as any).siblings = 3;
    expect((el as any).siblings).toBe(3);

    (el as any).siblings = -2;
    expect((el as any).siblings).toBe(0);
  });

  it('boundaries property enforces a minimum of 0', () => {
    const el = create();
    (el as any).boundaries = 2;
    expect((el as any).boundaries).toBe(2);

    (el as any).boundaries = -1;
    expect((el as any).boundaries).toBe(0);
  });

  it('renders prev and next buttons', () => {
    const el = create({ total: '5', value: '3' });
    const prevBtn = el.querySelector('ui-button[aria-label="Previous page"]');
    const nextBtn = el.querySelector('ui-button[aria-label="Next page"]');
    expect(prevBtn).not.toBeNull();
    expect(nextBtn).not.toBeNull();
  });

  it('prev button is disabled when on the first page', () => {
    const el = create({ total: '5', value: '1' });
    const prevBtn = el.querySelector('ui-button[aria-label="Previous page"]');
    expect(prevBtn?.hasAttribute('disabled')).toBe(true);
  });

  it('prev button is enabled when not on the first page', () => {
    const el = create({ total: '5', value: '2' });
    const prevBtn = el.querySelector('ui-button[aria-label="Previous page"]');
    expect(prevBtn?.hasAttribute('disabled')).toBe(false);
  });

  it('next button is disabled when on the last page', () => {
    const el = create({ total: '5', value: '5' });
    const nextBtn = el.querySelector('ui-button[aria-label="Next page"]');
    expect(nextBtn?.hasAttribute('disabled')).toBe(true);
  });

  it('next button is enabled when not on the last page', () => {
    const el = create({ total: '5', value: '4' });
    const nextBtn = el.querySelector('ui-button[aria-label="Next page"]');
    expect(nextBtn?.hasAttribute('disabled')).toBe(false);
  });

  it('current page button has aria-current="page"', () => {
    const el = create({ total: '5', value: '3' });
    const currentBtn = el.querySelector('ui-button[aria-current="page"]');
    expect(currentBtn).not.toBeNull();
    expect(currentBtn?.getAttribute('aria-label')).toBe('Page 3');
  });

  it('only one page button has aria-current="page"', () => {
    const el = create({ total: '5', value: '2' });
    const currentBtns = el.querySelectorAll('ui-button[aria-current="page"]');
    expect(currentBtns).toHaveLength(1);
  });

  it('renders all page buttons for small total (total=5)', () => {
    const el = create({ total: '5', value: '3' });
    const pageBtns = el.querySelectorAll('ui-button[aria-label^="Page"]');
    expect(pageBtns).toHaveLength(5);
    expect(pageBtns[0].getAttribute('aria-label')).toBe('Page 1');
    expect(pageBtns[4].getAttribute('aria-label')).toBe('Page 5');
  });

  it('renders no ellipsis for small total', () => {
    const el = create({ total: '5', value: '3' });
    const ellipsis = el.querySelectorAll('.ui-pagination-ellipsis');
    expect(ellipsis).toHaveLength(0);
  });

  it('renders ellipsis for large total with current page in middle (total=20, value=10)', () => {
    const el = create({ total: '20', value: '10' });
    const ellipsis = el.querySelectorAll('.ui-pagination-ellipsis');
    expect(ellipsis.length).toBeGreaterThan(0);
  });

  it('renders ellipsis elements as spans with correct class', () => {
    const el = create({ total: '20', value: '10' });
    const ellipsis = el.querySelectorAll('.ui-pagination-ellipsis');
    for (const span of ellipsis) {
      expect(span.tagName.toLowerCase()).toBe('span');
      expect(span.textContent).toBe('\u2026');
    }
  });

  it('renders boundary pages when current is far from boundaries', () => {
    const el = create({ total: '20', value: '10' });
    // Page 1 (left boundary) and page 20 (right boundary) should be present
    const btn1 = el.querySelector('ui-button[aria-label="Page 1"]');
    const btn20 = el.querySelector('ui-button[aria-label="Page 20"]');
    expect(btn1).not.toBeNull();
    expect(btn20).not.toBeNull();
  });

  it('dispatches ui-change with correct value when a page button is pressed', () => {
    const el = create({ total: '5', value: '1' });
    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

    const page3Btn = el.querySelector('ui-button[aria-label="Page 3"]');
    expect(page3Btn).not.toBeNull();
    page3Btn!.dispatchEvent(new Event('ui-press', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe(3);
  });

  it('updates value property when a page button is pressed', () => {
    const el = create({ total: '5', value: '1' });
    const page4Btn = el.querySelector('ui-button[aria-label="Page 4"]');
    page4Btn!.dispatchEvent(new Event('ui-press', { bubbles: true }));

    expect((el as any).value).toBe(4);
  });

  it('updates value attribute when a page button is pressed', () => {
    const el = create({ total: '5', value: '1' });
    const page2Btn = el.querySelector('ui-button[aria-label="Page 2"]');
    page2Btn!.dispatchEvent(new Event('ui-press', { bubbles: true }));

    expect(el.getAttribute('value')).toBe('2');
  });

  it('does not dispatch ui-change when clicking the current page', () => {
    const el = create({ total: '5', value: '3' });
    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

    const currentBtn = el.querySelector('ui-button[aria-current="page"]');
    currentBtn!.dispatchEvent(new Event('ui-press', { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('pressing next button advances to next page', () => {
    const el = create({ total: '5', value: '2' });
    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

    const nextBtn = el.querySelector('ui-button[aria-label="Next page"]');
    nextBtn!.dispatchEvent(new Event('ui-press', { bubbles: true }));

    expect((el as any).value).toBe(3);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe(3);
  });

  it('pressing prev button goes to previous page', () => {
    const el = create({ total: '5', value: '3' });
    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

    const prevBtn = el.querySelector('ui-button[aria-label="Previous page"]');
    prevBtn!.dispatchEvent(new Event('ui-press', { bubbles: true }));

    expect((el as any).value).toBe(2);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe(2);
  });

  it('value attribute change updates value signal and re-renders current page indicator', () => {
    const el = create({ total: '5', value: '1' });
    expect(el.querySelector('ui-button[aria-current="page"]')?.getAttribute('aria-label')).toBe('Page 1');

    el.setAttribute('value', '4');
    expect((el as any).value).toBe(4);
    expect(el.querySelector('ui-button[aria-current="page"]')?.getAttribute('aria-label')).toBe('Page 4');
  });

  it('total=1 renders only prev and next buttons (one page total)', () => {
    const el = create({ total: '1', value: '1' });
    const pageBtns = el.querySelectorAll('ui-button[aria-label^="Page"]');
    const prevBtn = el.querySelector('ui-button[aria-label="Previous page"]');
    const nextBtn = el.querySelector('ui-button[aria-label="Next page"]');

    expect(pageBtns).toHaveLength(1);
    expect(prevBtn?.hasAttribute('disabled')).toBe(true);
    expect(nextBtn?.hasAttribute('disabled')).toBe(true);
  });

  it('all page buttons use variant="ghost"', () => {
    const el = create({ total: '5', value: '3' });
    const pageBtns = el.querySelectorAll('ui-button[aria-label^="Page"]');
    for (const btn of pageBtns) {
      expect(btn.getAttribute('variant')).toBe('ghost');
    }
  });
});
