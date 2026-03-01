// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../index.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('nui-app-panel', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('nui-app-panel')).toBeDefined();
  });

  // ── Main mode (default) ──

  it('main mode: renders without aside attribute', () => {
    const el = document.createElement('nui-app-panel');
    document.body.appendChild(el);
    expect(el.hasAttribute('aside')).toBe(false);
  });

  it('main mode: open defaults to false', () => {
    const el = document.createElement('nui-app-panel') as any;
    document.body.appendChild(el);
    expect(el.open).toBe(false);
  });

  // ── Aside mode ──

  it('aside mode: open property defaults to false', () => {
    const el = document.createElement('nui-app-panel') as any;
    el.setAttribute('aside', '');
    document.body.appendChild(el);
    expect(el.open).toBe(false);
  });

  it('aside mode: open property reflects to attribute', () => {
    const el = document.createElement('nui-app-panel') as any;
    el.setAttribute('aside', '');
    document.body.appendChild(el);
    el.open = true;
    expect(el.hasAttribute('open')).toBe(true);
    el.open = false;
    expect(el.hasAttribute('open')).toBe(false);
  });

  it('aside mode: toggle() flips open state', () => {
    const el = document.createElement('nui-app-panel') as any;
    el.setAttribute('aside', '');
    document.body.appendChild(el);
    expect(el.open).toBe(false);
    el.toggle();
    expect(el.open).toBe(true);
    el.toggle();
    expect(el.open).toBe(false);
  });

  it('aside mode: survives setup without resize handle', () => {
    const el = document.createElement('nui-app-panel');
    el.setAttribute('aside', '');
    document.body.appendChild(el);
    // No .layout-resize-handle — should not throw
    expect(el).toBeTruthy();
  });

  it('main mode: survives setup without resize handle', () => {
    const el = document.createElement('nui-app-panel');
    document.body.appendChild(el);
    expect(el).toBeTruthy();
  });
});
