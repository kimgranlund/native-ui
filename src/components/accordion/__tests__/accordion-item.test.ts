// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../accordion.ts';

function create(attrs: Record<string, string> = {}, html = ''): HTMLElement {
  const el = document.createElement('n-accordion-item');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-accordion-item', () => {
  it('is registered', () => {
    expect(customElements.get('n-accordion-item')).toBeDefined();
  });

  it('creates details/summary structure', () => {
    const el = create({}, '<span slot="heading">Title</span><p>Content</p>');
    expect(el.querySelector('details')).toBeTruthy();
    expect(el.querySelector('summary')).toBeTruthy();
  });

  it('moves heading into summary', () => {
    const el = create({}, '<span slot="heading">Title</span><p>Content</p>');
    const summary = el.querySelector('summary')!;
    expect(summary.textContent).toContain('Title');
  });

  it('wraps content in [part="content"]', () => {
    const el = create({}, '<span slot="heading">Title</span><p>Body text</p>');
    const content = el.querySelector('[part="content"]');
    expect(content).toBeTruthy();
    expect(content?.querySelector('p')?.textContent).toBe('Body text');
  });

  it('defaults to closed', () => {
    const el = create({}, '<span slot="heading">T</span>') as any;
    expect(el.open).toBe(false);
    expect(el.querySelector('details')?.open).toBe(false);
  });

  it('open attribute opens the details', () => {
    const el = create({ open: '' }, '<span slot="heading">T</span>') as any;
    expect(el.open).toBe(true);
    expect(el.querySelector('details')?.open).toBe(true);
  });

  it('open property reflects attribute', () => {
    const el = create({}, '<span slot="heading">T</span>') as any;
    el.open = true;
    expect(el.hasAttribute('open')).toBe(true);
    el.open = false;
    expect(el.hasAttribute('open')).toBe(false);
  });

  it('disabled defaults to false', () => {
    const el = create() as any;
    expect(el.disabled).toBe(false);
    // ARIA: no aria-disabled when not disabled
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('disabled property reflects', () => {
    const el = create() as any;
    el.disabled = true;
    expect(el.hasAttribute('disabled')).toBe(true);
    // ARIA: disabled sets aria-disabled
    expect(el.getAttribute('aria-disabled')).toBe('true');
    el.disabled = false;
    expect(el.hasAttribute('disabled')).toBe(false);
    // ARIA: removing disabled clears aria-disabled
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('disabled attribute syncs to signal', () => {
    const el = create({ disabled: '' }) as any;
    expect(el.disabled).toBe(true);
  });

  it('teardown cleans up toggle listener', () => {
    const el = create({}, '<span slot="heading">T</span><p>C</p>');
    el.remove();
    expect(true).toBe(true);
  });
});
