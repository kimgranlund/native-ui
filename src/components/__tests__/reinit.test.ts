// @vitest-environment happy-dom
/**
 * Re-initialization tests: verify components survive the
 * connect → disconnect → reconnect lifecycle without leaking
 * listeners, breaking controllers, or corrupting state.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

// Import component registrations
import '../button/button.ts';
import '../input/input.ts';
import '../checkbox/checkbox.ts';
import '../switch/switch.ts';
import '../accordion/accordion.ts';
import '../dialog/dialog.ts';
import '../tabs/tabs.ts';
import '../radio/radio.ts';
import '../breadcrumb/breadcrumb.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('re-initialization', () => {
  it('n-button survives remove + re-append', () => {
    const el = document.createElement('n-button');
    el.textContent = 'Click';
    document.body.appendChild(el);

    el.remove();
    document.body.appendChild(el);

    // Should still dispatch native:press on click
    const handler = vi.fn();
    el.addEventListener('native:press', handler);
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('n-input survives remove + re-append', () => {
    const el = document.createElement('n-input');
    el.setAttribute('value', 'hello');
    document.body.appendChild(el);

    el.remove();
    document.body.appendChild(el);

    expect((el as any).value).toBe('hello');
  });

  it('n-checkbox survives remove + re-append', () => {
    const el = document.createElement('n-checkbox');
    document.body.appendChild(el);

    el.remove();
    document.body.appendChild(el);

    // Toggle via native:press
    const handler = vi.fn();
    el.addEventListener('native:change', handler);
    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect((el as any).checked).toBe(true);
  });

  it('n-switch survives remove + re-append', () => {
    const el = document.createElement('n-switch');
    document.body.appendChild(el);

    el.remove();
    document.body.appendChild(el);

    const handler = vi.fn();
    el.addEventListener('native:change', handler);
    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect((el as any).checked).toBe(true);
  });

  it('n-accordion-item survives remove + re-append', () => {
    const acc = document.createElement('n-accordion');
    const item = document.createElement('n-accordion-item');
    item.innerHTML = '<span slot="heading">Title</span><p>Body</p>';
    acc.appendChild(item);
    document.body.appendChild(acc);

    expect(item.querySelector('details')).not.toBeNull();

    acc.remove();
    document.body.appendChild(acc);

    // Details element should still be present after re-init
    expect(item.querySelector('details')).not.toBeNull();
  });

  it('n-tabs survives remove + re-append', async () => {
    const tabs = document.createElement('n-tabs');
    tabs.setAttribute('value', 'a');

    const tab = document.createElement('n-tab');
    tab.setAttribute('value', 'a');
    tab.textContent = 'A';
    tabs.appendChild(tab);

    const panels = document.createElement('n-tab-panels');
    const panel = document.createElement('n-tab-panel');
    panel.setAttribute('value', 'a');
    panel.textContent = 'Content A';
    panels.appendChild(panel);
    tabs.appendChild(panels);

    document.body.appendChild(tabs);
    await new Promise<void>(r => queueMicrotask(r));

    tabs.remove();
    document.body.appendChild(tabs);
    await new Promise<void>(r => queueMicrotask(r));

    expect((tabs as any).value).toBe('a');
  });

  it('n-radio-group survives remove + re-append', async () => {
    const group = document.createElement('n-radio-group');
    group.setAttribute('value', 'x');
    const radio = document.createElement('n-radio');
    radio.setAttribute('value', 'x');
    radio.textContent = 'X';
    group.appendChild(radio);
    document.body.appendChild(group);
    await new Promise<void>(r => queueMicrotask(r));

    group.remove();
    document.body.appendChild(group);
    await new Promise<void>(r => queueMicrotask(r));

    expect((group as any).value).toBe('x');
  });

  it('n-breadcrumb survives remove + re-append', () => {
    const bc = document.createElement('n-breadcrumb');
    const item = document.createElement('n-breadcrumb-item');
    item.textContent = 'Home';
    bc.appendChild(item);
    document.body.appendChild(bc);

    bc.remove();
    document.body.appendChild(bc);

    expect(item.getAttribute('tabindex')).toBe('0');
  });

  it('event listeners do not double-fire after re-init', () => {
    const el = document.createElement('n-switch');
    document.body.appendChild(el);

    el.remove();
    document.body.appendChild(el);

    const handler = vi.fn();
    el.addEventListener('native:change', handler);

    // One press should produce one change event, not two
    el.dispatchEvent(new Event('native:press', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
