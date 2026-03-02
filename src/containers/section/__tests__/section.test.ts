// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../section.ts';

function create(
  attrs: Record<string, string> = {},
  opts: { heading?: string; content?: string } = {},
): HTMLElement {
  const el = document.createElement('n-section');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  if (opts.heading) {
    const h = document.createElement('span');
    h.setAttribute('slot', 'heading');
    h.textContent = opts.heading;
    el.appendChild(h);
  }
  if (opts.content) {
    const p = document.createElement('p');
    p.textContent = opts.content;
    el.appendChild(p);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-section', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-section')).toBeDefined();
  });

  it('creates an instance via document.createElement', () => {
    const el = create();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.tagName.toLowerCase()).toBe('n-section');
  });

  it('renders heading and content', () => {
    const el = create({}, { heading: 'My Section', content: 'Hello world' });
    expect(el.querySelector('[slot="heading"]')!.textContent).toBe('My Section');
    expect(el.querySelector('p')!.textContent).toBe('Hello world');
  });

  describe('observed attributes', () => {
    it('observes collapsible, collapsed, and divider', () => {
      const Ctor = customElements.get('n-section') as any;
      expect(Ctor.observedAttributes).toContain('collapsible');
      expect(Ctor.observedAttributes).toContain('collapsed');
      expect(Ctor.observedAttributes).toContain('divider');
    });
  });

  describe('collapsible behavior', () => {
    it('toggles collapsed on heading click when collapsible', () => {
      const el = create({ collapsible: '' }, { heading: 'Toggle Me', content: 'Body' });
      expect(el.hasAttribute('collapsed')).toBe(false);

      const heading = el.querySelector('[slot="heading"]') as HTMLElement;
      heading.click();
      expect(el.hasAttribute('collapsed')).toBe(true);

      heading.click();
      expect(el.hasAttribute('collapsed')).toBe(false);
    });

    it('starts collapsed when both collapsible and collapsed are set', () => {
      const el = create({ collapsible: '', collapsed: '' }, { heading: 'Title', content: 'Body' });
      expect(el.hasAttribute('collapsed')).toBe(true);

      const heading = el.querySelector('[slot="heading"]') as HTMLElement;
      heading.click();
      expect(el.hasAttribute('collapsed')).toBe(false);
    });

    it('does not toggle collapsed on heading click when not collapsible', () => {
      const el = create({}, { heading: 'Static', content: 'Body' });
      expect(el.hasAttribute('collapsed')).toBe(false);

      const heading = el.querySelector('[slot="heading"]') as HTMLElement;
      heading.click();
      expect(el.hasAttribute('collapsed')).toBe(false);
    });

    it('does nothing if no heading is present', () => {
      // Collapsible but no heading element — should not throw
      const el = create({ collapsible: '' }, { content: 'Body only' });
      expect(el.hasAttribute('collapsed')).toBe(false);
    });
  });

  describe('teardown', () => {
    it('removes heading click listener on disconnect', () => {
      const el = create({ collapsible: '' }, { heading: 'Title', content: 'Body' });
      const heading = el.querySelector('[slot="heading"]') as HTMLElement;

      document.body.removeChild(el);

      // After disconnect, clicking heading should not toggle collapsed
      // (listener was removed in teardown)
      heading.click();
      expect(el.hasAttribute('collapsed')).toBe(false);
    });

    it('does not throw on disconnect without heading', () => {
      const el = create({ collapsible: '' }, { content: 'Body only' });
      // Should not throw
      document.body.removeChild(el);
    });
  });
});
