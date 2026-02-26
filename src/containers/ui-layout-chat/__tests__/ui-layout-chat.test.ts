// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../ui-layout-chat.ts';

function create(): HTMLElement {
  const el = document.createElement('ui-layout-chat');
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ui-layout-chat', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('ui-layout-chat')).toBeDefined();
  });

  it('open property defaults to false', () => {
    const el = create() as any;
    expect(el.open).toBe(false);
  });

  it('open property reflects to attribute', () => {
    const el = create() as any;
    el.open = true;
    expect(el.hasAttribute('open')).toBe(true);
    el.open = false;
    expect(el.hasAttribute('open')).toBe(false);
  });

  it('toggle() flips open state', () => {
    const el = create() as any;
    expect(el.open).toBe(false);
    el.toggle();
    expect(el.open).toBe(true);
    el.toggle();
    expect(el.open).toBe(false);
  });

  it('survives setup without resize handle', () => {
    // No .layout-resize-handle present — should not throw
    const el = create();
    expect(el).toBeTruthy();
  });
});
