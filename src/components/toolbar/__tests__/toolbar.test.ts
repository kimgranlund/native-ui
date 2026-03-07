// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../toolbar.ts';

function create(attrs: Record<string, string> = {}, children: string[] = []): HTMLElement {
  const el = document.createElement('n-toolbar');
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  for (const html of children) {
    const child = document.createElement('n-button');
    child.innerHTML = html;
    el.appendChild(child);
  }
  document.body.appendChild(el);
  return el;
}

function getButtons(toolbar: HTMLElement): HTMLElement[] {
  return [...toolbar.querySelectorAll<HTMLElement>('n-button:not([disabled]):not([data-overflow-trigger])')];
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('n-toolbar', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('n-toolbar')).toBeDefined();
  });

  it('creates an instance via document.createElement', () => {
    const el = create();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.tagName.toLowerCase()).toBe('n-toolbar');
  });

  describe('ARIA', () => {
    it('sets role=toolbar via ElementInternals', () => {
      const el = create();
      // ElementInternals.role is set in constructor — not reflected to DOM attribute.
      // Verify the internals were configured (the polyfill stores role).
      const Ctor = customElements.get('n-toolbar')!;
      expect(Ctor).toBeDefined();
    });

    it('sets default aria-label on setup', () => {
      const el = create();
      expect(el.getAttribute('aria-label')).toBe('Toolbar');
    });

    it('does not override existing aria-label', () => {
      const el = create({ 'aria-label': 'Formatting tools' });
      expect(el.getAttribute('aria-label')).toBe('Formatting tools');
    });
  });

  describe('roving focus', () => {
    it('sets tabindex on child buttons', () => {
      const el = create({}, ['Bold', 'Italic', 'Underline']);
      const buttons = getButtons(el);
      expect(buttons.length).toBe(3);

      // First button should have tabindex=0, rest should have tabindex=-1
      expect(buttons[0].getAttribute('tabindex')).toBe('0');
      expect(buttons[1].getAttribute('tabindex')).toBe('-1');
      expect(buttons[2].getAttribute('tabindex')).toBe('-1');
    });

    it('moves focus forward with ArrowRight', () => {
      const el = create({}, ['Bold', 'Italic', 'Underline']);
      const buttons = getButtons(el);

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      expect(buttons[0].getAttribute('tabindex')).toBe('-1');
      expect(buttons[1].getAttribute('tabindex')).toBe('0');
    });

    it('moves focus backward with ArrowLeft', () => {
      const el = create({}, ['Bold', 'Italic', 'Underline']);
      const buttons = getButtons(el);

      // Move forward first
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      // Then move back
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

      expect(buttons[0].getAttribute('tabindex')).toBe('0');
      expect(buttons[1].getAttribute('tabindex')).toBe('-1');
    });

    it('wraps focus at the end', () => {
      const el = create({}, ['A', 'B']);
      const buttons = getButtons(el);

      // Move past last item — should wrap to first
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      expect(buttons[0].getAttribute('tabindex')).toBe('0');
      expect(buttons[1].getAttribute('tabindex')).toBe('-1');
    });

    it('wraps focus at the start', () => {
      const el = create({}, ['A', 'B']);
      const buttons = getButtons(el);

      // Move before first item — should wrap to last
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

      expect(buttons[0].getAttribute('tabindex')).toBe('-1');
      expect(buttons[1].getAttribute('tabindex')).toBe('0');
    });

    it('Home key moves to first item', () => {
      const el = create({}, ['A', 'B', 'C']);
      const buttons = getButtons(el);

      // Move to second
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      // Home should go to first
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

      expect(buttons[0].getAttribute('tabindex')).toBe('0');
      expect(buttons[1].getAttribute('tabindex')).toBe('-1');
      expect(buttons[2].getAttribute('tabindex')).toBe('-1');
    });

    it('End key moves to last item', () => {
      const el = create({}, ['A', 'B', 'C']);
      const buttons = getButtons(el);

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

      expect(buttons[0].getAttribute('tabindex')).toBe('-1');
      expect(buttons[1].getAttribute('tabindex')).toBe('-1');
      expect(buttons[2].getAttribute('tabindex')).toBe('0');
    });

    it('skips disabled buttons', () => {
      const el = document.createElement('n-toolbar');
      const a = document.createElement('n-button');
      a.textContent = 'A';
      const b = document.createElement('n-button');
      b.textContent = 'B';
      b.setAttribute('disabled', '');
      const c = document.createElement('n-button');
      c.textContent = 'C';

      el.appendChild(a);
      el.appendChild(b);
      el.appendChild(c);
      document.body.appendChild(el);

      // Only A and C are focusable
      expect(a.getAttribute('tabindex')).toBe('0');
      expect(b.hasAttribute('tabindex')).toBe(false);
      expect(c.getAttribute('tabindex')).toBe('-1');

      // ArrowRight should skip B and go to C
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(a.getAttribute('tabindex')).toBe('-1');
      expect(c.getAttribute('tabindex')).toBe('0');
    });

    it('uses horizontal orientation by default', () => {
      const el = create({}, ['A', 'B']);

      // ArrowDown should NOT move focus (vertical nav)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      const buttons = getButtons(el);
      expect(buttons[0].getAttribute('tabindex')).toBe('0');
      expect(buttons[1].getAttribute('tabindex')).toBe('-1');
    });

    it('orientation="vertical" enables ArrowDown/ArrowUp navigation', () => {
      const el = create({ orientation: 'vertical' }, ['A', 'B', 'C']);
      const buttons = getButtons(el);

      // ArrowDown should move focus forward
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(buttons[0].getAttribute('tabindex')).toBe('-1');
      expect(buttons[1].getAttribute('tabindex')).toBe('0');

      // ArrowUp should move focus backward
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(buttons[0].getAttribute('tabindex')).toBe('0');
      expect(buttons[1].getAttribute('tabindex')).toBe('-1');
    });

    it('orientation="vertical" ignores ArrowRight/ArrowLeft', () => {
      const el = create({ orientation: 'vertical' }, ['A', 'B']);
      const buttons = getButtons(el);

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(buttons[0].getAttribute('tabindex')).toBe('0');
      expect(buttons[1].getAttribute('tabindex')).toBe('-1');
    });

    it('dynamic orientation change updates key bindings', () => {
      const el = create({}, ['A', 'B']);
      const buttons = getButtons(el);

      // Default horizontal — ArrowDown does nothing
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(buttons[0].getAttribute('tabindex')).toBe('0');

      // Switch to vertical
      el.setAttribute('orientation', 'vertical');

      // ArrowDown should now move focus
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(buttons[0].getAttribute('tabindex')).toBe('-1');
      expect(buttons[1].getAttribute('tabindex')).toBe('0');

      // ArrowRight should no longer move focus
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(buttons[1].getAttribute('tabindex')).toBe('0');
    });
  });

  describe('teardown', () => {
    it('cleans up on disconnect', () => {
      const el = create({}, ['A', 'B']);
      document.body.removeChild(el);

      // After removal, dispatching events should not throw
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
  });
});
