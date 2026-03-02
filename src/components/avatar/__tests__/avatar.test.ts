// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import '../avatar.ts';

// Capture the internals object created during attachInternals() so tests can
// inspect ariaLabel without accessing the private #internals field.
let capturedInternals: any = null;

beforeEach(() => {
  capturedInternals = null;
  const originalAttach = HTMLElement.prototype.attachInternals;
  HTMLElement.prototype.attachInternals = function () {
    const internals = originalAttach.call(this);
    capturedInternals = internals;
    return internals;
  };
});

afterEach(() => {
  document.body.innerHTML = '';
});

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('n-avatar');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

describe('n-avatar', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-avatar')).toBeDefined();
  });

  it('shows "?" when no src or name is provided', () => {
    const el = create();
    expect(el.textContent).toBe('?');
  });

  it('shows single initial for a one-word name', () => {
    const el = create({ name: 'Alice' });
    expect(el.textContent).toBe('A');
  });

  it('shows two initials for a two-word name', () => {
    const el = create({ name: 'John Doe' });
    expect(el.textContent).toBe('JD');
  });

  it('uses first and last word initials for multi-word names', () => {
    const el = create({ name: 'Mary Jane Watson' });
    expect(el.textContent).toBe('MW');
  });

  it('creates an img element when src is set', () => {
    const el = create({ src: 'https://example.com/avatar.png' });
    const img = el.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.src).toBe('https://example.com/avatar.png');
  });

  it('sets alt on img from the alt attribute', () => {
    const el = create({ src: 'https://example.com/avatar.png', alt: 'Profile photo' });
    const img = el.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.alt).toBe('Profile photo');
  });

  it('falls back to name as img alt when no alt attribute is provided', () => {
    const el = create({ src: 'https://example.com/avatar.png', name: 'Jane Smith' });
    const img = el.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.alt).toBe('Jane Smith');
  });

  it('src property reflects to attribute', () => {
    const el = create();
    (el as any).src = 'https://example.com/photo.jpg';
    expect(el.getAttribute('src')).toBe('https://example.com/photo.jpg');
  });

  it('name property reflects to attribute', () => {
    const el = create();
    (el as any).name = 'Bob Builder';
    expect(el.getAttribute('name')).toBe('Bob Builder');
  });

  it('sets ariaLabel from alt attribute when src is provided', () => {
    create({ src: 'https://example.com/avatar.png', alt: 'Custom alt text' });
    expect(capturedInternals.ariaLabel).toBe('Custom alt text');
  });

  it('sets ariaLabel to name when alt is absent', () => {
    create({ name: 'John Doe' });
    expect(capturedInternals.ariaLabel).toBe('John Doe');
  });

  it('sets ariaLabel to empty string when neither alt nor name is present', () => {
    create();
    expect(capturedInternals.ariaLabel).toBe('');
  });

  it('re-renders on attributeChangedCallback when connected', () => {
    const el = create({ name: 'Alice' });
    expect(el.textContent).toBe('A');

    el.setAttribute('name', 'Bob Carter');
    expect(el.textContent).toBe('BC');
  });

  it('falls back to initials after img error', () => {
    const el = create({ src: 'https://example.com/broken.png', name: 'Jane Doe' });
    const img = el.querySelector('img');
    expect(img).not.toBeNull();

    img!.dispatchEvent(new Event('error'));

    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toBe('JD');
  });

  it('falls back to "?" after img error when no name is set', () => {
    const el = create({ src: 'https://example.com/broken.png' });
    const img = el.querySelector('img');
    expect(img).not.toBeNull();

    img!.dispatchEvent(new Event('error'));

    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toBe('?');
  });
});
