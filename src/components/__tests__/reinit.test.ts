// @vitest-environment happy-dom
/**
 * Re-initialization tests: verify components survive the
 * connect → disconnect → reconnect lifecycle without leaking
 * listeners, breaking controllers, or corrupting state.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

// Import component registrations
import '../ui-button/ui-button.ts';
import '../ui-input/ui-input.ts';
import '../ui-checkbox/ui-checkbox.ts';
import '../ui-switch/ui-switch.ts';
import '../ui-accordion/ui-accordion.ts';
import '../ui-dialog/ui-dialog.ts';
import '../ui-tabs/ui-tabs.ts';
import '../ui-radio/ui-radio.ts';
import '../ui-breadcrumb/ui-breadcrumb.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('re-initialization', () => {
  it('ui-button survives remove + re-append', () => {
    const el = document.createElement('ui-button');
    el.textContent = 'Click';
    document.body.appendChild(el);

    el.remove();
    document.body.appendChild(el);

    // Should still dispatch ui-press on click
    const handler = vi.fn();
    el.addEventListener('ui-press', handler);
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ui-input survives remove + re-append', () => {
    const el = document.createElement('ui-input');
    el.setAttribute('value', 'hello');
    document.body.appendChild(el);

    el.remove();
    document.body.appendChild(el);

    expect((el as any).value).toBe('hello');
  });

  it('ui-checkbox survives remove + re-append', () => {
    const el = document.createElement('ui-checkbox');
    document.body.appendChild(el);

    el.remove();
    document.body.appendChild(el);

    // Toggle via ui-press
    const handler = vi.fn();
    el.addEventListener('ui-change', handler);
    el.dispatchEvent(new Event('ui-press', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect((el as any).checked).toBe(true);
  });

  it('ui-switch survives remove + re-append', () => {
    const el = document.createElement('ui-switch');
    document.body.appendChild(el);

    el.remove();
    document.body.appendChild(el);

    const handler = vi.fn();
    el.addEventListener('ui-change', handler);
    el.dispatchEvent(new Event('ui-press', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect((el as any).checked).toBe(true);
  });

  it('ui-accordion-item survives remove + re-append', () => {
    const acc = document.createElement('ui-accordion');
    const item = document.createElement('ui-accordion-item');
    item.innerHTML = '<span slot="heading">Title</span><p>Body</p>';
    acc.appendChild(item);
    document.body.appendChild(acc);

    expect(item.querySelector('details')).not.toBeNull();

    acc.remove();
    document.body.appendChild(acc);

    // Details element should still be present after re-init
    expect(item.querySelector('details')).not.toBeNull();
  });

  it('ui-tabs survives remove + re-append', async () => {
    const tabs = document.createElement('ui-tabs');
    tabs.setAttribute('value', 'a');

    const tab = document.createElement('ui-tab');
    tab.setAttribute('value', 'a');
    tab.textContent = 'A';
    tabs.appendChild(tab);

    const panels = document.createElement('ui-tab-panels');
    const panel = document.createElement('ui-tab-panel');
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

  it('ui-radio-group survives remove + re-append', async () => {
    const group = document.createElement('ui-radio-group');
    group.setAttribute('value', 'x');
    const radio = document.createElement('ui-radio');
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

  it('ui-breadcrumb survives remove + re-append', () => {
    const bc = document.createElement('ui-breadcrumb');
    const item = document.createElement('ui-breadcrumb-item');
    item.textContent = 'Home';
    bc.appendChild(item);
    document.body.appendChild(bc);

    bc.remove();
    document.body.appendChild(bc);

    expect(item.getAttribute('tabindex')).toBe('0');
  });

  it('event listeners do not double-fire after re-init', () => {
    const el = document.createElement('ui-switch');
    document.body.appendChild(el);

    el.remove();
    document.body.appendChild(el);

    const handler = vi.fn();
    el.addEventListener('ui-change', handler);

    // One press should produce one change event, not two
    el.dispatchEvent(new Event('ui-press', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
