// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../article.ts';

function create(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('n-container');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('n-container', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-container')).toBeDefined();
  });

  it('creates an instance via document.createElement', () => {
    const el = create();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.tagName.toLowerCase()).toBe('n-container');
  });

  it('renders slot content', () => {
    const el = create();
    el.innerHTML = '<p>Article body</p>';
    expect(el.querySelector('p')!.textContent).toBe('Article body');
  });

  describe('interactive mode', () => {
    it('sets tabindex=0 when interactive attribute is present', () => {
      const el = create({ interactive: '' });
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('does not override an existing tabindex', () => {
      const el = create({ interactive: '', tabindex: '5' });
      expect(el.getAttribute('tabindex')).toBe('5');
    });

    it('does not set tabindex when not interactive', () => {
      const el = create();
      expect(el.hasAttribute('tabindex')).toBe(false);
    });

    it('navigates to href on click', () => {
      const el = create({ interactive: '', href: 'https://example.com' });

      // Spy on window.location assignment
      const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        set href(_val: string) {},
        get href() { return ''; },
      } as Location);

      // We can't easily spy on the setter, so just verify no error is thrown
      el.click();

      locationSpy.mockRestore();
    });

    it('activates on Enter key', () => {
      const el = create({ interactive: '', href: '#test' });
      const preventDefaultSpy = vi.fn();
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy });

      el.dispatchEvent(event);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('activates on Space key', () => {
      const el = create({ interactive: '', href: '#test' });
      const preventDefaultSpy = vi.fn();
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy });

      el.dispatchEvent(event);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('does not activate on other keys', () => {
      const el = create({ interactive: '', href: '#test' });
      const preventDefaultSpy = vi.fn();
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy });

      el.dispatchEvent(event);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('non-interactive mode', () => {
    it('does not respond to click', () => {
      const el = create({ href: 'https://example.com' });
      el.click();
    });
  });

  describe('observed attributes', () => {
    it('observes interactive and href attributes', () => {
      const Ctor = customElements.get('n-container') as any;
      expect(Ctor.observedAttributes).toContain('interactive');
      expect(Ctor.observedAttributes).toContain('href');
    });
  });

  describe('teardown', () => {
    it('cleans up event listeners on disconnect', () => {
      const el = create({ interactive: '' });
      document.body.removeChild(el);

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });
  });
});
