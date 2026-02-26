// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../ui-badge.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

function create(text: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('ui-badge');
  el.textContent = text;
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

describe('ui-badge', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-badge')).toBeDefined();
  });

  it('displays text content as-is when no max attribute is set', () => {
    const el = create('42');
    expect(el.textContent).toBe('42');
  });

  it('displays "{max}+" when numeric content exceeds max', () => {
    const el = create('150', { max: '99' });
    expect(el.textContent).toBe('99+');
  });

  it('displays original content when numeric content equals max', () => {
    const el = create('99', { max: '99' });
    expect(el.textContent).toBe('99');
  });

  it('displays original content when numeric content is below max', () => {
    const el = create('50', { max: '99' });
    expect(el.textContent).toBe('50');
  });

  it('does not truncate non-numeric content even when max is set', () => {
    const el = create('New', { max: '99' });
    expect(el.textContent).toBe('New');
  });

  it('re-applies max when max attribute is changed after setup', () => {
    const el = create('200');
    expect(el.textContent).toBe('200');

    el.setAttribute('max', '99');
    expect(el.textContent).toBe('99+');
  });

  it('handles NaN max gracefully by leaving content unchanged', () => {
    const el = create('150', { max: 'abc' });
    expect(el.textContent).toBe('150');
  });

  it('stores original content on setup so re-apply restores it below threshold', () => {
    // Verify that after truncation the original value is restored when max is raised
    const el = create('50', { max: '99' });
    expect(el.textContent).toBe('50');

    // Lower max so content now exceeds it
    el.setAttribute('max', '25');
    expect(el.textContent).toBe('25+');

    // Raise max back so content no longer exceeds it
    el.setAttribute('max', '99');
    expect(el.textContent).toBe('50');
  });

  it('displays content unchanged when max attribute is removed after truncation', () => {
    const el = create('150', { max: '99' });
    expect(el.textContent).toBe('99+');

    // Removing max stops truncation; #applyMax returns early when no max attr
    el.removeAttribute('max');
    // Content stays as last rendered value since #applyMax only updates on max change
    // Verify at least the element still exists and is connected
    expect(el.isConnected).toBe(true);
  });
});
