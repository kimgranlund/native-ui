// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { registerIcon } from '../registry.ts';
import '../ui-icon.ts';

const STAR_SVG = '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M128,0L168,80,256,93,192,155,207,243,128,200,49,243,64,155,0,93,88,80Z"/></svg>';
const CIRCLE_SVG = '<svg viewBox="0 0 256 256" fill="currentColor"><circle cx="128" cy="128" r="100"/></svg>';

beforeAll(() => {
  registerIcon('test-star', STAR_SVG);
  registerIcon('test-circle', CIRCLE_SVG);
});

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('ui-icon');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-icon', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-icon')).toBeDefined();
  });

  it('renders SVG when name matches a registered icon', () => {
    const el = create({ name: 'test-star' });
    expect(el.querySelector('svg')).not.toBeNull();
    expect(el.innerHTML).toContain('viewBox');
  });

  it('renders empty when no name attribute', () => {
    const el = create();
    expect(el.innerHTML).toBe('');
  });

  it('renders empty for unknown name', () => {
    const el = create({ name: 'does-not-exist' });
    expect(el.innerHTML).toBe('');
  });

  it('re-renders when name changes to another registered icon', () => {
    const el = create({ name: 'test-star' });
    expect(el.innerHTML).toContain('path');

    el.setAttribute('name', 'test-circle');
    expect(el.innerHTML).toContain('circle');
  });

  it('clears when name attribute is removed', () => {
    const el = create({ name: 'test-star' });
    expect(el.querySelector('svg')).not.toBeNull();

    el.removeAttribute('name');
    expect(el.innerHTML).toBe('');
  });

  it('clears when name changes to unknown', () => {
    const el = create({ name: 'test-star' });
    expect(el.querySelector('svg')).not.toBeNull();

    el.setAttribute('name', 'unknown-icon');
    expect(el.innerHTML).toBe('');
  });

  it('is decorative by default (aria-hidden, no role)', () => {
    const el = create({ name: 'test-star' });
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.hasAttribute('role')).toBe(false);
  });

  it('becomes meaningful when aria-label is set', () => {
    const el = create({ name: 'test-star', 'aria-label': 'Favorite' });
    expect(el.getAttribute('role')).toBe('img');
    expect(el.hasAttribute('aria-hidden')).toBe(false);
  });

  it('switches from meaningful to decorative when aria-label removed', () => {
    const el = create({ name: 'test-star', 'aria-label': 'Favorite' });
    expect(el.getAttribute('role')).toBe('img');

    el.removeAttribute('aria-label');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.hasAttribute('role')).toBe(false);
  });

  it('switches from decorative to meaningful when aria-label added', () => {
    const el = create({ name: 'test-star' });
    expect(el.getAttribute('aria-hidden')).toBe('true');

    el.setAttribute('aria-label', 'Star');
    expect(el.getAttribute('role')).toBe('img');
    expect(el.hasAttribute('aria-hidden')).toBe(false);
  });

  it('renders via late registration when icon is registered after element', () => {
    const el = create({ name: 'test-late-icon' });
    expect(el.innerHTML).toBe('');

    registerIcon('test-late-icon', CIRCLE_SVG);
    expect(el.querySelector('svg')).not.toBeNull();
    expect(el.innerHTML).toContain('circle');
  });

  it('accepts size attribute', () => {
    const el = create({ name: 'test-star', size: 'lg' });
    expect(el.getAttribute('size')).toBe('lg');
    expect(el.querySelector('svg')).not.toBeNull();
  });

  it('does not render after removal from DOM when icon is late-registered', () => {
    const el = create({ name: 'test-deregistered-icon' });
    expect(el.innerHTML).toBe('');

    // Remove from DOM — triggers disconnectedCallback which cleans up subscription
    el.remove();

    // Register the icon after element is disconnected
    registerIcon('test-deregistered-icon', STAR_SVG);

    // Element should NOT have rendered because it was disconnected
    expect(el.innerHTML).toBe('');
  });

  it('cleans up late-registration subscription on disconnect', () => {
    const el = create({ name: 'test-unsub-icon' });
    expect(el.innerHTML).toBe('');

    // Remove and re-add — subscription should be cleaned up then re-established
    el.remove();
    document.body.appendChild(el);

    // Register now — should render because element is reconnected
    registerIcon('test-unsub-icon', CIRCLE_SVG);
    expect(el.innerHTML).toContain('circle');
  });
});
